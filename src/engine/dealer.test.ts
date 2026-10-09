import { describe, expect, it } from 'vitest';
import { AREAS } from '@/content/areas';
import { getTableByArea, TABLES, tableLabel } from '@/content/tables';
import { ANTES, createRun, type RunState } from './blind';
import { createProfile } from './progression';
import { briefQuestion, DEALER_FRAME, moodForRun, reactToWrong, restingMood } from './dealer';

describe('mesas', () => {
  it('cada área da trilha tem exatamente uma mesa, e a trilha passa por todas', () => {
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
    expect(restingMood(TABLES.at(-1)!.tone, true)).toBe('boss');
  });
});

describe('reações do Dealer', () => {
  it('uma resposta errada não revela a certa e a insistência pede releitura', () => {
    const first = reactToWrong(1);
    expect(first.kind).toBe('wrong');
    expect(first.mood).toBe('error');
    const again = reactToWrong(2);
    expect(again.mood).toBe('serious');
    expect(again.text).toMatch(/Leia/);
  });

  it('descreve a pergunta de forma curta', () => {
    expect(briefQuestion(true)).toMatch(/High Table/);
    expect(briefQuestion(false).length).toBeLessThan(120);
  });
});

describe('humor do Dealer segue a run', () => {
  const run = (patch: Partial<RunState>): RunState => ({
    ...(createRun('logica', 1, createProfile()).ok
      ? (createRun('logica', 1, createProfile()) as { ok: true; state: RunState }).state
      : ({} as RunState)),
    ...patch,
  });

  it('sem run, pisca; na blind do boss, fica sério', () => {
    expect(moodForRun(null)).toBe('wink');
    expect(moodForRun(run({}))).toBe('idle');
    expect(moodForRun(run({ ante: 0, blindIndex: 1 }))).toBe('boss');
  });

  it('na pergunta, fica nervoso com um erro e chora com dois', () => {
    const base = run({ status: 'quiz' });
    const round = (wrong: number[]) =>
      ({
        round: { play: { uids: [], questionId: 'q-variable-1', wrong } },
      }) as unknown as Partial<RunState>;
    expect(moodForRun({ ...base, ...round([]) })).toBe('thinking');
    expect(moodForRun({ ...base, ...round([0]) })).toBe('nervous');
    expect(moodForRun({ ...base, ...round([0, 1]) })).toBe('error');
  });

  it('fim da run: estrela na vitória, choro na derrota', () => {
    expect(moodForRun(run({ status: 'won' }))).toBe('cheer');
    expect(moodForRun(run({ status: 'lost' }))).toBe('error');
    expect(moodForRun(run({ status: 'lost', endReason: 'abandoned' }))).toBe('shy');
    expect(moodForRun(run({ status: 'shop' }))).toBe('wink');
    expect(moodForRun(run({ status: 'cleared' }))).toBe('jackpot');
  });

  it('todo humor tem um quadro válido na folha de sprites', () => {
    for (const frame of Object.values(DEALER_FRAME)) {
      expect(frame).toBeGreaterThanOrEqual(0);
      expect(frame).toBeLessThan(16);
    }
  });
});
