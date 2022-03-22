# JSTunnel - secure tunnels to localhost

<a href="https://www.npmjs.com/package/jstunnel"><img src="https://img.shields.io/npm/v/jstunnel.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/package/jstunnel"><img src="https://img.shields.io/npm/l/jstunnel.svg" alt="Package License" /></a>

## Table of Contents
- [Description](#description)
- [Installation](#installation)
- [Usage](#usage)
- [Custom subdomain](#custom-subdomain)
- [Serving local directory](#serving-local-directory)
- [Password protection](#password-protection)
- [Web interface](#web-interface)
- [HTTP logs](#http-logs)
- [License](#license)

## Description
JsTunnel provides unique public URLs allowing you to easily share a web service on your local development machine with the world through a secure tls tunnel.

## Installation
#### Globally via `npm`
```bash
npm install -g jstunnel
```
#### Running on-demand:
```bash
npx jstunnel [options]
```

## Usage
Start a webserver on some local port (e.g. 3000) and use the cli to request a tunnel to your local server.
#### example: http tunnel
```bash
npx jstunnel -p 3000
```
#### example: tcp tunnel
```bash
npx jstunnel -p 5432 -t tcp
```
#### example: print help
```bash
npx jstunnel --help
```

## Custom subdomain
#### example:
```bash
npx jstunnel -p 3000 -s subdomain
```

## Serving local directory
#### example:
```bash
npx jstunnel --directory ./
```

## Password protection
#### example: basic auth
```bash
npx jstunnel -p 3000 --auth username:password
```
#### example: include path
```bash
npx jstunnel -p 3000 --auth user:pass:+/private
```
#### example: exclude path
```bash
npx jstunnel -p 3000 --auth user:pass:-/public
```

## Web interface
#### example: enable
```bash
npx jstunnel -p 3000 --web
```
#### example: disable
```bash
npx jstunnel -p 3000 --web false
```

## HTTP logs
#### example: raw
```bash
npx jstunnel -p 3000 --log raw
```
#### example: compact
```bash
npx jstunnel -p 3000 --log compact
```
#### example: combined
```bash
npx jstunnel -p 3000 --log combined
```
#### example: body limiter
```bash
npx jstunnel -p 3000 --log [type]:200
```
#### example: disable
```bash
npx jstunnel -p 3000 --log false
```

## Sponsored by
Your stars on GitHub

## License
MIT