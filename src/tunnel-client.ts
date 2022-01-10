import * as net from 'net';
import * as tls from 'tls';
import { pipeline } from 'stream';
import axios from 'axios';
import { TunnelConfig, TunnelOptions, ClientOptions, Logger } from './tunnel-config';

export class TunnelClient {
  logger: Logger;

  constructor(options: { logger?: Logger } = null) {
    const tunnelConfig = new TunnelConfig();
    this.logger = options?.logger || tunnelConfig.logger(this.constructor.name);
  }

  async createCluster(clientOptions: ClientOptions) {
    this.logger.debug('createCluster options', clientOptions);
    const { data: tunnelOptions }: { data: TunnelOptions } = await axios.post(
      `${clientOptions.apiUrl}/tunnels/create`,
      clientOptions,
    );
    this.logger.debug('createCluster data', tunnelOptions);

    for (let i = 0; i < tunnelOptions.tunnelMaxSockets; i++) {
      this.createTunnel(clientOptions, tunnelOptions);
    }

    return tunnelOptions;
  }

  createTunnel(clientOptions: ClientOptions, tunnelOptions: TunnelOptions) {
    let localEconnrefused = false;
    let remoteEconnrefused = false;

    const tcp = (tunnelOptions.tunnelTls ? tls : net) as typeof net & typeof tls;
    const options = tunnelOptions.tunnelTls ? { rejectUnauthorized: clientOptions.rejectUnauthorized } : {};
    const remoteSocket = tcp.connect(
      { port: tunnelOptions.tunnelPort, host: tunnelOptions.tunnelHost, ...options },
      () => {
        remoteSocket.write(`TUNNEL_TOKEN: ${tunnelOptions.tunnelToken}`);
        this.logger.debug('remoteSocket connected', remoteSocket.address());

        const tcp = (clientOptions.localTls ? tls : net) as typeof net & typeof tls;
        const options = clientOptions.localTls ? { rejectUnauthorized: false } : {};
        const localSocket = tcp.connect({ port: clientOptions.localPort, host: clientOptions.localHost, ...options });

        localSocket.on('close', () => {
          remoteSocket.end();
          this.logger.debug('localSocket closed');
        });

        localSocket.on('error', (error: any) => {
          if (error?.code === 'ECONNREFUSED') {
            localEconnrefused = true;
          }
          this.logger.debug('localSocket error', error?.code);
        });

        pipeline(remoteSocket, localSocket, remoteSocket, () => null);
      },
    );

    remoteSocket.setKeepAlive(true);

    remoteSocket.on('data', (data) => {
      const match = data.toString().match(/^(\w+) (\S+)/);
      if (match) {
        this.logger.debug('remoteSocket data', { method: match[1], path: match[2] });
      }
    });

    remoteSocket.on('close', (hadError) => {
      if (remoteEconnrefused && !localEconnrefused) {
        return;
      } else if (hadError) {
        setTimeout(() => {
          this.createTunnel(clientOptions, tunnelOptions);
        }, 5000);
      } else {
        this.createTunnel(clientOptions, tunnelOptions);
      }
      this.logger.debug('remoteSocket closed');
    });

    remoteSocket.on('error', (error: any) => {
      if (error?.code === 'ECONNREFUSED') {
        remoteEconnrefused = true;
      }
      this.logger.debug('remoteSocket error', error?.code);
    });
  }
}
