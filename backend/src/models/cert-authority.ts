import { CertAuthority, Issued } from 'common';
import { mkdir, mkdirp, pathExists, readdir, readFile, writeFile } from 'fs-extra';
import rimraf from 'rimraf';

import { ConflictError } from '../conflict-error';
import { NotFoundError } from '../not-found-error';
import { exec } from './exec';
import { throwIfEmpty } from './throw';

export class CertAuthorityDb {
  async list() {
    await this.init();
    return await readdir('data/ca');
  }

  async get(id: string) {
    throwIfEmpty(id, 'id');
    await this.init();
    try {
      await readdir(`data/ca/${id}`);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError('CA not found');
      } else {
        throw err;
      }
    }
  }

  async remove(id: string) {
    throwIfEmpty(id, 'id');
    await this.init();
    await new Promise<void>((resolve, reject) => {
      rimraf(`data/ca/${id}`, (err: any) => {
        if (err) {
          if (err.code === 'ENOENT') {
            reject(new NotFoundError('CA not found'));
          } else {
            reject(err);
          }
        } else {
          resolve();
        }
      });
    });
  }

  async create(ca: CertAuthority) {
    throwIfEmpty(ca, 'CertAuthority');
    throwIfEmpty(ca.id, 'ca.id');
    await this.init();
    try {
      await mkdir(`data/ca/${ca.id}`);
      await mkdir(`data/ca/${ca.id}/certs`);
      const key = await exec('ipsec pki --gen --outform pem');
      await writeFile(`data/ca/${ca.id}/key.pem`, key);
    } catch (err) {
      if (err.code === 'EEXIST') {
        throw new ConflictError('CA exists');
      } else {
        throw err;
      }
    }
  }

  async certs(id: string) {
    throwIfEmpty(id, 'id');
    await this.init();
    return await readdir(`data/ca/${id}/certs`);
  }

  async addCert(ca: string, name: string) {
    throwIfEmpty(ca, 'ca');
    throwIfEmpty(name, 'name');
    await this.init();
    await mkdir(`data/ca/${ca}/certs/${name}`);
    const keyPath = `data/ca/${ca}/key.pem`;
    const cert = await exec(`ipsec pki --self --in ${keyPath} --dn "CN=${ca}" --ca --outform pem`);
    await writeFile(`data/ca/${ca}/certs/${name}/cert.pem`, cert);
  }

  hasCert(ca: string, name: string) {
    return pathExists(`data/ca/${ca}/certs/${name}`);
  }

  async issueUserCert(ca: string, cert: string, user: string) {
    throwIfEmpty(ca, 'ca');
    throwIfEmpty(cert, 'cert');
    throwIfEmpty(user, 'user');
    const userCertPath = `data/users/${user}/ca/${ca}/${cert}/cert.pem`;
    const userKeyPath = `data/users/${user}/key.pem`;
    const caCertPath = `data/ca/${ca}/certs/${cert}/cert.pem`;
    const caKeyPath = `data/ca/${ca}/key.pem`;
    const userCert = await exec(`ipsec pki --pub --in ${userKeyPath} \
      | ipsec pki --issue --cacert ${caCertPath} --cakey ${caKeyPath} --dn "CN=${user}" --san "${user}" --flag clientAuth --outform pem`);
    await mkdirp(`data/users/${user}/ca/${ca}`);
    await mkdir(`data/users/${user}/ca/${ca}/${cert}`);
    await writeFile(userCertPath, userCert);
    const fingerprint = (await exec(`openssl x509 -in ${userCertPath} -fingerprint -noout`)).trim();
    const issued = await this.issued(ca, cert);
    issued.push({ user, fingerprint });
    await writeFile(`data/ca/${ca}/certs/${cert}/issued.json`, JSON.stringify(issued));
  }

  async issued(ca: string, cert: string) {
    throwIfEmpty(ca, 'ca');
    throwIfEmpty(cert, 'cert');
    await this.init();
    try {
      const data = await readFile(`data/ca/${ca}/certs/${cert}/issued.json`, 'utf8');
      return JSON.parse(data) as Issued[];
    } catch (err) {
      if (err.code === 'ENOENT') {
        return [];
      }
    }
  }

  async publicCert(ca: string, name: string) {
    throwIfEmpty(ca, 'ca');
    throwIfEmpty(name, 'name');
    await this.init();
    const certPath = `data/ca/${ca}/certs/${name}/cert.pem`;
    if (!await pathExists(certPath)) {
      throw new NotFoundError('Cert not found');
    }
    const pub = await exec(`openssl x509 -in ${certPath} -outform der | base64`);
    return pub.trim();
  }

  private async init() {
    await mkdirp('data/ca');
  }
}
