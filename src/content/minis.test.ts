import { afterAll, describe, expect, it } from 'vitest';
import { createNodeExecutor } from '@/runner/node-executor';
import { AREAS } from './areas';
import { CARDS } from '@/engine/cards';
import { MINI_CHALLENGES } from './minis';

const executor = createNodeExecutor();
afterAll(() => executor.dispose?.());

describe('mini-desafios', () => {
  it('tem 32 minis com ids únicos em kebab-case com prefixo mini-', () => {
    expect(MINI_CHALLENGES).toHaveLength(32);
    expect(new Set(MINI_CHALLENGES.map((c) => c.id)).size).toBe(MINI_CHALLENGES.length);
    for (const c of MINI_CHALLENGES) expect(c.id, c.id).toMatch(/^mini-[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('toda carta tem pelo menos 2 minis cujo conceito principal é ela', () => {
    for (const card of CARDS) {
      const count = MINI_CHALLENGES.filter((c) => c.concepts[0] === card.id).length;
      expect(count, card.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('áreas existem, tópico bate com a carta líder e a estrutura está completa', () => {
    const areaIds = new Set(AREAS.map((a) => a.id));
    const cardIds = new Set(CARDS.map((card) => card.id));
    for (const c of MINI_CHALLENGES) {
      const lead = CARDS.find((card) => card.id === c.concepts[0]);
      expect(lead, c.id).toBeDefined();
      expect(areaIds.has(c.areaId), c.id).toBe(true);
      expect(lead?.topics, c.id).toContain(c.topic);
      expect(c.concepts.length, c.id).toBeLessThanOrEqual(3);
      for (const id of c.concepts) expect(cardIds.has(id), `${c.id}:${id}`).toBe(true);
      expect(c.difficulty, c.id).toBeLessThanOrEqual(3);
      expect(c.context.length, c.id).toBeGreaterThan(10);
      expect(c.context.length, c.id).toBeLessThan(160);
      expect(c.objective.length, c.id).toBeGreaterThan(0);
      expect(c.objective.filter((l) => l.startsWith('Exemplo:')).length, c.id).toBe(1);
      expect(c.starterCode, c.id).toContain(`def ${c.functionName}(`);
      expect(c.solution.code, c.id).toContain(`def ${c.functionName}(`);
      expect(
        c.tests.some((t) => t.hidden),
        c.id,
      ).toBe(true);
      expect(
        c.tests.some((t) => !t.hidden),
        c.id,
      ).toBe(true);
      expect([c.basePoints, c.chipReward, c.xp, c.target], c.id).toEqual([0, 0, 0, 0]);
    }
  });

  it('a primeira mini de cada carta é fácil e a segunda é um pouco mais difícil', () => {
    for (const card of CARDS) {
      const [first, second] = MINI_CHALLENGES.filter((c) => c.concepts[0] === card.id);
      expect(first, card.id).toBeDefined();
      expect(second, card.id).toBeDefined();
      expect([1, 2], first!.id).toContain(first!.difficulty);
      expect([2, 3], second!.id).toContain(second!.difficulty);
    }
  });

  describe.each(MINI_CHALLENGES.map((c) => [c.id, c] as const))('%s', (_id, challenge) => {
    it('a solução oficial passa em todos os testes', async () => {
      const report = await executor.run({ code: challenge.solution.code, tests: challenge.tests });
      expect(report.status).toBe('ok');
      const failed = report.tests
        .filter((t) => !t.passed)
        .map((t) => `${t.expr} → ${t.actualText}`);
      expect(failed).toEqual([]);
    });

    it('o código inicial NÃO passa em todos os testes', async () => {
      const report = await executor.run({
        code: challenge.starterCode,
        tests: challenge.tests,
        timeoutMs: 400,
      });
      expect(report.tests.every((t) => t.passed)).toBe(false);
    });
  });

  it('o conteúdo é Python: sem sintaxe de JavaScript no código, nas dicas e nos testes', () => {
    const jsLike = /\bfunction\b|\bconst\b|\blet\b|=>|===|!==|;\s*$|\bnull\b|\bundefined\b/m;
    for (const c of MINI_CHALLENGES) {
      expect(c.starterCode, c.id).not.toMatch(jsLike);
      expect(c.solution.code, c.id).not.toMatch(jsLike);
      expect(c.ladder.example ?? '', c.id).not.toMatch(jsLike);
      expect(c.ladder.example, c.id).toBeTruthy();
      for (const t of c.tests) expect(t.expr, `${c.id} ${t.name}`).not.toMatch(jsLike);
      expect(c.functionName, c.id).toMatch(/^[a-z_][a-z0-9_]*$/);
    }
  });
});
