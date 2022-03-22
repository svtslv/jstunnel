// noinspection HttpUrlsUsage

import * as fs from 'fs';
import * as path from 'path';
import * as express from 'express';

const port = 3800;
const host = 'localhost';
const app = express();

const localServerTs = fs.readFileSync(path.join(__dirname, 'local-server.ts'));
app.use('/static', express.static(path.join(__dirname, '..', 'src', 'web')));

app.get('/file', (req, res) => {
  res.send(localServerTs);
});

app.get('/text', (req, res) => {
  res.send(localServerTs.toString());
});

app.get('/html', (req, res) => {
  res.send(`<pre>${localServerTs.toString()}</pre>`);
});

app.get('/json', (req, res) => {
  res.send({ json: localServerTs.toString() });
});

app.get('/404', (req, res) => {
  res.status(404).send({ message: 404 });
});

app.get('/503', (req, res) => {
  res.status(503).send({ message: 503 });
});

app.all('*', (req, res) => {
  res.send({
    url: req.url,
    date: new Date(),
  });
});

app.listen(3800, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://${host}:${port}/`);
});
