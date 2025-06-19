import * as net from 'net';
import * as jwt from 'jsonwebtoken';
import { TunnelServerClient } from './tunnel-server-client';
import { TunnelServerOptions } from './tunnel-server-options';
import { Logger } from '../utils/logger';
import { HttpTunnelRequest, HttpTunnelResponse } from '../types/types';

export class TunnelServerClientManager {
  logger = new Logger(this.constructor.name);
  clients = new Map<string, TunnelServerClient>();
  tunnelServerOptions: TunnelServerOptions;
  server: net.Server;
  bytesSent = 0;
  bytesReceived = 0;
  bytesTotal = 0;

  constructor(tunnelServerOptions = new TunnelServerOptions()) {
    this.tunnelServerOptions = tunnelServerOptions;
  }

  getClient(args: { clientId: string }) {
    return this.clients.get(args.clientId);
  }

  createClientToken(clientId: string) {
    return jwt.sign({ clientId }, this.tunnelServerOptions.jwtSecret);
  }

  getClientByToken(token: string) {
    try {
      const data = jwt.verify(token, this.tunnelServerOptions.jwtSecret) as { clientId: string };
      return this.clients.get(data.clientId);
    } catch (error) {
      this.logger.debug('Invalid client token', error);
      return null;
    }
  }

  getStats() {
    return {
      maxGb: this.tunnelServerOptions.maxBytes / 1000 / 1000 / 1000,
      totalGb: this.bytesTotal / 1000 / 1000 / 1000,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
      clients: this.clients.size,
    };
  }

  addSocket(socket: net.Socket) {
    const checkLimit = () => {
      const { maxBytes } = this.tunnelServerOptions;
      this.bytesTotal = this.bytesReceived + this.bytesSent;
      if (this.bytesTotal > maxBytes) {
        socket.destroy();
      }
    };

    const socketWrite = socket.write;
    socket.write = (data: string) => {
      this.bytesSent += data.length;
      checkLimit();
      return socketWrite.call(socket, data);
    };
    socket.on('data', (data) => {
      this.bytesReceived += data.length;
      checkLimit();
    });
  }

  createClient(args: { clientId: string; httpTunnelRequest: HttpTunnelRequest }): HttpTunnelResponse {
    const { clientId, httpTunnelRequest } = args;
    this.deleteClient({ clientId });
    const clientToken = this.createClientToken(clientId);
    const tunnelServerClient = new TunnelServerClient({ clientId, clientToken, httpTunnelRequest });
    this.clients.set(clientId, tunnelServerClient);

    return {
      clientId: tunnelServerClient.clientId,
      clientToken: tunnelServerClient.clientToken,
      maxSockets: this.tunnelServerOptions.maxSockets,
    };
  }

  deleteClient(args: { clientId: string }) {
    const tunnel = this.clients.get(args.clientId);
    tunnel?.sockets?.forEach((socket) => socket.destroy());
    this.clients.delete(args.clientId);
  }
}
