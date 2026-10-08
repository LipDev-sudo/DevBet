import { afterAll, describe, expect, it } from 'vitest';
import { BOSS_CHALLENGE, getChallenge } from '@/content/challenges';
import { createNodeExecutor } from '@/runner/node-executor';
import { buildFeedback, UNAVAILABLE_BUILTINS } from './feedback';

const executor = createNodeExecutor();
afterAll(() => executor.dispose?.());
const challenge = getChallenge('calcular-total');

async function feedbackFor(code: string, failures = 1, c = challenge) {
  const report = await executor.run({ code, tests: c.tests, timeoutMs: 400 });
  return buildFeedback(c, report, failures);
}

describe('feedback educativo', () => {
  it('explica o erro e só libera a solução depois de várias tentativas', async () => {
    const code = 'def calcular_total(a, b, c):\n    return a + b - c';
    const first = await feedbackFor(code, 1);
    const fourth = await feedbackFor(code, 4);
    expect(first.title).toMatch(/diferente/i);
    expect(first.cause).toContain('esperávamos');
    expect(first.canViewSolution).toBe(false);
    expect(fourth.canViewSolution).toBe(true);
  });

  it('avisa quando falta return', async () => {
    const fb = await feedbackFor('def calcular_total(a, b, c):\n    a * b - c');
    expect(fb.title).toMatch(/None/);
    expect(fb.cause).toContain('return');
  });

  it('explica erro de sintaxe', async () => {
    const fb = await feedbackFor('def calcular_total(a, b, c)\n    return 1');
    expect(fb.title).toMatch(/SyntaxError/);
    expect(fb.title).toMatch(/linha 1/);
    expect(fb.cause).toMatch(/\`:\`/);
  });

  it('explica função com nome errado', async () => {
    const fb = await feedbackFor('def total(a, b, c):\n    return 1');
    expect(fb.title).toBe('Função não encontrada');
  });

  it('explica tipo diferente', async () => {
    const fb = await feedbackFor('def calcular_total(a, b, c):\n    return "x"');
    expect(fb.title).toMatch(/Tipo/);
  });

  it('identifica loop infinito no boss', async () => {
    const fb = await feedbackFor(BOSS_CHALLENGE.starterCode, 1, BOSS_CHALLENGE);
    expect(fb.title).toBe('Seu código travou');
    expect(fb.cause).toMatch(/loop infinito/);
  });

  it('nunca devolve apenas "errado": a causa tem conteúdo', async () => {
    const fb = await feedbackFor('def calcular_total(a, b, c):\n    return 1');
    expect(fb.cause.length).toBeGreaterThan(20);
  });

  it('traduz erros de indentação e nomes inexistentes com a linha', async () => {
    const indent = await feedbackFor('def calcular_total(a, b, c):\nreturn 1');
    expect(indent.title).toMatch(/IndentationError/);
    expect(indent.cause).toMatch(/indentação/);
    const name = await feedbackFor('def calcular_total(a, b, c):\n    return preco * b');
    expect(name.title).toMatch(/Nome não definido \(linha 2\)/);
  });

  it('explica ZeroDivisionError e índice fora da lista', async () => {
    const zero = await feedbackFor('def calcular_total(a, b, c):\n    return a / 0');
    expect(zero.title).toMatch(/Divisão por zero/);
    const index = await feedbackFor('def calcular_total(a, b, c):\n    return [][3]');
    expect(index.title).toMatch(/Índice fora da lista/);
  });

  it('funções reais do Python que o sandbox bloqueia não viram "corrija o nome digitado"', async () => {
    for (const name of ['open', 'getattr', 'breakpoint']) {
      const feedback = await feedbackFor(`def calcular_total(a, b, c):\n    return ${name}`);
      expect(feedback.title, name).toMatch(/Recurso indisponível/);
      expect(feedback.cause, name).toContain(`\`${name}\` existe no Python`);
      expect(feedback.cause).not.toMatch(/corrija o nome digitado/);
    }
    // Um nome que realmente não existe continua sendo erro de digitação.
    const typo = await feedbackFor('def calcular_total(a, b, c):\n    return qtd');
    expect(typo.title).toMatch(/Nome não definido/);
  });

  it('a lista de recursos indisponíveis bate com o sandbox: nenhum deles está de fato disponível', async () => {
    const probes = [...UNAVAILABLE_BUILTINS]
      .map(
        (name) =>
          `    try:\n        ${name}\n        livres.append('${name}')\n    except NameError:\n        pass`,
      )
      .join('\n');
    const report = await executor.run({
      code: `def calcular_total(a, b, c):\n    livres = []\n${probes}\n    return livres`,
      tests: [{ name: 't', expr: 'calcular_total(1, 2, 3)', expected: [] }],
      timeoutMs: 5000,
    });
    expect(report.tests[0]?.passed, JSON.stringify(report.tests[0])).toBe(true);
  });

  it('o erro de import bloqueado não termina com ponto duplicado', async () => {
    const feedback = await feedbackFor('import os\ndef calcular_total(a, b, c):\n    return 1');
    expect(feedback.title).toBe('Módulo indisponível');
    expect(feedback.cause).not.toContain('..');
  });
});
