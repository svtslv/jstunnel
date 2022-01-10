#!/usr/bin/env node
// noinspection HttpUrlsUsage

import * as minimist from 'minimist';
import { TunnelClient } from './tunnel-client';
import { Logger, TunnelConfig, ClientOptions, PackageJson } from './tunnel-config';

export class TunnelCli {
  logger: Logger;
  clientOptions: ClientOptions;
  packageJson: PackageJson;

  constructor(options: { logger: Logger; clientOptions: ClientOptions; packageJson: PackageJson } = null) {
    const tunnelConfig = new TunnelConfig();
    this.logger = options?.logger || tunnelConfig.logger(this.constructor.name);
    this.clientOptions = options?.clientOptions || tunnelConfig.clientOptions;
    this.packageJson = options?.packageJson || tunnelConfig.packageJson;
  }

  async run() {
    const args = minimist(process.argv.slice(2));
    args.port = args.p || args.port;
    args.subdomain = args.s || args.subdomain;
    args.help = args.h || args.help;
    args.version = args.v || args.version;

    this.clientOptions.localPort = args.port || this.clientOptions.localPort;
    this.clientOptions.localHost = args.host || this.clientOptions.localHost;
    this.clientOptions.localTls = Boolean(args.localTls === 'true');
    this.clientOptions.requestedId = args.subdomain || args.tcpPort || this.clientOptions.requestedId;
    this.clientOptions.tunnelType = args.type || this.clientOptions.tunnelType;
    this.clientOptions.rejectUnauthorized = !Boolean(args.rejectUnauthorized === 'false');
    this.clientOptions.version = args.version || this.clientOptions.version;
    this.clientOptions.apiUrl = args.apiUrl || this.clientOptions.apiUrl;
    this.clientOptions.authToken = args.authToken || this.clientOptions.authToken;

    this.logger.debug('args', args);

    this.logger.log(
      [
        '',
        `Homepage:      ${this.packageJson.homepage}`,
        `Repository:    ${this.packageJson.repositoryUrl || this.packageJson.repository.url}`,
        `Version:       ${this.packageJson.version}`,
        '',
      ].join('\n'),
    );

    if (args.help || args.h) {
      this.help();
    } else if (args.version || args.v) {
      this.version();
    } else if (this.clientOptions.localPort) {
      await this.createCluster();
    }
  }

  help() {
    this.logger.log(
      [
        `usage: ${this.packageJson.name} [options]`,
        '',
        'options:',
        '  -p, --port           Your port           [required]',
        '      --host           Your host           [localhost]',
        '      --type           Http or tcp         [http]',
        '  -s, --subdomain      Subdomain           [random]',
        '      --apiUrl         Api url             [default]',
        '      --authToken      Auth token          [null]',
        '',
        '  -h, --help           Print this list and exit',
        '  -v, --version        Print the version and exit.',
        '',
        'env:',
        '  TUNNEL_CLIENT_AUTH_TOKEN',
        '',
      ].join('\n'),
    );
  }

  version() {
    this.logger.log(`Version: ${this.packageJson.version}\n`);
  }

  async createCluster() {
    const tunnelClient = new TunnelClient();

    try {
      const data = await tunnelClient.createCluster(this.clientOptions);
      const local = `${this.clientOptions.localHost}:${this.clientOptions.localPort}`;

      const tcpInfo = [
        `Status:        Connected`,
        `TCP:           ${data.serverHost}:${data.serverPort} -> ${local}`,
        ``,
      ].join('\n');

      const httpInfo = [
        `Status:        Connected`,
        `HTTP:          http://${data.serverHost}:${data.serverPort} -> ${local}`,
        `HTTPS:         https://${data.serverHost}:${data.serverSslPort} -> ${local}`,
        ``,
      ].join('\n');

      this.logger.log(data.tunnelType === 'tcp' ? tcpInfo : httpInfo);

      const info = ['Hit CTRL-C to stop the tunnel', 'Run with --help to print help', ''].join('\n');
      this.logger.log(info);
    } catch (error) {
      this.logger.debug('createCluster error', error);
      this.logger.error('Connection failed');
    }
  }
}

new TunnelCli().run().catch((error) => {
  console.log(error.message);
});
