import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserIdentity } from 'common';

@Injectable({
  providedIn: 'root'
})
export class BackendService {

  constructor(private http: HttpClient) { }

  me() {
    return this.http.get<UserIdentity>('/api/users/@me');
  }

  certificateAuthorities() {
    return this.http.get<string[]>('/api/ca');
  }

  users() {
    return this.http.get<string[]>('/api/users');
  }

  addUser(id: string, roles?: string[]) {
    return this.http.put(`/api/users/${id}`, roles);
  }

  certificateAuthoritiesForUser(userId: string) {
    return this.http.get<string[]>(`/api/users/${userId}/ca`);
  }
}
