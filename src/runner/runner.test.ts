import { afterAll, describe, expect, it } from 'vitest';
import { checkRunAllowed } from './guard';
import { createNodeExecutor } from './node-executor';
import { showValue } from './describe';
import { RUN_LIMITS } from './types';
import { createWorkerExecutor } from './worker-executor';
import type { WorkerLike } from './types';

const executor = createNodeExecutor();
afterAll(() => executor.dispose?.());

const tests = [
  { name: 'dobro de 2', expr: 'dobro(2)', expected: 4 },
  { name: 'dobro de -3', expr: 'dobro(-3)', expected: -6, hidden: true },
];
const DOBRO = 'def dobro(n):\n    return n * 2\n';

describe('repr de valores esperados (sintaxe Python)', () => {
  it('mostra None, True/False, listas e dicionários como Python', () => {
    expect(showValue(null)).toBe('None');
    expect(showValue(true)).toBe('True');
    expect(showValue([1, 'a', null])).toBe("[1, 'a', None]");
    expect(showValue({ a: 1, b: [false] })).toBe("{'a': 1, 'b': [False]}");
    expect(showValue("it's")).toBe('"it\'s"');
  });
});

describe('executor Python em worker', () => {
  it('aprova código correto', async () => {
    const report = await executor.run({ code: DOBRO, tests });
    expect(report.status).toBe('ok');
    expect(report.tests.map((t) => t.passed)).toEqual([true, true]);
  });

  it('reprova mostrando valor recebido e esperado em formato Python', async () => {
    const report = await executor.run({ code: 'def dobro(n):\n    return n + 1\n', tests });
    expect(report.tests[0]).toMatchObject({ passed: false, actualText: '3', expectedText: '4' });
    expect(report.tests[1]).toMatchObject({ passed: false, actualText: '-2', expectedText: '-6' });
  });

  it('detecta erro de sintaxe com a linha', async () => {
    const report = await executor.run({ code: 'def dobro(n)\n    return n * 2\n', tests });
    expect(report.status).toBe('syntax-error');
    expect(report.error).toMatchObject({ name: 'SyntaxError', line: 1 });
    expect(report.tests.every((t) => t.skipped)).toBe(true);
  });

  it('detecta erro de indentação como sintaxe', async () => {
    const report = await executor.run({ code: 'def dobro(n):\nreturn n * 2\n', tests });
    expect(report.status).toBe('syntax-error');
    expect(report.error?.name).toBe('IndentationError');
  });

  it('reporta função inexistente como NameError', async () => {
    const report = await executor.run({ code: 'x = 1\n', tests });
    expect(report.tests[0]?.error?.name).toBe('NameError');
  });

  it('reporta a linha de erros em tempo de execução', async () => {
    const report = await executor.run({
      code: 'def dobro(n):\n    x = 1 / 0\n    return n\n',
      tests,
    });
    expect(report.tests[0]?.error).toMatchObject({ name: 'ZeroDivisionError', line: 2 });
  });

  it('captura print() sem vazar para o processo', async () => {
    const report = await executor.run({
      code: 'def dobro(n):\n    print("n =", n)\n    return n * 2\n',
      tests,
    });
    expect(report.logs).toContain('n = 2');
  });

  it('mata loops infinitos pelo timeout', async () => {
    const started = Date.now();
    const report = await executor.run({
      code: 'def dobro(n):\n    while True:\n        pass\n',
      tests,
      timeoutMs: 400,
    });
    expect(report.status).toBe('timeout');
    expect(report.tests[0]?.timedOut).toBe(true);
    expect(report.tests[1]?.skipped).toBe(true);
    expect(Date.now() - started).toBeLessThan(10_000);
  });

  it('preserva testes já concluídos quando um posterior trava', async () => {
    const report = await executor.run({
      code: 'def dobro(n):\n    if n < 0:\n        while True:\n            pass\n    return n * 2\n',
      tests,
      timeoutMs: 400,
    });
    expect(report.tests[0]?.passed).toBe(true);
    expect(report.tests[1]?.timedOut).toBe(true);
  });

  it('recursão infinita vira RecursionError, não trava o executor', async () => {
    const report = await executor.run({
      code: 'def dobro(n):\n    return dobro(n)\n',
      tests,
      timeoutMs: 5000,
    });
    expect(report.tests[0]?.error?.name).toBe('RecursionError');
  });

  it('cada execução começa com estado limpo', async () => {
    await executor.run({ code: 'segredo = 42\ndef dobro(n):\n    return n\n', tests });
    const report = await executor.run({
      code: 'def dobro(n):\n    return segredo\n',
      tests,
    });
    expect(report.tests[0]?.error?.name).toBe('NameError');
  });

  it('rejeita código acima do limite sem executar', async () => {
    const report = await executor.run({ code: 'x' + ' '.repeat(RUN_LIMITS.maxCodeLength), tests });
    expect(report.status).toBe('rejected');
  });

  it('distingue bool de int e lista de tupla ao comparar', async () => {
    const report = await executor.run({
      code: 'def a():\n    return True\ndef b():\n    return (1, 2)\n',
      tests: [
        { name: 'bool', expr: 'a()', expected: 1 },
        { name: 'tupla', expr: 'b()', expected: [1, 2] },
      ],
    });
    expect(report.tests.map((t) => t.passed)).toEqual([false, false]);
    expect(report.tests[1]?.actualType).toBe('tuple');
  });

  it('ignora mensagens sem o nonce correto', async () => {
    const forging: () => WorkerLike = () => {
      const worker: WorkerLike = {
        onmessage: null,
        onerror: null,
        terminate: () => undefined,
        postMessage: () => {
          worker.onmessage?.({ data: { nonce: 'forjado', type: 'ready' } });
          worker.onmessage?.({ data: { type: 'ready' } });
        },
      };
      return worker;
    };
    const original = RUN_LIMITS.loadTimeoutMs;
    (RUN_LIMITS as { loadTimeoutMs: number }).loadTimeoutMs = 150;
    try {
      const report = await createWorkerExecutor(forging).run({ code: DOBRO, tests });
      expect(report.status).toBe('crash');
    } finally {
      (RUN_LIMITS as { loadTimeoutMs: number }).loadTimeoutMs = original;
    }
  });

  it('trata falha ao criar o worker', async () => {
    const report = await createWorkerExecutor(() => {
      throw new Error('sem worker');
    }).run({ code: 'x = 1', tests });
    expect(report.status).toBe('crash');
  });
});

