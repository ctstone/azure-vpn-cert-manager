import * as express from 'express';

import { ConflictError } from '../conflict-error';
import { NotFoundError } from '../not-found-error';
import { RequestError } from '../request-error';

export function errorHandler(err: Error, req: express.Request, res: express.Response, next: express.NextFunction) {
  let status = 500;
  let stack: string;

  if (err instanceof NotFoundError) {
    status = 404;
  } else if (err instanceof RequestError) {
    status = 400;
  } else if (err instanceof ConflictError) {
    status = 409;
  } else {
    status = 500;
    stack = err.stack;
  }

  const error = { message: err.message, stack, status };
  res.status(status).json({ error });
}
