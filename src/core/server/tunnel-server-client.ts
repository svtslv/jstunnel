import net from 'net';
import http, { Agent, AgentOptions } from 'http';
import { Request, Response } from 'express';
import { pipeline } from 'stream';
import { Logger } from '../utils/logger';
import { HttpTunnelRequest } from '../types/types';

export class TunnelServerClient {
  logger = new Logger(this.constructor.name);
  agent: Agent;
  sockets: net.Socket[] = [];
  clientId: string;
  clientToken: string;
  httpTunnelRequest: HttpTunnelRequest;

  constructor(
    options: { clientId: string; clientToken: string; httpTunnelRequest: HttpTunnelRequest },
    agentOptions: AgentOptions = { keepAlive: true, maxFreeSockets: 1 },
  ) {
    this.clientId = options.clientId;
    this.clientToken = options.clientToken;
    this.httpTunnelRequest = options.httpTunnelRequest;
    this.agent = new Agent(agentOptions);
    this.agent['createConnection'] = this.createConnection.bind(this);
  }

  addSocket(socket: net.Socket) {
    const cleanup = () => {
      socket.destroy();
      this.sockets = this.sockets.filter((s) => s !== socket);
      this.logger.debug(`Pool size for [${this.clientId}] is now ${this.sockets.length}`);
    };

    socket.on('end', () => {
      this.logger.debug(`Socket for client [${this.clientId}] ended.`);
      cleanup();
    });
    socket.on('close', () => {
      this.logger.debug(`Socket for client [${this.clientId}] closed.`);
      cleanup();
    });
    socket.on('error', (err) => {
      this.logger.debug(`Socket for client [${this.clientId}] closed with error: ${err.message}`);
      cleanup();
    });

    return this.sockets.push(socket);
  }

  getSocket() {
    return this.sockets.length ? this.sockets.shift() : null;
  }

  createConnection(_options: net.NetConnectOpts, cb: (err: Error, socket?: net.Socket) => void) {
    this.logger.debug('Creating new connection');
    const socket = this.getSocket();
    if (socket) {
      cb(null, socket);
    } else {
      cb(new Error('No available socket'));
    }
  }

  handleRequest(req: Request, res: Response) {
    const clientReq = http.request(
      { path: req.url, method: req.method, headers: req.headers, agent: this.agent },
      (clientRes) => {
        res.writeHead(clientRes.statusCode || 500, clientRes.headers);
        pipeline(clientRes, res, () => null);
      },
    );

    pipeline(req, clientReq, () => null);
  }

  handleUpgrade(req: Request, reqSocket: net.Socket) {
    reqSocket.once('error', (err: any) => {
      if (err.code == 'ECONNRESET' || err.code == 'ETIMEDOUT') {
        return;
      }
      this.logger.error(err);
    });

    const socket = this.getSocket();
    if (!socket) {
      reqSocket.end();
      this.logger.error('No available socket for upgrade');
      return;
    }

    if (!reqSocket.readable || !reqSocket.writable) {
      socket.destroy();
      reqSocket.end();
      this.logger.error('Request socket is not readable or writable');
      return;
    }

    const data = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
    for (let i = 0; i < req.rawHeaders.length - 1; i += 2) {
      data.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    }

    data.push('');
    data.push('');

    pipeline(socket, reqSocket, socket, () => null);
    socket.write(data.join('\r\n'));
  }
}
