#!/usr/bin/env node

import minimist from 'minimist';
import { TunnelClient } from './tunnel-client';
import { TunnelClientManager } from './tunnel-client-manager';
import { TunnelClientDashboard } from './tunnel-client-dashboard';
import { TunnelClientDirectory } from './tunnel-client-directory';
import { Logger } from '../utils/logger';
import { logTypes, TunnelClientOptions } from './tunnel-client-options';
import { packageJson } from '../utils/pkg-info';

const isTrue = (value: string) => {
  return Boolean(value === 'true');
};

export class TunnelClientCli {
  logger = new Logger(this.constructor.name);
  tunnelClientOptions: TunnelClientOptions;

  constructor(tunnelClientOptions = new TunnelClientOptions()) {
    this.tunnelClientOptions = tunnelClientOptions;
  }

  async run() {
    const args = minimist(process.argv.slice(2));
    args.port = args.p || args.port;
    args.subdomain = args.s || args.subdomain;
    args.help = args.h || args.help;
    args.version = args.v || args.version;
    args.directory = args.directory || args.dir;
    args.dashboard = args.dashboard || args.web;

    this.tunnelClientOptions.serverToken = args.token || process.env.TUNNEL_SERVER_TOKEN;
    this.tunnelClientOptions.apiUrl = args.api || this.tunnelClientOptions.apiUrl;
    this.tunnelClientOptions.domain = args.domain || this.tunnelClientOptions.domain;
    this.tunnelClientOptions.subdomain = args.subdomain || this.tunnelClientOptions.subdomain;
    this.tunnelClientOptions.localPort = args.port || this.tunnelClientOptions.localPort;
    this.tunnelClientOptions.localHost = args.host || this.tunnelClientOptions.localHost;
    this.tunnelClientOptions.localTls = args.localTls ? isTrue(args.localTls) : this.tunnelClientOptions.localTls;
    this.tunnelClientOptions.remoteTls = args.remoteTls ? isTrue(args.remoteTls) : this.tunnelClientOptions.remoteTls;
    this.tunnelClientOptions.version = args.version || this.tunnelClientOptions.version;
    this.tunnelClientOptions.dashboard = args.dashboard ? isTrue(args.dashboard) : this.tunnelClientOptions.dashboard;
    this.tunnelClientOptions.log = args.log || this.tunnelClientOptions.log;
    this.tunnelClientOptions.authString = args.auth || this.tunnelClientOptions.authString;
    this.tunnelClientOptions.directory = args.directory || this.tunnelClientOptions.directory;

    this.logger.debug('args', args);

    this.logger.log(
      [
        '',
        `Homepage:         ${packageJson.homepage}`,
        `Repository:       ${packageJson.repositoryUrl}`,
        `Version:          ${packageJson.version}`,
        '',
      ].join('\n'),
    );

    if (args.help || args.h) {
      return this.help();
    } else if (args.version || args.v) {
      return this.version();
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
        '  -p, --port         Internal server port      [required]',
        '      --host         Internal server host                ',
        '  -s, --subdomain    Request this subdomain              ',
        '      --web          Enable Web interface       [boolean]',
        '      --log          Print logs: raw, compact, combined  ',
        '      --auth         Enforce auth on tunnel endpoint,    ',
        '                     username:password(:[+-]/path)       ',
        '      --directory    Serving local directory             ',
        '      --api          Server api url                      ',
        '      --domain       Server domain                       ',
        '      --token        Server token                        ',
        '  -h, --help         Print this list and exit            ',
        '  -v, --version      Print the version and exit          ',
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
    if (this.tunnelClientOptions.directory) {
      const tunnelClientDirectory = new TunnelClientDirectory();
      tunnelClientDirectory.createServer({ directory: this.tunnelClientOptions.directory });
      this.tunnelClientOptions.localPort = tunnelClientDirectory.serverPort;
    }

    if (!this.tunnelClientOptions.localPort) {
      return;
    }

    const tunnelClient = new TunnelClient(this.tunnelClientOptions);
    if (this.tunnelClientOptions.dashboard) {
      const tunnelClientDashboard = new TunnelClientDashboard({
        tunnelClientManager: tunnelClient.tunnelClientManager,
      });
      const { serverPort } = await tunnelClientDashboard.createServer();
      const webInterface = `http://localhost:${serverPort}`;
      this.logger.log(`Web Interface:    ${webInterface}`);
    }

    const createTunnel = async () => {
      try {
        await tunnelClient.start();
        const local = `${this.tunnelClientOptions.localHost}:${this.tunnelClientOptions.localPort}`;
        const links = [];
        for (const clientUrl of this.tunnelClientOptions.clientUrls) {
          links.push(`Forwarding:       ${clientUrl} -> ${local}`);
        }

        this.logger.log(links.join('\n'));
        this.logger.log();

        const info = ['Hit CTRL-C to stop the tunnel', 'Run with --help to print help', ''].join('\n');
        this.logger.log(info);

        this.printLogs({ tunnelClientManager: tunnelClient.tunnelClientManager });
      } catch (error) {
        const message = error.response?.data?.message || error.message;
        this.logger.error('Connection failed:', message);
      }
    };

    tunnelClient.tunnelClientManager.once('destroy', () => setTimeout(createTunnel, 5000));
    await createTunnel();
  }

  printLogs({ tunnelClientManager }: { tunnelClientManager: TunnelClientManager }) {
    const bodyLimiter = (body: string, limit: number) => {
      let result: string;
      if (typeof body === 'string' && limit > 0) {
        result = body.length > bodyLimit ? `${body.slice(0, limit)} ...` : body;
      }
      return result;
    };

    const [logType, bodyLimitString] = this.tunnelClientOptions.log.split(':');
    const bodyLimit = parseInt(bodyLimitString);

    tunnelClientManager.on('httpLog', (httpLog) => {
      if (logTypes.raw === logType) {
        this.logger.log(httpLog.raw);
        this.logger.log();
        const body = bodyLimit ? httpLog.json || bodyLimiter(httpLog.body, bodyLimit) : undefined;
        if (body) {
          this.logger.inspect(body);
          this.logger.log();
        }
      }

      if ([logTypes.compact, logTypes.combined].includes(logType)) {
        const requestLog = tunnelClientManager.httpLogs.find((requestLog) => {
          return requestLog.method && requestLog.requestId === httpLog.requestId;
        });

        if (httpLog.method) {
          const time = `(${httpLog.createdAt.toLocaleTimeString()})`;
          this.logger.log('>', httpLog.method, httpLog.url, time);
        } else {
          const time = `(${httpLog.createdAt.toLocaleTimeString()})`;
          const duration = +httpLog.createdAt - +requestLog.createdAt + 'ms';
          this.logger.log(
            '<',
            requestLog.method,
            requestLog.url,
            httpLog.statusCode,
            httpLog.statusMessage,
            duration,
            time,
          );
        }

        if (logTypes.compact === logType && bodyLimit) {
          const body = httpLog.json || bodyLimiter(httpLog.body, bodyLimit);
          if (body) {
            this.logger.inspect(body);
          }
        }

        if (logTypes.combined === logType) {
          if (!httpLog.method) {
            const { raw: _requestRaw, ...response } = httpLog;
            const { raw: _responseRaw, ...request } = requestLog;
            this.logger.inspect({
              request: {
                date: request.createdAt,
                method: request.method,
                url: request.url,
                headers: request.headers,
                body: request.json || bodyLimiter(request.body, bodyLimit || 200),
              },
              response: {
                date: response.createdAt,
                method: response.statusCode,
                url: response.statusMessage,
                headers: response.headers,
                body: response.json || bodyLimiter(response.body, bodyLimit || 200),
              },
            });
          }
        }
      }
    });
  }
}

new TunnelClientCli().run().catch((error) => {
  console.error(error.message);
});
