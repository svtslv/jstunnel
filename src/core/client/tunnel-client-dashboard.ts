import * as net from 'net';
import * as http from 'http';
import * as path from 'path';
import express from 'express';
import { TunnelClientManager } from './tunnel-client-manager';
import { projectRoot } from '../utils/pkg-info';

export class TunnelClientDashboard {
  server: http.Server;
  serverPort: number;
  sockets = new Set<net.Socket>();
  sseClients: { id: number; emit: (json: Record<any, any>) => void }[] = [];
  tunnelClientManager: TunnelClientManager;

  constructor({ tunnelClientManager }) {
    this.tunnelClientManager = tunnelClientManager;
  }

  async createServer() {
    this.tunnelClientManager.on('httpLog', (httpLog) => {
      this.sseClients.forEach((sseClient) => sseClient.emit({ httpLogs: [httpLog] }));
    });

    const app = express();
    app.use(express.static(path.join(projectRoot, 'out')));
    app.get('/', (_req, res) => {
      res.sendFile(path.join(projectRoot, 'out', 'dashboard.html'));
    });
    app.use((_req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });
    app.use('/api/events', (req, res) => {
      res.writeHead(200, {
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      });

      const sseClient = {
        id: Date.now(),
        emit: (json: Record<any, any>) => res.write(`data: ${JSON.stringify(json)}\n\n`),
      };
      this.sseClients.push(sseClient);
      req.on('close', () => {
        this.sseClients = this.sseClients.filter((sseClient) => sseClient.id !== sseClient.id);
      });
      sseClient.emit({
        httpLogs: this.tunnelClientManager.httpLogs,
        tunnelClientOptions: {
          clientUrls: this.tunnelClientManager.tunnelClientOptions.clientUrls,
          ...this.tunnelClientManager.tunnelClientOptions,
        },
      });
    });

    this.server = app.listen(this.tunnelClientManager.tunnelClientOptions.dashboardPort);
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
      socket.once('close', () => this.sockets.delete(socket));
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
