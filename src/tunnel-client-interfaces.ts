export interface ClientOptions {
  localPort: number;
  localHost: string;
  tunnelType: string;
  requestedId: string;
  localTls: boolean;
  rejectUnauthorized: boolean;
  web: boolean;
  log: string;
  auth: string;
  version: string;
  apiUrl: string;
  authToken: string;
  directory: string;
}

export interface TunnelOptions {
  tunnelType: string;
  tunnelHost: string;
  tunnelPort: number;
  tunnelTls: boolean;
  tunnelMaxSockets: number;
  tunnelToken: string;
  urls: string[];
}
