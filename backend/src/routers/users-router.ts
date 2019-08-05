import { json } from 'body-parser';
import { Router } from 'express';

import { getAzureAdToken, ResourceId } from '../middleware/authorization/azure-ad';
import { currentUser, userRole } from '../middleware/user';
import { UserDb } from '../models/user';
import { NotFoundError } from '../not-found-error';
import { tryPromise } from '../tryPromise';

const JSON_PARSER = json();
const DB = new UserDb();
const USER_ADMIN = userRole('user-admin');

export const USERS_ROUTER = Router()

  // list all users
  .get('/', (req, res, next) => {
    tryPromise(next, async () => {
      res.status(200).json(await DB.list());
    });
  })

  // get current user
  .get('/@me', (req, res, next) => {
    const token = getAzureAdToken(res, ResourceId.graph);
    const { userId, familyName, givenName, isUserIdDisplayable, oid, tenantId } = token;
    tryPromise(next, async () => {
      if (!await DB.exists(userId)) {
        await DB.create({ id: userId });
      }
      const roles = await DB.roles(userId);
      res.status(200).json({ userId, givenName, familyName, isUserIdDisplayable, oid, tenantId, roles });

    });
  })

  // USER
  .use('/:user', Router({ mergeParams: true })

    // create a user
    .put('/', USER_ADMIN, JSON_PARSER, (req, res, next) => {
      const { user } = req.params;
      const { roles } = req.body;
      tryPromise(next, async () => {
        await DB.create({ id: user });
        if (roles && Array.isArray(roles)) {
          for (const role of roles) {
            await DB.addRole(user, role);
          }
        }
        res.status(201).end();
      });
    })

    // user exists?
    .use((req, res, next) => {
      const { user } = req.params;
      tryPromise(next, async () => {
        await DB.get(user);
        next();
      });
    })

    // get a user
    .get('/', (req, res, next) => {
      const { user } = req.params;
      res.status(200).json({ user });
    })

    // delete a user
    .delete('/', USER_ADMIN, (req, res, next) => {
      const { user } = req.params;
      tryPromise(next, async () => {
        await DB.remove(user);
        res.status(204).end();
      });
    })

    // USER ROLES
    .use('/roles', Router({ mergeParams: true })

      // get user roles
      .get('/', (req, res, next) => {
        const { user } = req.params;
        tryPromise(next, async () => {
          res.status(200).json(await DB.roles(user));
        });
      })

      // add user role
      .post('/', USER_ADMIN, JSON_PARSER, (req, res, next) => {
        const { user } = req.params;
        const { role } = req.body;
        tryPromise(next, async () => {
          await DB.addRole(user, role);
          res.status(201).end();
        });
      })

      // remove user role
      .delete('/:role', USER_ADMIN, JSON_PARSER, (req, res, next) => {
        const { user, role } = req.params;
        tryPromise(next, async () => {
          await DB.removeRole(user, role);
          res.status(204).end();
        });
      }))

    // USER CA
    .use('/ca', Router({ mergeParams: true })

      // list user CAs
      .get('/', (req, res, next) => {
        const { user } = req.params;
        tryPromise(next, async () => {
          res.status(200).json(await DB.certAuthorities(user));
        });
      })

      // USER CA
      .use('/:ca', Router({ mergeParams: true })

        // check CA for user
        .use((req, res, next) => {
          const { user, ca } = req.params;
          tryPromise(next, async () => {
            if (DB.hasCertAuthority(user, ca)) {
              next();
            } else {
              throw new NotFoundError('User does not have CA');
            }
          });
        })

        // list user CA certs
        .get('/', (req, res, next) => {
          const { user, ca } = req.params;
          tryPromise(next, async () => {
            res.status(200).json(await DB.certs(user, ca));
          });
        })

        // USER CA CERT
        .use('/:cert', Router({ mergeParams: true })

          // check CA/cert for user
          .use((req, res, next) => {
            const { user, ca, cert } = req.params;
            tryPromise(next, async () => {
              if (DB.hasCert(user, ca, cert)) {
                next();
              } else {
                throw new NotFoundError('User does not have CA cert');
              }
            });
          })

          .get('/', (req, res, next) => {
            const { user, ca, cert } = req.params;
            tryPromise(next, async () => {
              const fingerprint = await DB.fingerprint(user, ca, cert);
              res.status(200).json({ fingerprint });
            });
          })

          // export CA cert for user
          .post('/export', currentUser('user'), JSON_PARSER, (req, res, next) => {
            const { user, ca, cert } = req.params;
            const { password } = req.body;
            tryPromise(next, async () => {
              const headers = {
                'content-type': 'application/x-pkcs12',
                'content-disposition': `attachment; filename="${user}.p12"`,
              };
              const exported = await DB.exportCert(user, ca, cert, password);
              res.status(200).set(headers).send(exported);
            });
          }),
        )),
    ));
