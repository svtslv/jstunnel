import * as path from 'path';
import { ClientOptions } from './tunnel-client-interfaces';

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const packageJson = require(path.join(__dirname, '..', 'package.json'));

export const logTypes = {
  raw: 'raw',
  compact: 'compact',
  combined: 'combined',
};

export const tunnelTypes = {
  http: 'http',
  tcp: 'tcp',
};

export const defaultClientOptions: ClientOptions = {
  localPort: null,
  localHost: 'localhost',
  tunnelType: tunnelTypes.http,
  requestedId: null,
  localTls: false,
  rejectUnauthorized: true,
  web: true,
  log: logTypes.compact,
  auth: null,
  version: packageJson.version,
  apiUrl: 'https://api.jstunnel.com',
  authToken: null,
  directory: null,
};
