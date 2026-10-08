import { afterAll, describe, expect, it } from 'vitest';
import { createNodeExecutor } from '@/runner/node-executor';
import { AREAS } from './areas';
import { CARDS } from '@/engine/cards';
import { COMBOS } from '@/engine/combos';
import { ALL_CHALLENGES, BOSS_CHALLENGE, CHALLENGES, getChallenge } from './challenges';

const executor = createNodeExecutor();
afterAll(() => executor.dispose?.());

describe('conteúdo dos desafios', () => {
  it('tem desafios regulares suficientes e 1 boss, com ids únicos', () => {
    expect(CHALLENGES.length).toBeGreaterThanOrEqual(10);
    expect(BOSS_CHALLENGE.boss).toBe(true);
    expect(new Set(ALL_CHALLENGES.map((c) => c.id)).size).toBe(ALL_CHALLENGES.length);
  });

  it('cada desafio pertence a uma área existente e declara a função esperada', () => {
    const areaIds = new Set(AREAS.map((a) => a.id));
    for (const challenge of ALL_CHALLENGES) {
      expect(areaIds.has(challenge.areaId), challenge.id).toBe(true);
      expect(challenge.starterCode).toContain(`def ${challenge.functionName}(`);
      expect(challenge.solution.code).toContain(`def ${challenge.functionName}(`);
      expect(
        challenge.tests.some((t) => t.hidden),
        challenge.id,
      ).toBe(true);
      expect(
        challenge.tests.some((t) => !t.hidden),
        challenge.id,
      ).toBe(true);
    }
  });

  describe.each(ALL_CHALLENGES.map((c) => [c.id, c] as const))('%s', (_id, challenge) => {
    it('a solução oficial passa em todos os testes', async () => {
      const report = await executor.run({ code: challenge.solution.code, tests: challenge.tests });
      expect(report.status).toBe('ok');
      const failed = report.tests
        .filter((t) => !t.passed)
        .map((t) => `${t.expr} → ${t.actualText}`);
      expect(failed).toEqual([]);
    });

    it('o código inicial NÃO passa (não dá para vencer sem escrever nada)', async () => {
      const report = await executor.run({
        code: challenge.starterCode,
        tests: challenge.tests,
        timeoutMs: 400,
      });
      expect(report.tests.every((t) => t.passed)).toBe(false);
    });
  });

  it('o boss começa travando (loop infinito) e a solução o resolve', async () => {
    const buggy = await executor.run({
      code: BOSS_CHALLENGE.starterCode,
      tests: BOSS_CHALLENGE.tests,
      timeoutMs: 300,
    });
    expect(buggy.status).toBe('timeout');
  });

  it('o conteúdo é Python: sem sintaxe de JavaScript no código, nas dicas e nos testes', () => {
    const jsLike = /\bfunction\b|\bconst\b|\blet\b|=>|===|!==|;\s*$|\bnull\b|\bundefined\b/m;
    for (const c of ALL_CHALLENGES) {
      expect(c.starterCode, c.id).not.toMatch(jsLike);
      expect(c.solution.code, c.id).not.toMatch(jsLike);
      expect(c.ladder.example, c.id).not.toMatch(jsLike);
      for (const t of c.tests) expect(t.expr, `${c.id} ${t.name}`).not.toMatch(jsLike);
      expect(c.functionName, c.id).toMatch(/^[a-z_][a-z0-9_]*$/);
    }
  });

  it('cada desafio liga conceito → carta: tem contexto curto, objetivo e conceitos válidos', () => {
    const cardIds = new Set(CARDS.map((card) => card.id));
    for (const c of ALL_CHALLENGES) {
      expect(c.context.length, c.id).toBeGreaterThan(10);
      expect(c.context.length, c.id).toBeLessThan(160);
      expect(c.objective.length, c.id).toBeGreaterThan(0);
      expect(c.concepts.length, c.id).toBeGreaterThan(0);
      for (const id of c.concepts) expect(cardIds.has(id), `${c.id}:${id}`).toBe(true);
    }
  });

  it('toda carta é usada por pelo menos um desafio (nenhuma carta sem conteúdo)', () => {
    const used = new Set(ALL_CHALLENGES.flatMap((c) => c.concepts));
    for (const card of CARDS) expect(used.has(card.id), card.id).toBe(true);
  });

  it('todo combo é viável: existe um desafio que usa os dois conceitos', () => {
    for (const combo of COMBOS) {
      const viable = ALL_CHALLENGES.some((c) =>
        combo.requires.every((id) => c.concepts.includes(id)),
      );
      expect(viable, combo.id).toBe(true);
    }
  });

  it('uma resposta correta em estilo idiomático diferente também passa', async () => {
    const report = await executor.run({
      code: 'def maior_da_lista(lista):\n    return max(lista) if lista else None\n',
      tests: getChallenge('maior-da-lista').tests,
    });
    expect(report.tests.every((t) => t.passed)).toBe(true);
  });
});
