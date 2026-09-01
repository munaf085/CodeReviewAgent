export function makeLimit(concurrency: number) {
  let activeCount = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      activeCount++;
      const resolve = queue.shift();
      if (resolve) resolve();
    }
  };

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (activeCount >= concurrency) {
      await new Promise<void>(resolve => queue.push(resolve));
    }
    activeCount++;
    try {
      return await fn();
    } finally {
      next();
    }
  };
}
