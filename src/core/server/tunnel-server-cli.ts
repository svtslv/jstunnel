#!/usr/bin/env node

import minimist from 'minimist';
import { TunnelServer } from './tunnel-server';
import { TunnelServerOptions } from './tunnel-server-options';
import { Logger } from '../utils/logger';
import { packageJson } from '../utils/pkg-info';

export class TunnelServerCli {
  logger = new Logger(this.constructor.name);
  tunnelServerOptions: TunnelServerOptions;

  constructor(tunnelServerOptions = new TunnelServerOptions()) {
    this.tunnelServerOptions = tunnelServerOptions;
  }

  async run() {
    const args = minimist(process.argv.slice(2));
    this.tunnelServerOptions.serverToken = args.token || process.env.TUNNEL_SERVER_TOKEN;
    this.tunnelServerOptions.serverPort = args.port || this.tunnelServerOptions.serverPort;
    this.tunnelServerOptions.maxBytes = args.maxBytes || this.tunnelServerOptions.maxBytes;
    this.tunnelServerOptions.maxSockets = args.maxSockets || this.tunnelServerOptions.maxSockets;
    this.tunnelServerOptions.jwtSecret = args.jwtSecret || this.tunnelServerOptions.jwtSecret;

    this.logger.debug('args', args);
    this.logger.debug('tunnelServerOptions', this.tunnelServerOptions);

    this.logger.log(
      [
        '',
        `Homepage:      ${packageJson.homepage}`,
        `Repository:    ${packageJson.repositoryUrl}`,
        `Version:       ${packageJson.version}`,
        '',
      ].join('\n'),
    );

    if (args.help || args.h) {
      this.help();
    } else if (args.version || args.v) {
      this.version();
    } else {
      await this.createCluster();
    }
  }

  help() {
    this.logger.log(
      [
        `usage: ${packageJson.name} [options]`,
        '',
        'options:',
        '  --port               Server Port           [optional]',
        '  --token              Server Token          [optional]',
        '  --maxSockets         Max Sockets           [optional]',
        '  --maxBytes           Max Bytes             [optional]',
        '',
        '  -h, --help           Print this list and exit',
        '  -v, --version        Print the version and exit.',
        '',
        'env:',
        '  TUNNEL_SERVER_TOKEN',
        '',
      ].join('\n'),
    );
  }

  version() {
    this.logger.log(`Version: ${packageJson.version}\n`);
  }

  async createCluster() {
    try {
      const tunnelServer = new TunnelServer(this.tunnelServerOptions);
      this.handleStdin(tunnelServer);
      const server = await tunnelServer.createServer();
      server.listen(this.tunnelServerOptions.serverPort, () => {
        this.logger.log(`Tunnel server is listening on port ${this.tunnelServerOptions.serverPort}`);
      });
    } catch (error) {
      this.logger.debug('createCluster error', error);
      this.logger.error('Failed');
    }
  }

  handleStdin(tunnelServer: TunnelServer) {
    process.stdin.on('data', (line: string) => {
      line = line.toString().trim();
      if (line === 'd') {
        process.env.DEBUG = process.env.DEBUG ? '' : 'jstunnel';
        this.logger.debug({
          stats: tunnelServer.tunnelServerClientManager.getStats(),
          clients: [...tunnelServer.tunnelServerClientManager.clients.entries()].map(([key, client]) => ({
            clientId: key,
            sockets: client.sockets.length,
          })),
        });
      }
    });
  }
}

new TunnelServerCli().run().catch((error) => {
  console.log(error.message);
});

process.on('SIGINT', () => {
  process.exit();
});

process.on('SIGTERM', () => {
  process.exit();
});

process.on('uncaughtException', (err) => {
  console.error(err);
});

process.on('unhandledRejection', (reason) => {
  console.error(reason);
});
