export type HttpTunnelRequest = {
  domain: string;
  subdomain: string;
  serverToken?: string;
  authString?: string;
};

export type HttpTunnelResponse = {
  clientId: string;
  clientToken: string;
  maxSockets: number;
};
