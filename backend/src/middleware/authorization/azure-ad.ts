import { AuthenticationContext, TokenResponse } from 'adal-node';
import { randomBytes } from 'crypto';
import * as express from 'express';
import { stringify as stringifyQuery } from 'querystring';

import { decryptSessionData, encryptSessionData, listEncrypted, removeSessionData } from './crypto';
import { getUrl } from './url';

export type GetAppPassword = () => Promise<string>;

export interface AzureAdOAuthOptions {
  getAppPassword: GetAppPassword;
  appId: string;
  tenantId: string;
  authority?: string;
}

export enum ResourceId {
  azure = 'https://management.core.windows.net/',
  graph = '00000002-0000-0000-c000-000000000000',
  devops = '499b84ac-1321-427f-aa17-267ca6975798',
}

interface AccessTokenRequest {
  tenant: string;
  client_id: string;
  response_type?: string;
  redirect_uri: string;
  response_mode?: string;
  state?: string;
  resource?: string;
  scope?: string;
  prompt?: string;
  login_hint?: string;
  domain_hint?: string;
  code_challenge_method?: string;
  code_challenge?: string;
}

const AUTHORITY = 'https://login.microsoftonline.com';
const SESSION_KEY_PREFIX = 'azuread';

enum Cookie {
  tenant = 'tenant',
  resource = 'resourceId',
  nonce = 'nonce',
  redirect = 'redirect',
}

enum Header {
  tenant = 'x-tenant',
}

export enum ResponseType {
  redirect = 'redirect',
  json = 'json',
}

export function azureAdOAuth(options: AzureAdOAuthOptions, ...resourceIds: string[]) {
  const authHandlers = resourceIds
    .map((id) => authenticateAzureAd(id, options, ResponseType.json));
  const authHandlersRedirect = resourceIds
    .map((id) => authenticateAzureAd(id, options, ResponseType.redirect));
  return express.Router()
    .get('/accept', acceptAzureAdToken(options), tokensAccepted)
    .get('/logout', logoutAzureAd)
    .get('/login', authHandlersRedirect, login)
    .use(...authHandlers)
    ;
}

export function getAzureAdToken(res: express.Response, resourceId: string) {
  if (res.locals.azureAd) {
    return res.locals.azureAd[resourceId] as TokenResponse;
  }
}

function tokensAccepted(req: express.Request, res: express.Response, next: express.NextFunction) {
  const redirectTo = req.cookies[Cookie.redirect] || '/';
  res.clearCookie(Cookie.redirect);
  res.redirect(redirectTo || '/');
}

function login(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.query.redirect) {
    res.redirect(req.query.redirect);
  } else {
    res.status(200).send('Logged in');
  }
}

export function logoutAzureAd(req: express.Request, res: express.Response, next: express.NextFunction) {
  listEncrypted(req)
    .filter((x) => x.startsWith(SESSION_KEY_PREFIX))
    .forEach((id) => removeSessionData(req, res, id));
  res.clearCookie(Cookie.tenant);
  res.status(200).send('You are now logged out');
}

export function authenticateAzureAd(resourceId: string, options: AzureAdOAuthOptions, type: ResponseType): express.Handler {
  const refresh = refreshAzureAdToken(resourceId, options);
  return (req, res, next) => {
    refresh(req, res, (err) => {
      if (err) { return next(err); }

      const tenantId = getTenantId(req, options);
      const sessionKey = getSessionKey(resourceId, tenantId);
      const token = decryptSessionData<TokenResponse>(req, sessionKey);

      if (token) {
        if (tenantId !== 'common' && tenantId !== req.cookies[Cookie.tenant]) {
          res.cookie(Cookie.tenant, tenantId);
        }
        res.locals.azureAd = res.locals.azureAd || {};
        res.locals.azureAd[resourceId] = token;
        res.locals.userId = token.userId;

        next();
      } else {
        const nonce = req.cookies[Cookie.nonce] || randomBytes(32).toString('hex');
        const redirectUrl = getUrl(req, req.baseUrl + '/accept');
        const login = getAuthorizationUrl({
          client_id: options.appId,
          tenant: tenantId,
          state: nonce,
          redirect_uri: redirectUrl,
          resource: resourceId,
          login_hint: res.locals.userId,
        }, options);
        const nonceExpires = new Date(Date.now() + 60e3);
        res.cookie(Cookie.nonce, nonce, { expires: nonceExpires });
        res.cookie(Cookie.resource, resourceId);
        res.cookie(Cookie.redirect, getUrl(req, req.originalUrl));
        if (tenantId !== 'common') {
          res.cookie(Cookie.tenant, tenantId);
        }
        if (type === ResponseType.redirect) {
          res.redirect(login);
        } else {
          res.status(401).json({ login: getUrl(req, '/login') });
        }
      }
    });
  };
}

