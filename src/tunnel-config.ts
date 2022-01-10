import * as path from 'path';

export type Logger = ReturnType<TunnelConfig['logger']>;
export type PackageJson = TunnelConfig['packageJson'];
export type ClientOptions = TunnelConfig['clientOptions'];
export type TunnelOptions = {
  tunnelType: string;
  tunnelHost: string;
  tunnelPort: number;
  tunnelTls?: { [key: string]: any };
  tunnelMaxSockets: number;
  tunnelToken: string;
  serverHost: string;
  serverPort: number;
  serverSslPort: number;
};

export class TunnelConfig {
  packageJson = require(path.join('..', 'package.json'));

  clientOptions = {
    apiUrl: process.env.TUNNEL_CLIENT_API_URL || 'https://api.jstunnel.com',
    requestedId: process.env.TUNNEL_CLIENT_REQUESTED_ID || null,
    tunnelType: process.env.TUNNEL_CLIENT_TUNNEL_TYPE || 'http',
    encryption: process.env.TUNNEL_CLIENT_ENCRYPTION || null,
    localPort: +process.env.TUNNEL_CLIENT_LOCAL_PORT || null,
    localHost: process.env.TUNNEL_CLIENT_LOCAL_HOST || 'localhost',
    localTls: Boolean(process.env.TUNNEL_CLIENT_LOCAL_TLS === 'true'),
    rejectUnauthorized: !Boolean(process.env.TUNNEL_CLIENT_REJECT_UNAUTHORIZED === 'false'),
    version: process.env.TUNNEL_CLIENT_VERSION || this.packageJson.version,
    authToken: process.env.TUNNEL_CLIENT_AUTH_TOKEN || null,
  };

  logger = (section) => {
    const logger = { ...console };
    const colors = {
      red: (text) => ['\x1b[31m', text, '\x1b[0m'],
      green: (text) => ['\x1b[32m', text, '\x1b[0m'],
      blue: (text) => ['\x1b[34m', text, '\x1b[0m'],
    };
    logger.info = (...args) => console.info(...colors.green('INFO:'), ...args);
    logger.error = (...args) => console.error(...colors.red('ERROR:'), ...args);
    logger.debug = (...args) => {
      ['*', this.packageJson.name, section].includes(process.env.DEBUG)
        ? console.debug(new Date(), ...colors.blue(section), ...args)
        : null;
    };
    return logger;
  };
}
