#!/usr/bin/env node
// noinspection HttpUrlsUsage

import * as minimist from 'minimist';
import { TunnelClient } from './tunnel-client';
import { createLogger } from './tunnel-client-utils';
import { ClientOptions } from './tunnel-client-interfaces';
import { TunnelClientManager } from './tunnel-client-manager';
import { logTypes, packageJson, tunnelTypes } from './tunnel-client-constants';
import { TunnelClientDashboard } from './tunnel-client-dashboard';
import { TunnelClientDirectory } from './tunnel-client-directory';

export class TunnelClientCli {
  logger: ReturnType<typeof createLogger>;
  clientOptions: Partial<ClientOptions> = {};

  constructor() {
    this.logger = createLogger(this.constructor.name);
  }

  async run() {
    const args = minimist(process.argv.slice(2));
    args.port = args.p || args.port;
    args.type = args.t || args.type;
    args.subdomain = args.s || args.subdomain;
    args.help = args.h || args.help;
    args.version = args.v || args.version;

    this.clientOptions.localPort = args.port;
    this.clientOptions.localHost = args.host;
    this.clientOptions.tunnelType = args.type;
    this.clientOptions.requestedId = args.subdomain || args.tcpPort;
    this.clientOptions.localTls = Boolean(args.tls === 'true');
    this.clientOptions.rejectUnauthorized = !Boolean(args.rejectUnauthorized === 'false');
    this.clientOptions.version = args.version;
    this.clientOptions.apiUrl = args.api;
    this.clientOptions.authToken = args.token || process.env.JSTUNNEL_TOKEN;
    this.clientOptions.web = !Boolean(args.web === 'false');
    this.clientOptions.log = args.log;
    this.clientOptions.auth = args.auth;
    const directory = args.directory || args.dir;
    this.clientOptions.directory = directory && typeof directory !== 'string' ? process.cwd() : directory;

    this.logger.debug('args', args);

    this.logger.log(
      [
        '',
        `Homepage:         ${packageJson.homepage}`,
        `Repository:       ${packageJson.repositoryUrl || packageJson.repository.url}`,
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
        '  -t  --type         Tunnel type: http, tcp              ',
        '  -s, --subdomain    Request this subdomain              ',
        '      --web          Enable Web interface       [boolean]',
        '      --log          Print logs: raw, compact, combined  ',
        '      --auth         Enforce auth on tunnel endpoint,    ',
        '                     username:password(:[+-]/path)       ',
        '      --directory    Serving local directory             ',
        '      --api          Server api url                      ',
        '      --token        Server auth token                   ',
        '  -h, --help         Print this list and exit            ',
        '  -v, --version      Print the version and exit          ',
        '',
        'env:',
        '  JSTUNNEL_TOKEN',
        '',
      ].join('\n'),
    );
  }

  version() {
    this.logger.log(`Version: ${packageJson.version}\n`);
  }

  async createCluster() {
    const tunnelClientManager = new TunnelClientManager();

    if (this.clientOptions.directory) {
      const tunnelClientDirectory = new TunnelClientDirectory();
      tunnelClientDirectory.createServer({ directory: this.clientOptions.directory });
      this.clientOptions.localPort = tunnelClientDirectory.serverPort;
    }

    if (!this.clientOptions.localPort) {
      return;
    }

    const tunnelClient = new TunnelClient({ tunnelClientManager });
    this.clientOptions = tunnelClient.getClientOptions(this.clientOptions);
    if (this.clientOptions.web && this.clientOptions.tunnelType === tunnelTypes.http) {
      const tunnelClientDashboard = new TunnelClientDashboard({ tunnelClientManager });
      const { serverPort } = await tunnelClientDashboard.createServer();
      const webInterface = `http://localhost:${serverPort}`;
      this.logger.log(`Web Interface:    ${webInterface}`);
    }

    const createTunnel = async () => {
      try {
        const { tunnelClientManager } = await tunnelClient.createCluster(this.clientOptions);
        const { tunnelOptions, clientOptions } = tunnelClientManager;
        this.clientOptions = clientOptions;
        const local = `${this.clientOptions.localHost}:${this.clientOptions.localPort}`;

        const links = [];
        for (const url of tunnelOptions.urls) {
          links.push(`Forwarding:       ${url} -> ${local}`);
        }

        this.logger.log(links.join('\n'));
        this.logger.log();

        const info = ['Hit CTRL-C to stop the tunnel', 'Run with --help to print help', ''].join('\n');
        this.logger.log(info);

        this.printLogs({ tunnelClientManager });
      } catch (error) {
        this.logger.debug('createCluster error', error.message);
        this.logger.error('Connection failed');
        setTimeout(createTunnel, 5000);
      }
    };

    tunnelClientManager.once('destroy', () => setTimeout(createTunnel, 5000));
    await createTunnel();
  }

  printLogs({ tunnelClientManager }: { tunnelClientManager: TunnelClientManager }) {
    const bodyLimiter = (body: string, limit: number) => {
      let result;
      if (typeof body === 'string' && limit > 0) {
        result = body.length > bodyLimit ? `${body.slice(0, limit)} ...` : body;
      }
      return result;
    };

    const [logType, bodyLimitString] = this.clientOptions.log.split(':');
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
