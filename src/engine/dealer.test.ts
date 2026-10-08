import { afterAll, describe, expect, it } from 'vitest';
import { ALL_CHALLENGES, BOSS_CHALLENGE, getChallenge } from '@/content/challenges';
import { AREAS } from '@/content/areas';
import { RUN_LAYERS } from '@/content/map';
import { getTableByArea, TABLES, tableLabel } from '@/content/tables';
import { createNodeExecutor } from '@/runner/node-executor';
import type { ExecutionReport } from '@/runner/types';
import { briefChallenge, explainHand, reactToOutcome, reactToRun, restingMood } from './dealer';
import { hintBlockedReason, nextHintLevel, scoredHints } from './hints';
import { createProfile } from './progression';
import {
  chooseChallenge,
  createRun,
  requestHint,
  registerFailure,
  resolveEncounter,
  startChallenge,
  type Result,
  type RunState,
} from './run';
import { previewHand } from './scoring';

const executor = createNodeExecutor();
afterAll(() => executor.dispose?.());
const unwrap = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

function inChallenge(challengeId: string, atLayer = 0): RunState {
  const run = unwrap(createRun('logica', 4, createProfile()));
  return unwrap(
    startChallenge(unwrap(chooseChallenge({ ...run, layerIndex: atLayer }, challengeId))),
  );
}

describe('mesas', () => {
  it('cada área de desafio tem exatamente uma mesa, e a trilha passa por todas', () => {
    for (const layer of RUN_LAYERS) {
      if (layer.kind !== 'shop') expect(getTableByArea(layer.areaId)).toBeDefined();
    }
    expect(TABLES.map((t) => t.number)).toEqual([1, 2, 3, 4, 5, 0]);
    expect(new Set(TABLES.map((t) => t.areaId)).size).toBe(TABLES.length);
    for (const table of TABLES) expect(AREAS.some((a) => a.id === table.areaId)).toBe(true);
  });

  it('rotula mesas e o High Table', () => {
    expect(tableLabel(TABLES[0]!)).toBe('TABLE 01 — FUNDAMENTALS');
    expect(tableLabel(TABLES.at(-1)!)).toBe('HIGH TABLE');
  });

  it('o ambiente fica mais intenso e o Dealer mais sério conforme avança', () => {
    const glow = TABLES.map((t) => t.ambient.glowOpacity);
    expect([...glow]).toEqual([...glow].sort((a, b) => a - b));
    expect(restingMood(TABLES[0]!.tone)).toBe('idle');
    expect(restingMood(TABLES[4]!.tone)).toBe('serious');
    expect(restingMood(TABLES.at(-1)!.tone, BOSS_CHALLENGE)).toBe('boss');
    expect(restingMood('warm', getChallenge('fatorial'))).toBe('serious');
  });
});

describe('escada de dicas', () => {
  it('toda tarefa tem os quatro primeiros níveis preenchidos', () => {
    for (const c of ALL_CHALLENGES) {
      for (const text of Object.values(c.ladder)) expect(text.length, c.id).toBeGreaterThan(10);
    }
  });

  it('segue em ordem e a pergunta é gratuita', () => {
    const c = getChallenge('somar-ate');
    expect([0, 1, 2, 3, 4].map((l) => nextHintLevel(c, l))).toEqual([1, 2, 3, 4, 5]);
    expect(nextHintLevel(c, 5)).toBeNull();
    expect([1, 2, 3, 4, 5].map(scoredHints)).toEqual([0, 1, 2, 3, 4]);
  });

  it('no boss só há dicas até o conceito, depois a explicação', () => {
    expect(nextHintLevel(BOSS_CHALLENGE, 3)).toBe(5);
  });

  it('a explicação só abre depois de várias tentativas falhas', () => {
    const c = getChallenge('somar-ate');
    expect(hintBlockedReason(c, 4, 1)).toMatch(/tentativas/);
    expect(hintBlockedReason(c, 4, 4)).toBeNull();
    expect(hintBlockedReason(c, 5, 9)).not.toBeNull();
  });

  it('pedir dicas registra o nível e penaliza a pontuação', () => {
    let run = inChallenge('somar-ate', 3);
    run = unwrap(requestHint(run));
    expect(run.encounter?.hintLevel).toBe(1);
    expect(run.encounter?.voluntaryHints).toBe(0);
    run = unwrap(requestHint(run));
    run = unwrap(requestHint(run));
    expect(run.encounter?.voluntaryHints).toBe(2);
    expect(requestHint(unwrap(requestHint(run))).ok).toBe(false); // nível 5 bloqueado sem falhas
    for (let i = 0; i < 4; i++) run = registerFailure(run, 'run');
    run = unwrap(requestHint(unwrap(requestHint(run))));
    expect(run.encounter?.hintLevel).toBe(5);
    expect(run.encounter?.solutionViewed).toBe(true);
  });

  it('não permite pedir ajuda fora de um desafio', () => {
    expect(requestHint(unwrap(createRun('logica', 1, createProfile()))).ok).toBe(false);
  });
});

