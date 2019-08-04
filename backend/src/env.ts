export type Env
  = 'SERVICE_ID'
  | 'SERVICE_PASSWORD'
  | 'SERVICE_TENANT'
  | 'APP_ID'
  | 'APP_PASSWORD'
  | 'MONGO_RESOURCE_ID'
  | 'MONGO_DB'
  | 'MONGO_CONNECTION_STRING'
  ;

export type EnvOptional
  = 'MODE'
  | 'SESSION_SECRET'
  | 'SESSION_TTL'
  | 'PORT'
  | 'AUTH_TOKEN'
  | 'APP_TENANT'
  ;

export function env(name: Env | EnvOptional, defaultValue?: string): string {
  if (!process.env.hasOwnProperty(name) && defaultValue === undefined) {
    throw new Error(`Missing required environment variable '${name}'`);
  } else if (process.env[name] === undefined) {
    return defaultValue;
  } else {
    return process.env[name];
  }
}
