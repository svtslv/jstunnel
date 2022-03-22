// noinspection JSXNamespaceValidation

const { useEffect, useState, useMemo } = React;

const Root = () => {
  const [info, setInfo] = useState();
  const [httpLogs, setHttpLogs] = useState([]);
  const [combinedLogs, setCombinedLogs] = useState([]);
  const [currentCombinedLog, setCurrentCombinedLog] = useState();

  useEffect(() => {
    const events = new EventSource('/api/events');
    events.onmessage = (event) => {
      const parsedData = JSON.parse(event.data);
      if (parsedData.info) {
        setInfo(parsedData.info);
      }
      if (parsedData.httpLogs) {
        setHttpLogs((httpLogs) => [...parsedData.httpLogs, ...httpLogs]);
      }
    };
  }, []);

  useEffect(() => {
    const combinedLogs = httpLogs
      .filter((log) => Boolean(log.method))
      .map((requestLog) => {
        const responseLog = httpLogs.find(
          (responseLog) => !responseLog.method && responseLog.requestId === requestLog.requestId,
        );
        return { requestLog, responseLog };
      });

    if (!currentCombinedLog) {
      setCurrentCombinedLog(combinedLogs[0]);
    } else if (currentCombinedLog && !currentCombinedLog.responseLog) {
      setCurrentCombinedLog(combinedLogs.find((combinedLog) => combinedLog.requestId === currentCombinedLog.requestId));
    }

    setCombinedLogs(combinedLogs);
    if (httpLogs.length > 200) {
      httpLogs.length = 200;
    }
  }, [httpLogs]);

  return (
    <>
      <header>
        <div className="navbar navbar-dark bg-dark mb-4">
          <div className="container d-flex justify-content-between">
            <a href="/" className="navbar-brand d-flex align-items-center">
              <strong>JsTunnel</strong>
            </a>
          </div>
        </div>
      </header>

      <main className="container">
        {!combinedLogs[0] ? (
          <div className="bg-light p-4">
            <h5>No requests to display yet</h5>
            {info && (
              <>
                <div>To get started, make a request to one of your public URLs</div>
                <ul className="list-group-flush p-0 m-0 border-bottom">
                  {info.urls.map((url) => {
                    // noinspection JSValidateTypes
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
                  const { requestLog, responseLog = {} } = combinedLog;
                  const isCurrent = requestLog.requestId === currentCombinedLog?.requestLog.requestId;
                  const statusColor = +responseLog?.statusCode >= 400 ? 'text-danger' : 'text-success';
                  const duration =
                    requestLog.createdAt && responseLog.createdAt
                      ? +new Date(responseLog.createdAt) - +new Date(requestLog.createdAt) + 'ms'
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
                              &nbsp;{responseLog.statusCode} {responseLog.statusMessage}
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
              <Request currentCombinedLog={currentCombinedLog} />
            </div>
          </div>
        )}
      </main>
    </>
  );
};

const Request = ({ currentCombinedLog }) => {
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
      <RequestTabs data={requestLog} />
      {responseLog && (
        <>
          <h5 className="text-truncate">
            {responseLog.statusCode} {responseLog.statusMessage}
          </h5>
          <RequestTabs data={responseLog} />
        </>
      )}
    </>
  );
};

const RequestTabs = ({ data }) => {
  const tabs = { headers: 'headers', body: 'body', info: 'info' };
  const [tab, setTab] = useState(tabs.headers);

  const content = useMemo(() => {
    let content;
    const { raw: headers, body, ...info } = data;
    if (tab === tabs.info) {
      content = JSON.stringify(info, null, 2);
    } else if (tab === tabs.body) {
      content = data.json ? JSON.stringify(data.json, null, 2) : body;
    } else {
      content = headers;
    }
    return content;
  }, [data, tab]);

  return (
    <>
      <ul className="nav nav-tabs">
        {Object.keys(tabs).map((key) => {
          const value = tabs[key];
          const active = value === tab ? ' active' : '';
          const disabled = value === tabs.body && !data.body ? ' disabled' : '';
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

window.Root = Root;
