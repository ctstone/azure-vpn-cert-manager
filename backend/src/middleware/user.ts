import { Handler } from 'express';

import { UserDb } from '../models/user';
import { tryPromise } from '../tryPromise';
import { getAzureAdToken, ResourceId } from './authorization/azure-ad';

const DB = new UserDb();

export function userRole(role: string): Handler {
  return (req, res, next) => {
    const token = getAzureAdToken(res, ResourceId.graph);

    tryPromise(next, async () => {
      const userExists = await DB.get(token.userId);

      if (userExists) {
        const roles = await DB.roles(token.userId);
        if (roles.includes(role)) {
          return next();
        }
      }

      res.status(403).end();
    });
  };
}

export function currentUser(paramName: string): Handler {
  return (req, res, next) => {
    const token = getAzureAdToken(res, ResourceId.graph);
    const user = req.params[paramName];

    if (user === token.userId) {
      next();
    } else {
      res.status(403).end();
    }
  };
}
