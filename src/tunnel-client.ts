import * as net from 'net';
import * as tls from 'tls';
import { pipeline } from 'stream';
import axios from 'axios';
import { TunnelOptions, ClientOptions } from './tunnel-client-interfaces';
import { createLogger, deleteUndefined } from './tunnel-client-utils';
import { TunnelClientManager } from './tunnel-client-manager';
import { defaultClientOptions } from './tunnel-client-constants';

export class TunnelClient {
  logger: ReturnType<typeof createLogger>;
  tunnelClientManager: TunnelClientManager;

  constructor(options: { tunnelClientManager: TunnelClientManager }) {
    this.logger = createLogger(this.constructor.name);
    this.tunnelClientManager = options.tunnelClientManager;
  }

  getClientOptions(clientOptions: Partial<ClientOptions>): ClientOptions {
    deleteUndefined(clientOptions);
    return { ...defaultClientOptions, ...clientOptions };
  }

  async createCluster(partialClientOptions: Partial<ClientOptions>) {
    const clientOptions = this.getClientOptions(partialClientOptions);
    this.logger.debug('createCluster options', clientOptions);
    const { data: tunnelOptions } = await axios.post<TunnelOptions>(
      `${clientOptions.apiUrl}/tunnels/create`,
      clientOptions,
    );
    this.logger.debug('createCluster', { tunnelOptions });

    for (let i = 0; i < tunnelOptions.tunnelMaxSockets; i++) {
      this.createTunnel({ clientOptions, tunnelOptions });
    }
    this.tunnelClientManager.configure({ clientOptions, tunnelOptions });
    return this;
  }

  createTunnel({ clientOptions, tunnelOptions }: { clientOptions: ClientOptions; tunnelOptions: TunnelOptions }) {
    const statuses = {
      localConnected: false,
      localDestroyed: false,
      remoteConnected: false,
      remoteDestroyed: false,
    };

    const localConnect = ({ remoteSocket }: { remoteSocket: net.Socket }) => {
      const tcp = (clientOptions.localTls ? tls : net) as typeof net & typeof tls;
      const tlsOptions = clientOptions.localTls ? { rejectUnauthorized: false } : {};
      const tcpOptions = { port: clientOptions.localPort, host: clientOptions.localHost, ...tlsOptions };
      const localSocket = tcp.connect(tcpOptions, () => {
        this.logger.debug('localSocket connected', localSocket.address());
      });

      localSocket.on('close', () => {
        remoteSocket.end();
        this.logger.debug('localSocket closed');
      });

      localSocket.on('error', (error: any) => {
        if (error?.code === 'ECONNREFUSED') {
          statuses.localDestroyed = true;
        }
        this.logger.debug('localSocket error', error?.code);
      });

      pipeline(remoteSocket, localSocket, remoteSocket, () => null);
    };

    const remoteConnect = () => {
      const tcp = (tunnelOptions.tunnelTls ? tls : net) as typeof net & typeof tls;
      const tlsOptions = tunnelOptions.tunnelTls ? { rejectUnauthorized: clientOptions.rejectUnauthorized } : {};
      const tcpOptions = { port: tunnelOptions.tunnelPort, host: tunnelOptions.tunnelHost, ...tlsOptions };
      const remoteSocket = tcp.connect(tcpOptions, () => {
        this.logger.debug('remoteSocket connect', remoteSocket.address());
        remoteSocket.write(tunnelOptions.tunnelToken);
      });

      remoteSocket.setKeepAlive(true);

      remoteSocket.on('data', (data) => {
        if (statuses.remoteConnected || statuses.remoteDestroyed) {
          return;
        }

        if (data.includes(tunnelOptions.tunnelToken)) {
          statuses.remoteConnected = true;
          this.logger.debug('remoteSocket connected');
          this.tunnelClientManager.handle({ socket: remoteSocket });
          localConnect({ remoteSocket });
        } else {
          statuses.remoteDestroyed = true;
          remoteSocket.destroy();
          this.logger.debug('remoteSocket destroyed');
        }
      });

      remoteSocket.on('close', (hadError) => {
        this.logger.debug('remoteSocket close', { hadError });
        if (statuses.remoteDestroyed && !statuses.localDestroyed) {
          this.tunnelClientManager.emit('destroy');
        } else if (hadError) {
          setTimeout(() => this.createTunnel({ clientOptions, tunnelOptions }), 5000);
        } else {
          this.createTunnel({ clientOptions, tunnelOptions });
        }
      });

      remoteSocket.on('error', (error: any) => {
        if (error?.code === 'ECONNREFUSED') {
          statuses.remoteDestroyed = true;
        }
        this.logger.debug('remoteSocket error', { code: error?.code });
      });
    };

    remoteConnect();
  }
}
