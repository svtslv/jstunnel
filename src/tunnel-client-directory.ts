import * as net from 'net';
import * as http from 'http';
import * as serveHandler from 'serve-handler';
import { createLogger } from './tunnel-client-utils';

export class TunnelClientDirectory {
  logger: ReturnType<typeof createLogger>;
  server: http.Server;
  serverPort: number;
  sockets = new Set<net.Socket>();
  directory: string;

  constructor() {
    this.logger = createLogger(this.constructor.name);
  }

  createServer({ directory }) {
    const server = http.createServer((request, response) => {
      return serveHandler(request, response, { public: directory });
    });

    server.on('connection', (socket) => {
      this.sockets.add(socket);
      socket.once('close', () => this.sockets.delete(socket));
    });

    server.listen();

    this.server = server;
    this.directory = directory;
    this.serverPort = server.address()['port'];
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
