import * as crypto from 'crypto';
import * as net from 'net';
import * as zlib from 'zlib';
import { HeaderInfo, HTTPParser, RequestMethod } from 'http-parser-js';
import { EventEmitter } from 'events';
import { TunnelClientOptions } from './tunnel-client-options';

export type HttpLog = {
  parseId: string;
  requestId: string;
  createdAt: Date;
  url?: string;
  method?: RequestMethod;
  statusCode?: number;
  statusMessage?: string;
  raw: string;
  headers: Record<string, string>;
  body: string;
  json: Record<string, unknown>;
};

export class TunnelClientManager extends EventEmitter {
  on(event: 'httpLog', listener: (httpLog: HttpLog) => void): this;
  on(event: 'connect', listener: (httpLog: HttpLog) => void): this;
  on(event: 'destroy', listener: (httpLog: HttpLog) => void): this;
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  tunnelClientOptions: TunnelClientOptions;
  httpLogs: HttpLog[] = [];

  constructor(tunnelClientOptions = new TunnelClientOptions()) {
    super();
    this.tunnelClientOptions = tunnelClientOptions;
  }

  handle({ socket }: { socket: net.Socket }) {
    const { requestParser, responseParser } = this.httpParser();
    socket.on('data', (data) => {
      requestParser.execute(data);
    });
    const socketWrite = socket.write;
    socket.write = (data: Buffer) => {
      responseParser.execute(data);
      return socketWrite.call(socket, data);
    };
  }

  httpParser() {
    let requestId: string;

    const helper = () => {
      const storage: {
        parseId: string;
        requestId: string;
        headerInfo: HeaderInfo;
        bodyChunks: any;
        bodySkipped: boolean;
      } = {
        parseId: null,
        requestId: null,
        headerInfo: null,
        bodyChunks: [],
        bodySkipped: false,
      };
      const parseBody = (chunk: Buffer, offset: number, length: number) => {
        if (!storage.bodySkipped) {
          storage.bodyChunks.push(chunk.subarray(offset, offset + length));
          const bufferLength = Buffer.concat(storage.bodyChunks).byteLength;
          if (bufferLength > 100 * 1000) {
            storage.bodySkipped = true;
            storage.bodyChunks.length = 0;
          }
        }
      };
      const complete = () => {
        let json: Record<any, any>;
        let bodyBuffer = Buffer.concat(storage.bodyChunks) as Buffer<ArrayBufferLike>;
        try {
          bodyBuffer = zlib.gunzipSync(bodyBuffer);
        } catch {}
        const body = bodyBuffer.toString();
        try {
          json = JSON.parse(body);
        } catch {}

        storage.bodyChunks.length = 0;
        storage.bodySkipped = false;

        const raw = [];
        const httpVersion = `HTTP/${storage.headerInfo.versionMajor}.${storage.headerInfo.versionMinor}`;
        if (storage.headerInfo.method) {
          raw.push(`${storage.headerInfo.method} ${storage.headerInfo.url} ${httpVersion}`);
        } else if (storage.headerInfo.statusCode) {
          raw.push(`${httpVersion} ${storage.headerInfo.statusCode} ${storage.headerInfo.statusMessage}`);
        }

        const headers = {};
        const headerInfoHeaders = storage.headerInfo.headers;
        (headerInfoHeaders as unknown as string[]).forEach((_item, index) => {
          if (index % 2 === 0) {
            const headerKey = headerInfoHeaders[index];
            const headerValue = headerInfoHeaders[index + 1];
            raw.push(`${headerKey}: ${headerValue}`);
            headers[headerKey.toLocaleLowerCase()] = headerValue;
          }
        });

        const httpLog = {
          parseId: storage.parseId,
          requestId: requestId,
          createdAt: new Date(),
          method: storage.headerInfo.method as unknown as RequestMethod,
          url: storage.headerInfo.url,
          statusCode: storage.headerInfo.statusCode,
          statusMessage: storage.headerInfo.statusMessage,
          raw: raw.join('\r\n'),
          headers: headers,
          body: body,
          json: json,
        };

        this.httpLogs.unshift(httpLog);

        if (this.httpLogs.length > 200) {
          this.httpLogs.length = 200;
        }

        this.emit('httpLog', httpLog);
      };
      const addInfo = (data: { headerInfo: HeaderInfo; requestId: string }) => {
        storage.headerInfo = data.headerInfo;
        storage.parseId = crypto.randomUUID();
        storage.requestId = data.requestId;
      };
      return { parseBody, complete, addInfo };
    };

    const requestParser = new HTTPParser(HTTPParser.REQUEST);
    const requestHelper = helper();

    requestParser.onHeadersComplete = (headerInfo): any => {
      requestId = crypto.randomUUID();
      requestHelper.addInfo({ headerInfo, requestId });
    };

    requestParser.onBody = (chunk, offset, length) => {
      requestHelper.parseBody(chunk, offset, length);
    };

    requestParser.onMessageComplete = () => {
      requestHelper.complete();
    };

    const responseParser = new HTTPParser(HTTPParser.RESPONSE);
    const responseHelper = helper();

    responseParser.onHeadersComplete = (headerInfo): any => {
      responseHelper.addInfo({ headerInfo, requestId });
    };

    responseParser.onBody = (chunk, offset, length) => {
      responseHelper.parseBody(chunk, offset, length);
    };

    responseParser.onMessageComplete = () => {
      responseHelper.complete();
    };

    return { requestParser, responseParser };
  }
}
