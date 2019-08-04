import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import * as express from 'express';

const CIPHER_ALGO = 'aes-256-cbc';
const ENCODING = 'hex';
const KEY_SIZE = 32;
const IV_SIZE = 16;

export function encryptSessionData<T>(req: express.Request, res: express.Response, id: string, data: T) {
  const session = getSessionData(req);
  const { key, iv } = randomKey();
  const dataToEncode = Buffer.from(JSON.stringify(data));
  const encrypted = encrypt(key, iv, dataToEncode);
  const keyCookieName = getCookieName(id);
  const keyText = key.toString(ENCODING);
  session[id] = encrypted.toString(ENCODING);
  req.cookies[keyCookieName] = keyText;
  res.cookie(keyCookieName, keyText, { httpOnly: true });
}

export function decryptSessionData<T = any>(req: express.Request, id: string): T {
  const session = getSessionData(req);
  const keyCookieName = getCookieName(id);
  const keyText: string = req.cookies[keyCookieName];
  const encryptedText = session[id];
  try {
    if (encryptedText && keyText) {
      const key = Buffer.from(keyText, ENCODING);
      const encrypted = Buffer.from(encryptedText, ENCODING);
      const decrypted = decrypt(key, encrypted);
      return JSON.parse(decrypted.toString());
    }
  } catch (err) {
    console.warn(err);
  }
}

export function removeSessionData(req: express.Request, res: express.Response, id: string) {
  const session = getSessionData(req);
  const keyCookieName = getCookieName(id);
  delete session[id];
  res.clearCookie(keyCookieName);
}

export function listEncrypted(req: express.Request) {
  const session = getSessionData(req);
  return Object.keys(session);
}

function getCookieName(id: string) {
  return `${id}.key`;
}

function encrypt(key: Buffer, iv: Buffer, data: Buffer) {
  const cipher = createCipheriv(CIPHER_ALGO, key, iv);
  const encoded = Buffer.concat([
    cipher.update(data),
    cipher.final(),
  ]);
  return Buffer.concat([iv, encoded]);
}

function decrypt(key: Buffer, data: Buffer) {
  const iv = data.slice(0, IV_SIZE);
  const encoded = data.slice(IV_SIZE);
  const decipher = createDecipheriv(CIPHER_ALGO, key, iv);
  return Buffer.concat([
    decipher.update(encoded),
    decipher.final(),
  ]);
}

function randomKey() {
  const key = randomBytes(KEY_SIZE);
  const iv = randomBytes(IV_SIZE);
  return { key, iv };
}

function getSessionData(req: express.Request): { [key: string]: string } {
  const key = 'encrypted';
  if (!req.session[key]) {
    req.session[key] = {};
  }

  return req.session[key];
}
