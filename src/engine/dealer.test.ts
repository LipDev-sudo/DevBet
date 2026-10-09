import { afterAll, describe, expect, it } from 'vitest';
import { ALL_CHALLENGES, BOSS_CHALLENGE, getChallenge } from '@/content/challenges';
import { AREAS } from '@/content/areas';
import { getTableByArea, TABLES, tableLabel } from '@/content/tables';
import { createNodeExecutor } from '@/runner/node-executor';
import type { ExecutionReport } from '@/runner/types';
import { ANTES, createRun, playHand, registerFailure, requestHint, startBlind } from './blind';
import type { Result, RunState } from './blind';
import { briefChallenge, reactToRun, restingMood } from './dealer';
import { buildFeedback } from './feedback';
import { hintBlockedReason, nextHintLevel, scoredHints } from './hints';
import { createProfile } from './progression';

const executor = createNodeExecutor();
afterAll(() => executor.dispose?.());
const unwrap = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

/** Run no meio de um exercício específico (o de uma mão jogada, trocado pelo exercício pedido). */
function inCoding(exerciseId: string): RunState {
  const run = unwrap(startBlind(unwrap(createRun('logica', 4, createProfile()))));
  const played = unwrap(playHand(run, [run.round!.hand[0]!]));
  const round = played.round!;
  return { ...played, round: { ...round, play: { ...round.play!, exerciseId } } };
}

describe('mesas', () => {
  it('cada área de desafio tem exatamente uma mesa, e a trilha passa por todas', () => {
    for (const ante of ANTES) expect(getTableByArea(ante.areaId)).toBeDefined();
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
    expect(hintBlockedReason(c, 4, 1)).toMatch(/execuções ou entregas com falha/);
    expect(hintBlockedReason(c, 4, 4)).toBeNull();
    expect(hintBlockedReason(c, 5, 9)).not.toBeNull();
  });

  it('pedir dicas registra o nível e penaliza a pontuação', () => {
    let run = inCoding('somar-ate');
    run = unwrap(requestHint(run));
    expect(run.round?.play?.hintLevel).toBe(1);
    expect(scoredHints(run.round!.play!.hintLevel)).toBe(0);
    run = unwrap(requestHint(run));
    run = unwrap(requestHint(run));
    expect(scoredHints(run.round!.play!.hintLevel)).toBe(2);
    expect(requestHint(unwrap(requestHint(run))).ok).toBe(false); // nível 5 bloqueado sem falhas
    for (let i = 0; i < 4; i++) run = registerFailure(run, 'run');
    run = unwrap(requestHint(unwrap(requestHint(run))));
    expect(run.round?.play?.hintLevel).toBe(5);
    expect(run.round?.play?.solutionViewed).toBe(true);
  });

  it('não permite pedir ajuda fora de um exercício', () => {
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
    expect(reactToRun({ ...base, report: r, allPassed: false }).text).toMatch(
      /não terminou a tempo/,
    );
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

  it('descreve o desafio de forma curta', () => {
    expect(briefChallenge(BOSS_CHALLENGE)).toMatch(/High Table/);
    expect(briefChallenge(getChallenge('somar-ate')).length).toBeLessThan(120);
  });
});

describe('o Dealer descreve a situação real', () => {
  const challenge = getChallenge('calcular-total');
  const report = (code: string) => executor.run({ code, tests: challenge.tests, timeoutMs: 300 });
  const base = { hasHidden: true, failures: 1, hintLevel: 0 };

  it.each([
    ['NameError', 'def calcular_total(p, q, d):\n    return p * qtd - d'],
    ['TypeError', "def calcular_total(p, q, d):\n    return p + 'x'"],
    ['ZeroDivisionError', 'def calcular_total(p, q, d):\n    return 1 / 0'],
  ])('%s é erro de execução, não "resultado errado"', async (_name, code) => {
    const r = await report(code);
    const line = reactToRun({ ...base, report: r, allPassed: false });
    expect(line.kind).toBe('runtime');
    expect(line.text).not.toMatch(/resultado está errado/);
    expect(line.text).toMatch(/erro/i);
  });

  it('import bloqueado explica que o módulo não é liberado', async () => {
    const r = await report('import os\ndef calcular_total(p, q, d):\n    return 1');
    const line = reactToRun({ ...base, report: r, allPassed: false });
    expect(line.kind).toBe('runtime');
    expect(line.text).toMatch(/módulo/);
  });

  it('o feedback técnico aponta o import bloqueado, não só "função não encontrada"', async () => {
    const r = await report('import os\ndef calcular_total(p, q, d):\n    return 1');
    const feedback = buildFeedback(challenge, r, 1);
    expect(feedback.title).toBe('Módulo indisponível');
    expect(feedback.cause).toMatch(/os/);
  });

  it('a regra de "voltar um passo" só vale para respostas erradas, não esconde sintaxe, erro ou timeout', async () => {
    const syntax = await report('def calcular_total(:\n    pass');
    const crash = await report('def calcular_total(p, q, d):\n    return 1 / 0');
    const wrong = await report('def calcular_total(p, q, d):\n    return -1');
    const third = { ...base, failures: 3, allPassed: false };
    expect(reactToRun({ ...third, report: syntax }).kind).toBe('syntax');
    expect(reactToRun({ ...third, report: crash }).kind).toBe('runtime');
    expect(reactToRun({ ...third, report: wrong }).kind).toBe('retry');
  });
});
