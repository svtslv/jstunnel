# JSTunnel

<a href="https://www.npmjs.com/package/jstunnel"><img src="https://img.shields.io/npm/v/jstunnel.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/package/jstunnel"><img src="https://img.shields.io/npm/l/jstunnel.svg" alt="Package License" /></a>

## Table of Contents

- [Description](#description)
- [Installation](#installation)
- [Examples](#examples)
- [License](#license)

## Description
Secure tunnels to localhost

## Installation

#### Globally via `npm`

```bash
npm install -g jstunnel
```

#### Running on-demand:

```bash
npx jstunnel [options]
```

## Examples

```bash
npx jstunnel -p 3000 -s subdomain
```

```bash
npx jstunnel -p 5432 -t=tcp
```

```bash
npx jstunnel --help
```

```bash
    'usage: jstunnel [options]',
    '',
    'options:',
    '  -p, --port           Your port           [required]',
    '      --host           Your host           [localhost]',
    '  -t  --type           Http or tcp         [http]',
    '  -s, --subdomain      Subdomain           [random]',
    '      --apiUrl         Api url             [default]',
    '      --authToken      Auth token          [null]',
    '',
    '  -h, --help           Print this list and exit',
    '  -v, --version        Print the version and exit.',
    '',
    'env:',
    '  TUNNEL_CLIENT_AUTH_TOKEN',
```

## License

MIT