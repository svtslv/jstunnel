import { Request, Response } from 'express';

export interface AuthConfig {
  username: string;
  password: string;
  credentials: string;
  includePaths: RegExp[];
  excludePaths: RegExp[];
}

export interface AuthorizationParams {
  reqPath: string;
  authString: string;
  authHeader: string;
}

export class TunnelServerAuthorizer {
  public handleAuth(req: Request, res: Response, authString: string): boolean {
    if (!authString) {
      return true;
    }

    const isAuthorized = this.isAuthorized({
      reqPath: req.path,
      authHeader: req.headers.authorization,
      authString: authString,
    });

    if (isAuthorized) {
      return true;
    }

    if (!req.headers.authorization) {
      res.status(401).set('WWW-Authenticate', 'Basic realm="Tunnel"').end();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }

    return false;
  }

  private parseAuthConfig(authString: string): AuthConfig {
    const parts = authString.split(':');
    const [username, password, ...options] = parts;

    const config: AuthConfig = {
      username,
      password,
      credentials: `${username}:${password}`,
      includePaths: [],
      excludePaths: [],
    };

    options.forEach((option) => {
      const path = option.substring(1);
      if (!path) return;

      const regex = new RegExp(`^${path}`, 'gi');
      if (option.startsWith('+')) {
        config.includePaths.push(regex);
      } else if (option.startsWith('-')) {
        config.excludePaths.push(regex);
      }
    });

    return config;
  }

  private getProvidedCredentials(authHeader?: string): string | undefined {
    if (!authHeader) {
      return undefined;
    }
    const base64Credentials = authHeader.split(' ')[1];
    if (!base64Credentials) {
      return undefined;
    }
    return Buffer.from(base64Credentials, 'base64').toString('utf-8');
  }

  private isAuthorized(params: AuthorizationParams): boolean {
    const { reqPath, authHeader, authString } = params;

    const config = this.parseAuthConfig(authString);
    const providedCredentials = this.getProvidedCredentials(authHeader);

    if (config.credentials === providedCredentials) {
      return true;
    }

    if (config.excludePaths.some((regex) => regex.test(reqPath))) {
      return true;
    }

    if (config.includePaths.some((regex) => regex.test(reqPath))) {
      return false;
    } else if (config.includePaths.length !== 0) {
      return true;
    }

    return false;
  }
}
