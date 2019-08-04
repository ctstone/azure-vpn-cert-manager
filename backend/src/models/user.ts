import { mkdir, mkdirp, pathExists, readdir, readFile, unlink, writeFile } from 'fs-extra';
import rimraf from 'rimraf';

import { ConflictError } from '../conflict-error';
import { NotFoundError } from '../not-found-error';
import { exec } from './exec';
import { throwIfEmpty } from './throw';

export interface User {
  id: string;
}

export class UserDb {

  async list() {
    await this.init();
    return await readdir('data/users');
  }

  async get(id: string) {
    throwIfEmpty(id, 'id');
    await this.init();
    try {
      await readdir(`data/users/${id}`);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError('User not found');
      } else {
        throw err;
      }
    }
  }

  async remove(id: string) {
    throwIfEmpty(id, 'id');
    await this.init();
    await new Promise<void>((resolve, reject) => {
      rimraf(`data/users/${id}`, (err: any) => {
        if (err) {
          if (err.code === 'ENOENT') {
            reject(new NotFoundError('User not found'));
          } else {
            reject(err);
          }
        } else {
          resolve();
        }
      });
    });
  }

  async create(user: User) {
    throwIfEmpty(user, 'User');
    throwIfEmpty(user.id, 'user.id');
    await this.init();
    try {
      await mkdir(`data/users/${user.id}`);
      await mkdir(`data/users/${user.id}/certs`);
      const key = await exec('ipsec pki --gen --outform pem');
      await writeFile(`data/users/${user.id}/key.pem`, key);
    } catch (err) {
      if (err.code === 'EEXIST') {
        throw new ConflictError('User exists');
      } else {
        throw err;
      }
    }
  }

  async roles(id: string) {
    throwIfEmpty(id, 'id');
    await this.init();
    try {
      const data = await readFile(`data/users/${id}/roles.json`, 'utf8');
      return JSON.parse(data) as string[];
    } catch (err) {
      if (err.code === 'ENOENT') {
        return [];
      }
    }
  }

  async addRole(id: string, role: string) {
    throwIfEmpty(id, 'id');
    throwIfEmpty(role, 'role');
    await this.init();
    const roles = await this.roles(id);
    if (roles.includes(role)) {
      throw new ConflictError('User already has role');
    }
    roles.push(role);
    await writeFile(`data/users/${id}/roles.json`, JSON.stringify(roles));
  }

  async removeRole(id: string, role: string) {
    throwIfEmpty(id, 'id');
    throwIfEmpty(role, 'role');
    await this.init();
    const roles = await this.roles(id);
    const i = roles.indexOf(role);
    if (i === -1) {
      throw new NotFoundError('User does not have role');
    }
    roles.splice(i, 1);
    await writeFile(`data/users/${id}/roles.json`, JSON.stringify(roles));
  }

  async hasCertAuthority(user: string, ca: string) {
    return await pathExists(`data/users/${user}/ca/${ca}`);
  }

  async hasCert(user: string, ca: string, cert: string) {
    return await pathExists(`data/users/${user}/ca/${ca}/${cert}`);
  }

  async certAuthorities(user: string) {
    return await readdir(`data/users/${user}/ca`);
  }

  async certs(user: string, ca: string) {
    return await readdir(`data/users/${user}/ca/${ca}`);
  }

  async exportCert(user: string, ca: string, cert: string, password: string) {
    throwIfEmpty(user, 'user');
    throwIfEmpty(ca, 'ca');
    throwIfEmpty(cert, 'cert');
    throwIfEmpty(password, 'password');
    const userCertPath = `data/users/${user}/ca/${ca}/${cert}/cert.pem`;
    const userKeyPath = `data/users/${user}/key.pem`;
    const userExportPath = `data/users/${user}/ca/${ca}/${cert}/cert.p12`;
    const caCertPath = `data/ca/${ca}/certs/${cert}/cert.pem`;
    await exec(`openssl pkcs12 -in ${userCertPath} -inkey ${userKeyPath} -certfile ${caCertPath} -export -out ${userExportPath} -password "pass:${password}"`);
    const exportedCert = readFile(userExportPath);
    await unlink(userExportPath);
    return exportedCert;
  }

  async fingerprint(user: string, ca: string, cert: string) {
    const userCertPath = `data/users/${user}/ca/${ca}/${cert}/cert.pem`;
    return (await exec(`openssl x509 -in ${userCertPath} -fingerprint -noout`)).trim();
  }

  private async init() {
    await mkdirp('data/users');
  }

  // show fingerprint
  // openssl x509 -in users/chstoneCert.pem -fingerprint -noout
}
