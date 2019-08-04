import connectMongo from 'connect-mongo';
import { RequestHandler } from 'express';
import expressSession from 'express-session';

const MongoStore = connectMongo(expressSession);

export function session(secret: string, ttl: number, connectionString: string): RequestHandler {
  return (req, res, next) => {
    const sessionHandler = expressSession({
      secret,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: ttl },
      store: new MongoStore({ url: connectionString }),
    });
    sessionHandler(req, res, next);
  };
}
