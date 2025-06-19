import path from 'path';

export const projectRoot = path.join(__dirname, '..', '..', '..');

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const packageJson = require(path.join(projectRoot, 'package.json')) as {
  name: string;
  version: string;
  homepage: string;
  repositoryUrl: string;
};
