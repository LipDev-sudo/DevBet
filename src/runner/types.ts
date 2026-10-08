import type { TestCase } from '@/engine/challenge';

/** Limites aplicados a toda execução de código do jogador. */
export const RUN_LIMITS = {
  /** Tempo máximo (ms) para compilar e rodar todos os testes. */
  timeoutMs: 1500,
  /** Tempo máximo (ms) para iniciar o interpretador Python (não conta no limite acima). */
  loadTimeoutMs: 30_000,
  /** Tamanho máximo do código, em caracteres. */
  maxCodeLength: 4000,
  /** Execuções de teste (Executar) por desafio. Entregar não é limitado por este total. */
  maxRunsPerChallenge: 60,
  /** Intervalo mínimo entre execuções (ms). */
  cooldownMs: 600,
} as const;

export interface ExecutionRequest {
  code: string;
  tests: readonly TestCase[];
  timeoutMs?: number;
}

export interface TestResult {
  name: string;
  expr: string;
  hidden: boolean;
  passed: boolean;
  expectedText: string;
  expectedType: string;
  actualText: string;
  actualType: string;
  error?: { name: string; message: string; line?: number | null };
  /** O teste não terminou dentro do limite de tempo. */
  timedOut?: boolean;
  /** O teste nem chegou a rodar (execução interrompida antes). */
  skipped?: boolean;
}

export type ExecutionStatus = 'ok' | 'syntax-error' | 'timeout' | 'crash' | 'rejected';

export interface ExecutionReport {
  status: ExecutionStatus;
  tests: TestResult[];
  logs: string[];
  /** Erro de compilação ou do próprio executor. */
  error?: { name: string; message: string; line?: number | null };
  durationMs: number;
}

/** Fronteira entre o jogo e quem executa o código. Troque a implementação para usar um sandbox remoto. */
export interface CodeExecutor {
  run(request: ExecutionRequest): Promise<ExecutionReport>;
  /** Prepara o interpretador em segundo plano, para a próxima execução começar na hora. */
  warmUp?(): void;
  /** Encerra qualquer worker em espera. */
  dispose?(): void;
}

/** Subconjunto de `Worker` usado pelo executor, para permitir outras implementações em testes. */
export interface WorkerLike {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}