export function acceptAzureAdToken(options: AzureAdOAuthOptions): express.Handler {
  return async (req, res, next) => {
    try {
      const tenantId = getTenantId(req, options);
      const { state, code, error } = req.query;
      const nonce = req.cookies[Cookie.nonce];
      const resourceId = req.cookies[Cookie.resource];
      const redirectUrl = getUrl(req, req.baseUrl + '/accept');

      if (error) {
        res.status(500).json(req.query);
      } else if (!code) {
        next(new Error('Missing AzureAD OAuth code in query'));
      } else if (state !== nonce) {
        next(new Error('AzureAD OAuth state does not match'));
      } else {
        const token = await acquireToken(code, redirectUrl, tenantId, resourceId, options);
        const sessionKey = getSessionKey(resourceId, token.tenantId);
        encryptSessionData(req, res, sessionKey, token);
        res.cookie(Cookie.tenant, token.tenantId);
        res.clearCookie(Cookie.nonce);
        res.clearCookie(Cookie.resource);
        next();
      }
    } catch (err) {
      next(err);
    }
  };
}

export function refreshAzureAdToken(resourceId: string, options: AzureAdOAuthOptions): express.Handler {
  return async (req, res, next) => {
    try {
      const tenantId = getTenantId(req, options);
      const sessionKey = getSessionKey(resourceId, tenantId);
      const token = decryptSessionData<TokenResponse>(req, sessionKey);
      if (token && isTokenExpired(token)) {
        console.log('Refreshing token...');
        const refreshed = await acquireTokenWithRefreshToken(token, options);
        encryptSessionData(req, res, sessionKey, refreshed);
        next();
      } else {
        next();
      }
    } catch (err) {
      next(err);
    }
  };
}

function getAuthorizationUrl(request: AccessTokenRequest, options: AzureAdOAuthOptions) {
  (Object.keys(request) as Array<keyof AccessTokenRequest>)
    .filter((k) => request[k] === undefined || request[k] === null)
    .forEach((k) => delete request[k]);
  request = Object.assign({
    response_type: 'code',
    response_mode: 'query',
  }, request);
  const query = stringifyQuery(request as any);
  return `${getAuthorityForTenant(options)}/oauth2/authorize?${query}`;
}

function getSessionKey(resourceId: string, tenantId: string) {
  return `${SESSION_KEY_PREFIX}:${tenantId}:${resourceId}`;
}

function isTokenExpired(token: TokenResponse): boolean {
  return new Date(token.expiresOn) <= new Date();
}

async function acquireTokenWithRefreshToken(token: TokenResponse, options: AzureAdOAuthOptions) {
  const {
    appId,
    getAppPassword,
    tenantId,
  } = options;
  const authority = getAuthorityForTenant(options);
  const context = new AuthenticationContext(authority);
  const password = await getAppPassword();

  return await new Promise<TokenResponse>((resolve, reject) => {
    try {
      context.acquireTokenWithRefreshToken(token.refreshToken, appId, password, token.resourceId, (err, token) => {
        if (err) {
          reject(err);
        } else {
          resolve(token as TokenResponse);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function acquireToken(code: string, redirect: string, tenantId: string, resourceId: string, options: AzureAdOAuthOptions) {
  const {
    appId,
    getAppPassword,
  } = options;
  const authority = getAuthorityForTenant(options);
  const context = new AuthenticationContext(authority);
  const password = await getAppPassword();

  return new Promise<TokenResponse>((resolve, reject) => {
    try {
      context.acquireTokenWithAuthorizationCode(code, redirect, resourceId, appId, password, (err, token) => {
        if (err) {
          reject(err);
        } else {
          resolve(token as TokenResponse);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

function getAuthorityForTenant(options: AzureAdOAuthOptions) {
  const authority = options.authority || AUTHORITY;
  return `${authority}/${options.tenantId}`;
}

function getTenantId(req: express.Request, options: AzureAdOAuthOptions): string {
  const header = req.headers[Header.tenant];
  const cookie = req.cookies[Cookie.tenant];

  if (header && header !== 'common') {
    return header as string;
  } else if (cookie && cookie !== 'common') {
    return cookie;
  } else {
    return options.tenantId;
  }
}
