import net from 'net';
import tls from 'tls';
import http from 'http';
import https from 'https';
import axios from 'axios';
import { pipeline } from 'stream';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { HttpTunnelResponse } from '../types/types';
import { TunnelClientManager } from './tunnel-client-manager';
import { TunnelClientOptions } from './tunnel-client-options';

export class TunnelClient {
  logger = new Logger(this.constructor.name);
  tunnelClientOptions: TunnelClientOptions;
  tunnelClientManager: TunnelClientManager;
  httpTunnelResponse: HttpTunnelResponse;

  pool = new Set<net.Socket>();
  pendingConnections = 0;
  pendingRestart = false;

  constructor(tunnelClientOptions = new TunnelClientOptions()) {
    this.tunnelClientOptions = tunnelClientOptions;
    this.tunnelClientManager = new TunnelClientManager(tunnelClientOptions);
  }

  public async start() {
    this.pendingRestart = false;
    this.logger.debug('tunnelClientOptions', this.tunnelClientOptions);
    const { data: httpTunnelResponse } = await axios.post<HttpTunnelResponse>(
      `${this.tunnelClientOptions.apiUrl}/.tunnels/create`,
      this.tunnelClientOptions,
      { headers: { 'x-tunnel-client-request': true } },
    );
    this.httpTunnelResponse = httpTunnelResponse;
    this.logger.debug('httpTunnelResponse', { httpTunnelResponse });
    this.logger.debug(`Starting to fill the connection pool up to ${this.httpTunnelResponse.maxSockets} sockets.`);
    this.maintainPool();
  }

  private maintainPool() {
    while (this.pool.size + this.pendingConnections < this.httpTunnelResponse.maxSockets) {
      this.createSocketForPool();
    }
  }

  private createSocketForPool() {
    this.pendingConnections++;
    this.logger.debug('Creating a new socket for the pool.');

    const [remoteHost, remotePort] = this.tunnelClientOptions.clientId.split(':');
    const host = remoteHost.endsWith('.localhost') ? 'localhost' : remoteHost;
    const port = remotePort || (this.tunnelClientOptions.remoteTls ? 443 : 80);
    const transport = this.tunnelClientOptions.remoteTls ? https : http;

    const req = transport.request({
      host,
      port,
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'x-tunnel-protocol',
        'x-tunnel-client-request': 'true',
        'x-tunnel-client-token': this.httpTunnelResponse.clientToken,
      },
    });
    req.end();

    req.on('upgrade', (_res, remoteSocket, _head) => {
      this.pendingConnections--;
      this.logger.debug('Socket upgraded and added to the pool.');

      remoteSocket.setTimeout(0);
      remoteSocket.setKeepAlive(true);
      remoteSocket.setMaxListeners(this.httpTunnelResponse.maxSockets + (EventEmitter.defaultMaxListeners || 10));
      this.tunnelClientManager.handle({ socket: remoteSocket });
      this.pool.add(remoteSocket);

      remoteSocket.once('data', (initialData) => {
        this.logger.debug('Socket from pool received data, pairing it with a local connection.');
        this.pool.delete(remoteSocket);
        this.maintainPool();
        this.connectLocalService(remoteSocket, initialData);
      });

      remoteSocket.on('error', (error) => {
        this.logger.debug('Error on a remote socket:', error.message);
      });

      remoteSocket.on('close', () => {
        this.logger.debug('A remote socket was closed.');
        this.pool.delete(remoteSocket);
        this.maintainPool();
      });
    });

    req.on('error', (error) => {
      this.pendingConnections--;
      this.logger.debug('HTTP request for upgrade failed:', error.message);
      if (this.pendingRestart) return;
      this.pendingRestart = true;
      this.logger.debug('Restarting tunnel client in 2 minutes due to error.');
      setTimeout(() => this.start(), 2 * 60 * 1000);
    });
  }

  private connectLocalService(remoteSocket: net.Socket, initialData: Buffer) {
    const tcp = (this.tunnelClientOptions.localTls ? tls : net) as typeof net & typeof tls;
    const tlsOptions = this.tunnelClientOptions.localTls ? { rejectUnauthorized: false } : {};
    const tcpOptions = {
      port: this.tunnelClientOptions.localPort,
      host: this.tunnelClientOptions.localHost,
      ...tlsOptions,
    };

    const localSocket = tcp.connect(tcpOptions, () => {
      this.logger.debug('localSocket connected', localSocket.address());
    });

    localSocket.on('connect', () => {
      this.logger.debug('Local socket connected, establishing pipeline.');
      localSocket.write(initialData);
      pipeline(remoteSocket, localSocket, (error) => {
        if (error) this.logger.debug('Remote -> Local pipeline failed.', error.message);
      });
      pipeline(localSocket, remoteSocket, (error) => {
        if (error) this.logger.debug('Local -> Remote pipeline failed.', error.message);
      });
    });

    localSocket.on('error', (err: Error) => {
      this.logger.debug(`Failed to connect to local service on port ${tcpOptions.port}:`, err.message);
      remoteSocket.end();
    });
  }
}
