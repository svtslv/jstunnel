'use client';

export const Website = () => {
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
        <div className="row g-5">
          <div className="col-md-9">
            <h4>JsTunnel - secure tunnels to localhost</h4>
            <hr className="my-4 text-light" />
            <div>
              <h5>Description</h5>
              <p>
                JsTunnel provides unique public URLs allowing you to easily share a web service on your local
                development machine with the world through a secure tls tunnel.
              </p>
            </div>
            <hr className="my-4 text-light" />
            <div>
              <h5>Installation</h5>
              <h6>globally via npm</h6>
              <code className="highlight">npm install -g jstunnel</code>
              <h6>running on-demand:</h6>
              <code className="highlight">npx jstunnel [options]</code>
            </div>
            <hr className="my-4 text-light" />
            <div>
              <h5>Usage</h5>
              <p>
                Start a webserver on some local port (e.g. 3000) and use the cli to request a tunnel to your local
                server.
              </p>
              <h6>example: http tunnel</h6>
              <code className="highlight">npx jstunnel -p 3000</code>
              <h6>example: print help</h6>
              <code className="highlight">npx jstunnel --help</code>
            </div>
            <hr className="my-4 text-light" />
            <div>
              <h5>Custom subdomain</h5>
              <h6>example:</h6>
              <code className="highlight">npx jstunnel -p 3000 -s subdomain</code>
            </div>
            <hr className="my-4 text-light" />
            <div>
              <h5>Serving local directory</h5>
              <h6>example:</h6>
              <code className="highlight">npx jstunnel --directory ./</code>
            </div>
            <hr className="my-4 text-light" />
            <div>
              <h5>Password protection</h5>
              <h6>example: basic auth</h6>
              <code className="highlight">npx jstunnel -p 3000 --auth username:password</code>
              <h6>example: include path</h6>
              <code className="highlight">npx jstunnel -p 3000 --auth user:pass:+/private</code>
              <h6>example: exclude path</h6>
              <code className="highlight">npx jstunnel -p 3000 --auth user:pass:-/public</code>
            </div>
            <hr className="my-4 text-light" />
            <div>
              <h5>Web interface</h5>
              <h6>example: enable</h6>
              <code className="highlight">npx jstunnel -p 3000 --web</code>
              <h6>example: disable</h6>
              <code className="highlight">npx jstunnel -p 3000 --web false</code>
            </div>
            <hr className="my-4 text-light" />
            <div>
              <h5>HTTP logs</h5>
              <h6>example: raw</h6>
              <code className="highlight">npx jstunnel -p 3000 --log raw</code>
              <h6>example: compact</h6>
              <code className="highlight">npx jstunnel -p 3000 --log compact</code>
              <h6>example: combined</h6>
              <code className="highlight">npx jstunnel -p 3000 --log combined</code>
              <h6>example: body limiter</h6>
              <code className="highlight">npx jstunnel -p 3000 --log [type]:200</code>
              <h6>example: disable</h6>
              <code className="highlight">npx jstunnel -p 3000 --log false</code>
            </div>
          </div>
          <div className="col-md-3">
            <div>
              <h5>Resources</h5>
              <div className="d-flex">
                <div style={{ minWidth: 80 }}>GitHub:</div>
                <a className="link-secondary" href="https://github.com/svtslv/jstunnel">
                  jstunnel
                </a>
              </div>
              <div className="d-flex">
                <div style={{ minWidth: 80 }}>NPM:</div>
                <a className="link-secondary" href="https://www.npmjs.com/package/jstunnel">
                  jstunnel
                </a>
              </div>
            </div>
            <hr className="my-4 text-light" />
            <div>
              <h5>Sponsored by</h5>
              <div className="d-flex">Your stars on github</div>
            </div>
          </div>
        </div>
      </main>
      <footer className="container pt-4 my-4 text-muted border-top">
        Created by svtslv &middot; &copy; {new Date().getFullYear()}
      </footer>
    </>
  );
};
