#!/usr/bin/env node

import express from 'express';
import path from 'path';
import { projectRoot } from '../utils/pkg-info';

const port = process.env.WEBSITE_PORT || 9080;

export class WebsiteCli {
  async run() {
    const app = express();
    app.use(express.static(path.join(projectRoot, 'out')));
    app.all('*all', (_req, res) => {
      return res.sendFile(path.join(projectRoot, 'out', 'website.html'));
    });
    app.listen(port, () => {
      console.log(`Website is running at http://localhost:${port}`);
    });
  }
}

export const tunnelServerWebCli = new WebsiteCli();
tunnelServerWebCli.run().catch(console.error);
