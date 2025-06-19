'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { RequestMethod } from 'http-parser-js';
import { TunnelClientOptions } from '../../core';
import { eventSourceUrl } from '../../core/utils/config';

interface HttpLog {
  requestId: string;
  createdAt: string;
  parseId?: string;
  raw?: string;
  body?: string;
  json?: any;
  method?: RequestMethod;
  url?: string;
  statusCode?: number;
  statusMessage?: string;
  [key: string]: any;
}

interface CombinedLog {
  requestId: string;
  requestLog: HttpLog;
  responseLog?: HttpLog;
}

export const Dashboard = () => {
  const [httpLogs, setHttpLogs] = useState<HttpLog[]>([]);
  const [tunnelClientOptions, setTunnelClientOptions] = useState<TunnelClientOptions>();
  const [currentCombinedLog, setCurrentCombinedLog] = useState<CombinedLog | undefined>();

  useEffect(() => {
    const events = new EventSource(eventSourceUrl);
    events.onmessage = (event) => {
      const parsedData = JSON.parse(event.data);
      if (parsedData.tunnelClientOptions) {
        setTunnelClientOptions(parsedData.tunnelClientOptions);
      }
      if (parsedData.httpLogs) {
        setHttpLogs((httpLogs) => [...parsedData.httpLogs, ...httpLogs].slice(0, 200));
      }
    };
    return () => {
      events.close();
    };
  }, []);

  const combinedLogs = useMemo(() => {
    return httpLogs
      .filter((log) => Boolean(log.method))
      .map((requestLog) => {
        const responseLog = httpLogs.find(
          (responseLog) => !responseLog.method && responseLog.requestId === requestLog.requestId,
        );
        return { requestLog, responseLog, requestId: requestLog.requestId };
      });
  }, [httpLogs]);

  useEffect(() => {
    setCurrentCombinedLog((currentCombinedLog) => {
      if (!currentCombinedLog) {
        return combinedLogs[0];
      }
      if (currentCombinedLog && !currentCombinedLog.responseLog) {
        return combinedLogs.find((combinedLog) => combinedLog.requestId === currentCombinedLog.requestId);
      }
      return currentCombinedLog;
    });
  }, [combinedLogs]);

  return (
    <>
      <header>
        <div className="navbar navbar-dark bg-dark mb-4">
          <div className="container d-flex justify-content-between">
            <Link href="/" className="navbar-brand d-flex align-items-center">
              <strong>JsTunnel</strong>
            </Link>
          </div>
        </div>
      </header>

      <main className="container">
        {!combinedLogs[0] ? (
          <div className="bg-light p-4">
            <h5>No requests to display yet</h5>
            {tunnelClientOptions && (
              <>
                <div>To get started, make a request to one of your public URLs</div>
                <ul className="list-group-flush p-0 m-0">
                  {tunnelClientOptions.clientUrls.map((url) => {
                    return (
                      <li key={url} className="list-group-item bg-light">
                        <a href={url} target="_blank" className="text-info">
                          {url}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        ) : (
          <div className="row">
            <div className="col-sm-6 mb-4">
              <h5>All Requests</h5>
              <ul className="list-group">
                {combinedLogs.map((combinedLog) => {
                  const { requestLog, responseLog } = combinedLog;
                  const isCurrent = requestLog.requestId === currentCombinedLog?.requestLog.requestId;
                  const statusColor = Number(responseLog?.statusCode) >= 400 ? 'text-danger' : 'text-success';
                  const duration =
                    requestLog.createdAt && responseLog?.createdAt
                      ? +new Date(responseLog?.createdAt) - +new Date(requestLog.createdAt) + 'ms'
                      : '';
                  return (
                    <li
                      key={requestLog.parseId}
                      className={'list-group-item' + (isCurrent ? ' list-group-item-info' : '')}
                      role="button"
                      onClick={() => setCurrentCombinedLog(combinedLog)}
                    >
                      <div>
                        <div className="d-flex">
                          <div className="text-muted">{requestLog.method}</div>
                          <div className="text-truncate">&nbsp;{requestLog.url}</div>
                          <div className="text-nowrap ms-auto d-flex">
                            <div className={statusColor}>
                              &nbsp;{responseLog?.statusCode} {responseLog?.statusMessage}
                            </div>
                            <div className="text-end text-muted" style={{ minWidth: '65px' }}>
                              &nbsp;{duration}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="col-sm-6 mb-4">
              <HttpLog currentCombinedLog={currentCombinedLog} />
            </div>
          </div>
        )}
      </main>
    </>
  );
};

const HttpLog = (props: { currentCombinedLog?: CombinedLog }) => {
  const { currentCombinedLog } = props;
  if (!currentCombinedLog) {
    return null;
  }

  const { requestLog, responseLog } = currentCombinedLog;
  return (
    <>
      <div className="text-muted mb-2">
        <small>{new Date(requestLog.createdAt).toLocaleString()}</small>
      </div>
      <h5 className="text-truncate">
        {requestLog.method} {requestLog.url}
      </h5>
      <HttpLogInfo requestLog={requestLog} />
      {responseLog && (
        <>
          <h5 className="text-truncate">
            {responseLog.statusCode} {responseLog.statusMessage}
          </h5>
          <HttpLogInfo requestLog={responseLog} />
        </>
      )}
    </>
  );
};

const tabs = { headers: 'headers', body: 'body', info: 'info' };
const HttpLogInfo = (props: { requestLog: HttpLog }) => {
  const httpLog = props.requestLog;
  const [tab, setTab] = useState(tabs.headers);

  const content = useMemo(() => {
    let content: string;
    const { raw: headers, body, ...info } = httpLog;
    if (tab === tabs.info) {
      content = JSON.stringify(info, null, 2);
    } else if (tab === tabs.body) {
      content = httpLog.json ? JSON.stringify(httpLog.json, null, 2) : body;
    } else {
      content = headers;
    }
    return content;
  }, [httpLog, tab]);

  return (
    <>
      <ul className="nav nav-tabs">
        {Object.keys(tabs).map((key) => {
          const value = tabs[key as keyof typeof tabs];
          const active = value === tab ? ' active' : '';
          const disabled = value === tabs.body && !httpLog.body ? ' disabled' : '';
          return (
            <li className="nav-item" key={key}>
              <a className={`nav-link` + active + disabled} role="button" onClick={() => setTab(value)}>
                {value}
              </a>
            </li>
          );
        })}
      </ul>
      <pre className="bg-light p-4">{content}</pre>
    </>
  );
};
