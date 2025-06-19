import * as uuid from 'uuid';

export class TunnelServerOptions {
  serverPort: number = 9000;
  serverToken: string = undefined;
  maxSockets: number = 10;
  maxBytes: number = undefined;
  mixSubdomainLength: number = 4;
  jwtSecret = uuid.v4();
}
