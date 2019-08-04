export async function tryPromise(onError: (...arg: any[]) => any, fn: () => Promise<any>) {
  try {
    await fn();
  } catch (err) {
    onError(err);
  }
}
