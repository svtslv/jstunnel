import * as net from 'net';
import * as http from 'http';
import serveHandler from 'serve-handler';

export class TunnelClientDirectory {
  server: http.Server;
  serverPort: number;
  sockets = new Set<net.Socket>();
  directory: string;

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
