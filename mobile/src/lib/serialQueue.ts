export interface SerialQueue {
  run<T>(task: () => Promise<T>): Promise<T>;
}

/**
 * Creates a FIFO promise queue that runs async tasks strictly one at a time.
 * If a task rejects, its returned promise rejects for the caller while the
 * queue continues processing subsequent tasks.
 */
export function createSerialQueue(): SerialQueue {
  let tail: Promise<unknown> = Promise.resolve();

  function run<T>(task: () => Promise<T>): Promise<T> {
    const next = tail.then(() => task());
    tail = next.catch(() => {});
    return next;
  }

  return { run };
}
