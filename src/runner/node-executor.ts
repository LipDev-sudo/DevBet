/**
 * Executor para testes (Node): roda o MESMO arquivo de runner usado no navegador dentro de um
 * worker_thread, que pode ser encerrado à força. Não é usado em produção.
 */
import { Worker } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createWorkerExecutor } from './worker-executor';
import type { CodeExecutor, WorkerLike } from './types';

const RUNNER_SOURCE = readFileSync(
  path.join(process.cwd(), 'public', 'sandbox', 'runner.worker.js'),
  'utf8',
);
const PYODIDE_DIR = path.join(process.cwd(), 'node_modules', 'pyodide') + path.sep;
const PYODIDE_MODULE = pathToFileURL(path.join(PYODIDE_DIR, 'pyodide.mjs')).href;

const BOOTSTRAP = `
const { parentPort, workerData } = require('node:worker_threads');
// Imita o escopo de um Web Worker: o runner opera sobre o próprio globalThis do worker_thread.
globalThis.postMessage = (message) => parentPort.postMessage(message);
globalThis.self = globalThis;
globalThis.__devbetLoadPyodide = async () => {
  const { loadPyodide } = await import(workerData.pyodide);
  return loadPyodide({ indexURL: workerData.indexURL });
};
new Function('module', workerData.source)(undefined);
parentPort.on('message', (data) => globalThis.onmessage && globalThis.onmessage({ data }));
`;

function createNodeWorker(): WorkerLike {
  const worker = new Worker(BOOTSTRAP, {
    eval: true,
    workerData: { source: RUNNER_SOURCE, pyodide: PYODIDE_MODULE, indexURL: PYODIDE_DIR },
  });
  const like: WorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage: (message) => worker.postMessage(message),
    terminate: () => void worker.terminate(),
  };
  worker.on('message', (data) => like.onmessage?.({ data }));
  worker.on('error', (error) => like.onerror?.(error));
  return like;
}

export function createNodeExecutor(): CodeExecutor {
  // `prewarm` esconde o tempo de carga do Python entre execuções; chame `dispose()` ao terminar.
  return createWorkerExecutor(createNodeWorker, { prewarm: true });
}
