import { createWorkerExecutor } from './worker-executor';
import type { CodeExecutor, WorkerLike } from './types';

export const SANDBOX_WORKER_URL = '/sandbox/runner.worker.js';

/** Executor de produção: Web Worker dedicado com Python (Pyodide), servido com CSP restrita. */
export function createBrowserExecutor(): CodeExecutor {
  return createWorkerExecutor(() => new Worker(SANDBOX_WORKER_URL) as unknown as WorkerLike, {
    prewarm: true,
  });
}
