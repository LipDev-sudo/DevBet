import { describe, expect, it } from 'vitest';
import { AREAS } from '@/content/areas';
import { getTableByArea, TABLES, tableLabel } from '@/content/tables';
import { ANTES } from './blind';
import { briefQuestion, reactToWrong, restingMood } from './dealer';

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
