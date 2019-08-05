import { json } from 'body-parser';
import { Router } from 'express';

import { userRole } from '../middleware/user';
import { CertAuthorityDb } from '../models/cert-authority';
import { NotFoundError } from '../not-found-error';
import { tryPromise } from '../tryPromise';

const JSON_PARSER = json();
const DB = new CertAuthorityDb();
const CA_ADMIN = userRole('ca-admin');

export const CA_ROUTER = Router()

  // list all CAs
  .get('/', (req, res, next) => {
    tryPromise(next, async () => {
      res.status(200).json(await DB.list());
    });
  })

  // CA
  .use('/:ca', Router({ mergeParams: true })

    // create a ca
    .put('/', CA_ADMIN, JSON_PARSER, (req, res, next) => {
      const { ca } = req.params;
      const { roles } = req.body;
      tryPromise(next, async () => {
        await DB.create({ id: ca }, roles);
        res.status(201).end();
      });
    })

    // ca exists?
    .use((req, res, next) => {
      const { ca } = req.params;
      tryPromise(next, async () => {
        await DB.get(ca);
        next();
      });
    })

    // user can access CA?
    .use((req, res, next) => {
      const { ca } = req.params;
      tryPromise(next, async () => {
        const roles = await DB.roles(ca);
        const hasUserRole = userRole(roles);
        hasUserRole(req, res, next);
      });
    })

    // get a ca
    .get('/', (req, res, next) => {
      const { ca } = req.params;
      res.status(200).json({ ca });
    })

    // remove ca
    .delete('/', CA_ADMIN, (req, res, next) => {
      const { ca } = req.params;
      tryPromise(next, async () => {
        await DB.remove(ca);
        res.status(204).end();
      });
    })

    // CA CERTS
    .use('/certs', Router({ mergeParams: true })

      // list CA certs
      .get('/', (req, res, next) => {
        const { ca } = req.params;
        tryPromise(next, async () => {
          res.status(200).json(await DB.certs(ca));
        });
      })

      // create CA cert
      .post('/', CA_ADMIN, JSON_PARSER, (req, res, next) => {
        const { ca } = req.params;
        const { name } = req.body;
        tryPromise(next, async () => {
          await DB.addCert(ca, name);
          res.status(201).end();
        });
      })

      // CA CERT
      .use('/:cert', Router({ mergeParams: true })

        // CA cert exists
        .use((req, res, next) => {
          const { ca, cert } = req.params;
          tryPromise(next, async () => {
            if (!await DB.hasCert(ca, cert)) {
              throw new NotFoundError('CA does not have this cert');
            }
            next();
          });
        })

        // get the public cert
        .get('/', (req, res, next) => {
          const { ca, cert } = req.params;
          tryPromise(next, async () => {
            const publicCert = await DB.publicCert(ca, cert);
            res.status(200).json({ public: publicCert });
          });
        })

        // issue a cert for a user
        .post('/issue', CA_ADMIN, JSON_PARSER, (req, res, next) => {
          const { ca, cert } = req.params;
          const { user } = req.body;
          tryPromise(next, async () => {
            await DB.issueUserCert(ca, cert, user);
            const location = `/users/${user}/certs/${ca}/${cert}/export`;
            res.status(202).set({ location }).json({ location });
          });
        })),
    ))
  ;
