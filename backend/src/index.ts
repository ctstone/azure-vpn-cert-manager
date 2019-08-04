import cookieParser from 'cookie-parser';
import express from 'express';

import { env } from './env';
import { azureAdOAuth, ResourceId } from './middleware/authorization/azure-ad';
import { errorHandler } from './middleware/error-handler';
import { session } from './middleware/session';
import { CA_ROUTER } from './routers/ca-router';
import { USERS_ROUTER } from './routers/users-router';

const port = env('PORT', '8080');
const appId = env('APP_ID');
const getAppPassword = () => Promise.resolve(env('APP_PASSWORD'));
const tenantId = env('APP_TENANT', 'common');
const connectionString = env('MONGO_CONNECTION_STRING');
const secret = env('SESSION_SECRET');
const ttl = +env('SESSION_TTL', (1000 * 60 * 60 * 24 * 7).toString());

express()
  .use(
    cookieParser(),
    session(secret, ttl, connectionString),
    azureAdOAuth({ appId, tenantId, getAppPassword }, ResourceId.graph))
  .use('/users', USERS_ROUTER)
  .use('/ca', CA_ROUTER)
  .use(errorHandler)
  .listen(port, () => console.log(`Listening on ${port}`));
