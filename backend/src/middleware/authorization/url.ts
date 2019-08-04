import * as express from 'express';

export function getUrl(req: express.Request, path: string) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const prefix = req.headers['x-forwarded-prefix'] || '';
  return `${proto}://${host}${prefix}${path}`;
}
