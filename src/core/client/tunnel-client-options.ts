import * as uuid from 'uuid';
import { packageJson } from '../utils/pkg-info';

export const logTypes = {
  raw: 'raw',
  compact: 'compact',
  combined: 'combined',
};

export class TunnelClientOptions {
  serverToken: string = undefined;
  apiUrl = 'https://api.jstunnel.com';
  domain: string = 'jstunnel.com';
  subdomain: string = uuid.v4();
  localPort: number = undefined;
  localHost: string = 'localhost';
  localTls = false;
  remoteTls = true;
  version = packageJson.version;
  log = logTypes.compact;
  dashboard = true;
  dashboardPort = 9002;
  directory: string = undefined;
  authString: string = undefined;

  get clientId(): string {
    return [this.subdomain, this.domain].join('.');
  }

  get clientUrls(): string[] {
    return ['http', 'https'].map((i) => `${i}://${this.clientId}`);
  }
}
