import { RequestError } from '../request-error';

export function throwIfEmpty(val: any, name: string) {
  if (!val) {
    throw new RequestError(`Missing input value: ${name}`);
  }
}
