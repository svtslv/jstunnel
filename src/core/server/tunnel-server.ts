import net from 'net';
import http from 'http';
import express, { Request } from 'express';
import useragent from 'express-useragent';
import cookieParser from 'cookie-parser';
import { TunnelServerClientManager } from './tunnel-server-client-manager';
import { TunnelServerOptions } from './tunnel-server-options';
import { Logger } from '../utils/logger';
import { HttpTunnelRequest } from '../types/types';
import path from 'path';
import { projectRoot } from '../utils/pkg-info';
import { TunnelServerAuthorizer } from './tunnel-server-authorizer';

export class TunnelServer {
  private logger = new Logger(this.constructor.name);
  private tunnelServerOptions: TunnelServerOptions;
  private tunnelServerAuthorizer: TunnelServerAuthorizer;
  public tunnelServerClientManager: TunnelServerClientManager;

  constructor(tunnelServerOptions = new TunnelServerOptions()) {
    this.tunnelServerOptions = tunnelServerOptions;
    this.tunnelServerClientManager = new TunnelServerClientManager(tunnelServerOptions);
    this.tunnelServerAuthorizer = new TunnelServerAuthorizer();
  }

  getClientByRequest(req: Request) {
    const clientId = req.headers['host'] || '';
    return this.tunnelServerClientManager.getClient({ clientId });
  }

  handleUpgrade(req: Request, socket: net.Socket, _head: Buffer) {
    this.logger.debug('Handling upgrade request');

    socket.on('error', (err) => {
      this.logger.error(`Socket error: ${err.message}`);
    });
    socket.on('close', (hadError) => {
      this.logger.debug(`Socket closed. Had error: ${hadError}`);
    });
    socket.on('end', () => {
      this.logger.debug('Socket ended');
    });

    if (req.headers['upgrade'] === 'x-tunnel-protocol') {
      this.logger.debug('Handling custom tunnel protocol upgrade...');
      const clientToken = req.headers['x-tunnel-client-token'] as string;
      const client = this.tunnelServerClientManager.getClientByToken(clientToken);

      if (!client) {
        socket.end('HTTP/1.1 401 Unauthorized\r\n\r\nInvalid client token');
        socket.destroy();
        this.logger.debug('Client not found for token', clientToken);
        return;
      }

      if (client.sockets.length >= this.tunnelServerOptions.maxSockets) {
        socket.end('HTTP/1.1 429 Too Many Requests\r\n\r\nSocket limit reached');
        socket.destroy();
        this.logger.debug('Socket limit reached', client.clientId);
        return;
      }

      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' + 'Connection: Upgrade\r\n' + 'Upgrade: tunnel-protocol\r\n' + '\r\n',
      );

      socket.setTimeout(0);
      socket.setKeepAlive(true);
      client.addSocket(socket);
      this.tunnelServerClientManager.addSocket(socket);
      this.logger.debug('socket added via HTTP Upgrade', {
        clientId: client.clientId,
        sockets: client.sockets.length,
      });
    } else {
      const client = this.getClientByRequest(req);
      if (client) client.handleUpgrade(req, socket);
    }
  }

  async createServer() {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(useragent.express());
    app.use(express.static(path.join(projectRoot, 'out')));

    app.use((req, res, next) => {
      if (req.headers['x-tunnel-client-request']) return next();
      const client = this.getClientByRequest(req);
      if (!client || client.sockets.length === 0) return next();
      if ((req.useragent.isMobile || req.useragent.isDesktop) && !req.cookies['x-tunnel-warning-accepted']) {
        return res.sendFile(path.join(projectRoot, 'out', 'warning.html'));
      }
      if (!this.tunnelServerAuthorizer.handleAuth(req, res, client.httpTunnelRequest.authString)) {
        return;
      }
      client.handleRequest(req, res);
    });

    app.post('/.tunnels/create', async (req, res) => {
      this.logger.debug('post /.tunnels/create', req.body);
      const httpTunnelRequest = req.body as HttpTunnelRequest;

      if (
        this.tunnelServerOptions.serverToken &&
        this.tunnelServerOptions.serverToken !== httpTunnelRequest.serverToken
      ) {
        res.status(401).json({ massage: 'Unauthorized' });
        return;
      }

      if (
        !httpTunnelRequest.domain ||
        httpTunnelRequest.subdomain?.length < this.tunnelServerOptions.mixSubdomainLength
      ) {
        res.status(400).json({ message: 'Invalid request: domain or subdomain is missing or too short.' });
        return;
      }

      const data = this.tunnelServerClientManager.createClient({
        clientId: [httpTunnelRequest.subdomain, httpTunnelRequest.domain].join('.'),
        httpTunnelRequest: httpTunnelRequest,
      });

      this.logger.debug('Client created', data);
      res.json(data);
    });

    app.get('/.tunnels/stats', (_req, res) => {
      this.logger.debug('get /.tunnels/stats');
      res.json(this.tunnelServerClientManager.getStats());
    });

    app.all('*all', (_req, res) => {
      return res.sendFile(path.join(projectRoot, 'out', 'website.html'));
    });

    const server = http.createServer(app);
    server.on('upgrade', this.handleUpgrade.bind(this));
    return server;
  }
}