describe('isolamento do código Python', () => {
  async function probe(body: string) {
    const report = await executor.run({
      code: `def sonda():\n${body
        .split('\n')
        .map((l) => `    ${l}`)
        .join('\n')}\n`,
      tests: [{ name: 'sonda', expr: 'sonda()', expected: 'ok' }],
    });
    return report.tests[0];
  }

  it.each([
    ['import js', 'ImportError'],
    ['import os', 'ImportError'],
    ['import sys', 'ImportError'],
    ['import subprocess', 'ImportError'],
    ['from pyodide.http import pyfetch', 'ImportError'],
    ["open('/etc/passwd')", 'NameError'],
    ["eval('1+1')", 'NameError'],
    ["exec('x=1')", 'NameError'],
    ["__import__('os')", 'ImportError'],
    ['input()', 'RuntimeError'],
  ])('bloqueia %s', async (code, errorName) => {
    const result = await probe(code);
    expect(result?.passed).toBe(false);
    expect(result?.error?.name).toBe(errorName);
  });

  it('permite módulos seguros como math', async () => {
    const result = await probe('import math\nreturn "ok" if math.sqrt(9) == 3 else "no"');
    expect(result?.passed).toBe(true);
  });

  it('lista as APIs de rede bloqueadas no worker', async () => {
    const { createRequire } = await import('node:module');
    const core = createRequire(import.meta.url)('../../public/sandbox/runner.worker.js') as {
      BLOCKED_GLOBALS: string[];
    };
    for (const required of ['fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts']) {
      expect(core.BLOCKED_GLOBALS).toContain(required);
    }
  });
});

describe('guarda de execuções', () => {
  const base = { kind: 'run' as const, code: 'x', runsUsed: 0, lastRunAt: null, now: 10_000 };
  const max = RUN_LIMITS.maxRunsPerChallenge;
  it('aceita uso normal', () => expect(checkRunAllowed(base)).toBeNull());
  it('recusa código vazio', () => expect(checkRunAllowed({ ...base, code: '  ' })).toBe('empty'));
  it('recusa código grande', () =>
    expect(checkRunAllowed({ ...base, code: 'a'.repeat(RUN_LIMITS.maxCodeLength + 1) })).toBe(
      'too-long',
    ));
  it('aplica cooldown', () =>
    expect(checkRunAllowed({ ...base, lastRunAt: 9_900 })).toBe('cooldown'));

  it('Executar: a 59ª e a 60ª execuções passam; a 61ª é recusada', () => {
    expect(checkRunAllowed({ ...base, runsUsed: max - 2 })).toBeNull(); // vai fazer a 59ª
    expect(checkRunAllowed({ ...base, runsUsed: max - 1 })).toBeNull(); // vai fazer a 60ª
    expect(checkRunAllowed({ ...base, runsUsed: max })).toBe('too-many-runs'); // tentaria a 61ª
    expect(checkRunAllowed({ ...base, runsUsed: max + 10 })).toBe('too-many-runs');
  });

  it('Entregar nunca é bloqueado pelo total de execuções (sem soft-lock)', () => {
    for (const runsUsed of [max - 1, max, max + 1, 10_000]) {
      expect(checkRunAllowed({ ...base, kind: 'submit', runsUsed })).toBeNull();
    }
  });

  it('Entregar continua respeitando só recusas temporárias', () => {
    const submit = { ...base, kind: 'submit' as const, runsUsed: max };
    expect(checkRunAllowed({ ...submit, code: '' })).toBe('empty');
    expect(checkRunAllowed({ ...submit, lastRunAt: 9_900 })).toBe('cooldown');
    expect(checkRunAllowed({ ...submit, lastRunAt: 9_000 })).toBeNull(); // passado o cooldown, entrega
  });
});
