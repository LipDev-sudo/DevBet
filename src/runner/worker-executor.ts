import { showValue, typeOfValue } from './describe';
import {
  RUN_LIMITS,
  type CodeExecutor,
  type ExecutionReport,
  type ExecutionRequest,
  type TestResult,
  type WorkerLike,
} from './types';

type ErrorInfo = { name: string; message: string; line?: number | null };

interface WorkerMessage {
  nonce?: string;
  type?: string;
  ok?: boolean;
  error?: ErrorInfo;
  result?: {
    index: number;
    passed: boolean;
    actualText: string;
    actualType: string;
    error?: ErrorInfo;
  };
  logs?: string[];
}

export interface WorkerExecutorOptions {
  /** Mantém um worker já inicializado esperando a próxima execução (esconde o tempo de carga). */
  prewarm?: boolean;
}

interface Session {
  worker: WorkerLike;
  nonce: string;
  ready: Promise<void>;
}

const SYNTAX_FAMILY = new Set(['SyntaxError', 'IndentationError', 'TabError']);

function newNonce(): string {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function pendingResult(test: ExecutionRequest['tests'][number]): TestResult {
  return {
    name: test.name,
    expr: test.expr,
    hidden: Boolean(test.hidden),
    passed: false,
    expectedText: showValue(test.expected),
    expectedType: typeOfValue(test.expected),
    actualText: '',
    actualType: 'null',
  };
}

/**
 * Executor que roda cada execução num worker com interpretador Python novo (estado limpo) e o
 * encerra ao terminar ou ao estourar o tempo. Recebe uma fábrica de workers, o que o mantém testável.
 * O limite de tempo só começa depois que o interpretador está pronto.
 */
export function createWorkerExecutor(
  createWorker: () => WorkerLike,
  options: WorkerExecutorOptions = {},
): CodeExecutor {
  let warm: Session | null = null;

  function startSession(): Session {
    const worker = createWorker();
    const nonce = newNonce();
    const ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('O interpretador Python demorou demais para iniciar.')),
        RUN_LIMITS.loadTimeoutMs,
      );
      worker.onmessage = (event) => {
        const data = event.data as WorkerMessage | null;
        if (!data || data.nonce !== nonce) return;
        if (data.type === 'ready') {
          clearTimeout(timer);
          resolve();
        } else if (data.type === 'failed') {
          clearTimeout(timer);
          reject(new Error(data.error?.message ?? 'Falha ao iniciar o interpretador.'));
        }
      };
      worker.onerror = () => {
        clearTimeout(timer);
        reject(new Error('O interpretador encontrou um erro inesperado.'));
      };
    });
    ready.catch(() => undefined); // o erro é tratado em run(); evita rejeição não tratada
    worker.postMessage({ type: 'init', nonce });
    return { worker, nonce, ready };
  }

  function replenish() {
    if (!options.prewarm) return;
    try {
      warm = startSession();
    } catch {
      warm = null;
    }
  }

  return {
    warmUp() {
      if (warm) return;
      replenish();
    },

    dispose() {
      warm?.worker.terminate();
      warm = null;
    },

    run(request: ExecutionRequest): Promise<ExecutionReport> {
      const timeoutMs = request.timeoutMs ?? RUN_LIMITS.timeoutMs;
      const results = request.tests.map(pendingResult);
      const received = new Set<number>();
      let started = Date.now();

      const finish = (
        status: ExecutionReport['status'],
        extra: Partial<ExecutionReport> = {},
      ): ExecutionReport => ({
        status,
        tests: results,
        logs: [],
        durationMs: Date.now() - started,
        ...extra,
      });

      if (request.code.length > RUN_LIMITS.maxCodeLength) {
        return Promise.resolve(
          finish('rejected', {
            error: {
              name: 'LimitError',
              message: `Seu código tem mais de ${RUN_LIMITS.maxCodeLength} caracteres.`,
            },
          }),
        );
      }

      return new Promise((resolve) => {
        let session: Session;
        try {
          session = warm ?? startSession();
          warm = null;
        } catch (error) {
          resolve(
            finish('crash', {
              error: { name: 'WorkerError', message: String((error as Error).message ?? error) },
            }),
          );
          return;
        }

        let settled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const settle = (report: ExecutionReport) => {
          if (settled) return;
          settled = true;
          if (timer) clearTimeout(timer);
          session.worker.terminate();
          replenish();
          resolve(report);
        };

        session.ready.then(
          () => {
            started = Date.now();
            timer = setTimeout(() => {
              const firstPending = results.findIndex((_, i) => !received.has(i));
              for (const [index, result] of results.entries()) {
                if (received.has(index)) continue;
                // O primeiro teste sem resposta é o que travou; os seguintes nem começaram.
                if (index === firstPending) result.timedOut = true;
                else result.skipped = true;
              }
              settle(
                finish('timeout', {
                  error: {
                    name: 'TimeoutError',
                    message: `O código passou de ${timeoutMs} ms sem terminar.`,
                  },
                }),
              );
            }, timeoutMs);

            session.worker.onmessage = (event) => {
              const data = event.data as WorkerMessage | null;
              // Ignora mensagens forjadas pelo código do jogador (sem o nonce).
              if (!data || data.nonce !== session.nonce) return;
              if (data.type === 'compile' && data.ok === false) {
                for (const result of results) result.skipped = true;
                const error = data.error;
                const status =
                  error?.name === 'LimitError'
                    ? 'rejected'
                    : error && SYNTAX_FAMILY.has(error.name)
                      ? 'syntax-error'
                      : 'crash';
                settle(finish(status, { error }));
              } else if (data.type === 'test' && data.result) {
                const { index, passed, actualText, actualType, error } = data.result;
                const target = results[index];
                if (!target || received.has(index)) return;
                received.add(index);
                Object.assign(target, { passed, actualText, actualType, error });
              } else if (data.type === 'done') {
                const logs = Array.isArray(data.logs) ? data.logs.slice(0, 30) : [];
                settle(finish('ok', { logs }));
              }
            };
            session.worker.onerror = () => {
              settle(
                finish('crash', {
                  error: {
                    name: 'WorkerError',
                    message: 'O executor encontrou um erro inesperado.',
                  },
                }),
              );
            };

            session.worker.postMessage({
              type: 'run',
              nonce: session.nonce,
              code: request.code,
              tests: request.tests.map((test) => ({ expr: test.expr, expected: test.expected })),
            });
          },
          (error: Error) => {
            settle(
              finish('crash', {
                error: { name: 'InitError', message: error.message },
              }),
            );
          },
        );
      });
    },
  };
}