describe('reações do Dealer', () => {
  const challenge = getChallenge('calcular-total');
  const report = async (code: string): Promise<ExecutionReport> =>
    executor.run({ code, tests: challenge.tests, timeoutMs: 300 });
  const base = { hasHidden: true, failures: 1, hintLevel: 0 };

  it('sintaxe quebrada', async () => {
    const r = await report('def calcular_total(:\n    pass');
    expect(reactToRun({ ...base, report: r, allPassed: false }).text).toMatch(
      /sintaxe está quebrada/,
    );
  });

  it('erro lógico', async () => {
    const r = await report('def calcular_total(p, q, d):\n    return -1');
    expect(reactToRun({ ...base, report: r, allPassed: false }).text).toMatch(
      /resultado está errado/,
    );
  });

  it('parcialmente correto', async () => {
    const r = await report('def calcular_total(p, q, d):\n    return 0 if q == 0 else -1');
    expect(reactToRun({ ...base, report: r, allPassed: false }).text).toMatch(/perto/);
  });

  it('loop infinito', async () => {
    const r = await executor.run({
      code: BOSS_CHALLENGE.starterCode,
      tests: BOSS_CHALLENGE.tests,
      timeoutMs: 300,
    });
    expect(reactToRun({ ...base, report: r, allPassed: false }).text).toMatch(/nunca para/);
  });

  it('muitas tentativas pedem para voltar um passo, sem abrir dica sozinho', async () => {
    const r = await report('def calcular_total(p, q, d):\n    return 0');
    const line = reactToRun({ ...base, report: r, allPassed: false, failures: 3 });
    expect(line.text).toMatch(/voltar um passo/);
    expect(line.nudge).toMatch(/dica/);
    expect(
      reactToRun({ ...base, report: r, allPassed: false, failures: 3, hintLevel: 2 }).nudge,
    ).toBeUndefined();
  });

  it('código correto', async () => {
    const r = await report(challenge.solution.code);
    expect(reactToRun({ ...base, report: r, allPassed: true }).text).toMatch(/Boa mão/);
  });

  it('reconhece solução eficiente, acerto de primeira, boss e bust', () => {
    const run = unwrap(
      startChallenge(
        unwrap(chooseChallenge(unwrap(createRun('dados', 2, createProfile())), 'calcular-total')),
      ),
    );
    const solve = (id: string, code: string, fail = 0, streak = 6) => {
      let r = unwrap(
        startChallenge(
          unwrap(
            chooseChallenge(
              {
                ...unwrap(createRun('dados', 2, createProfile())),
                streak,
                layerIndex: id === 'somar-ate' ? 3 : id === 'boss-infinite-loop' ? 8 : 0,
              },
              id,
            ),
          ),
        ),
      );
      for (let i = 0; i < fail; i++) r = registerFailure(r, 'submit');
      r = { ...r, encounter: r.encounter && { ...r.encounter, draft: code } };
      return resolveEncounter(r, createProfile()).run.encounter!.outcome!;
    };
    void run;
    const formula = solve('somar-ate', 'def somar_ate(n):\n    return n * (n + 1) // 2');
    expect(reactToOutcome(getChallenge('somar-ate'), formula).text).toMatch(
      /Boa solução. E eficiente/,
    );
    const loop = solve('somar-ate', getChallenge('somar-ate').solution.code);
    expect(loop.efficient).toBe(false);
    expect(reactToOutcome(getChallenge('somar-ate'), loop).text).toMatch(/De primeira/);
    const boss = solve('boss-infinite-loop', BOSS_CHALLENGE.solution.code);
    expect(reactToOutcome(BOSS_CHALLENGE, boss).text).toMatch(/não venceu por sorte/);
    const bust = solve('calcular-total', 'x', 9, 0);
    expect(reactToOutcome(getChallenge('calcular-total'), bust).text).toMatch(/^Bust/);
  });

  it('explica a mão e o desafio de forma curta', () => {
    const hand = ['list', 'for'].map((cardId, i) => ({
      uid: `u${i}`,
      cardId: cardId as never,
      upgrade: 0,
    }));
    const text = explainHand(previewHand(hand, ['list', 'for']));
    expect(text).toMatch(/ITERATOR/);
    expect(text).toMatch(/LIST, FOR representam conceitos/);
    const none = [{ uid: 'a', cardId: 'variable' as never, upgrade: 0 }];
    expect(explainHand(previewHand(none, ['for']))).toMatch(/Nenhuma carta desta mão/);
    expect(briefChallenge(BOSS_CHALLENGE)).toMatch(/High Table/);
    expect(briefChallenge(getChallenge('somar-ate')).length).toBeLessThan(120);
  });
});
