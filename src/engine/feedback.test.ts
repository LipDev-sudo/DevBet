import { afterAll, describe, expect, it } from 'vitest';
import { BOSS_CHALLENGE, getChallenge } from '@/content/challenges';
import { createNodeExecutor } from '@/runner/node-executor';
import { buildFeedback } from './feedback';

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
});
