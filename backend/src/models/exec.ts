import { exec as exec_ } from 'child_process';

export function exec(command: string) {
  return new Promise<string>((resolve, reject) => {
    exec_(command, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr));
      } else {
        resolve(stdout);
      }
    });
  });
}
