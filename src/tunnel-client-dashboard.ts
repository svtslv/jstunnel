import * as net from 'net';
import * as http from 'http';
import * as path from 'path';
import * as express from 'express';
import { TunnelClientManager } from './tunnel-client-manager';
import { createLogger } from './tunnel-client-utils';

export class TunnelClientDashboard {
  logger: ReturnType<typeof createLogger>;
  server: http.Server;
  serverPort: number;
  sockets = new Set<net.Socket>();
  sseClients: { id: number; emit: (json) => void }[] = [];
  tunnelClientManager: TunnelClientManager;

  constructor({ tunnelClientManager }) {
    this.tunnelClientManager = tunnelClientManager;
    this.logger = createLogger(this.constructor.name);
  }

  async createServer() {
    this.tunnelClientManager.on('httpLog', (httpLog) => {
      this.sseClients.forEach((sseClient) => sseClient.emit({ httpLogs: [httpLog] }));
    });

    const app = express();
    app.use('/', express.static(path.join(__dirname, '..', 'public', 'dashboard')));
    app.use('/api/events', (req, res) => {
      res.writeHead(200, {
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      });

      const sseClient = { id: Date.now(), emit: (json) => res.write(`data: ${JSON.stringify(json)}\n\n`) };
      this.sseClients.push(sseClient);
      req.on('close', () => {
        this.sseClients = this.sseClients.filter((sseClient) => sseClient.id !== sseClient.id);
      });
      sseClient.emit({ httpLogs: this.tunnelClientManager.httpLogs, info: this.tunnelClientManager.tunnelOptions });
    });

    this.server = app.listen(7070);
    await new Promise((resolve) => {
      this.server.on('listening', () => {
        this.serverPort = this.server.address()['port'];
        resolve(null);
      });
      this.server.on('error', () => {
        this.server = app.listen();
        resolve(null);
      });
    });

    this.server.on('connection', (socket) => {
      this.sockets.add(socket);

      this.server.once('close', () => {
        this.sockets.delete(socket);
      });
    });

    this.serverPort = this.server.address()['port'];
    return this;
  }

  close() {
    for (const socket of this.sockets) {
      socket.destroy();
      this.sockets.delete(socket);
    }

    this.server.close();
  }
}
