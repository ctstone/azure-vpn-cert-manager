export interface User {
  id: string;
}

export interface CertAuthority {
  id: string;
}

export interface Issued {
  user: string;
  fingerprint: string;
}

export interface UserIdentity {
  userId: string;
  givenName: string;
  familyName: string;
  oid: string;
  tenant: string;
  roles: string[];
}
