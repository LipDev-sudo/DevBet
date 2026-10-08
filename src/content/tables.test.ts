import { describe, expect, it } from 'vitest';
import { ALL_CHALLENGES } from './challenges';
import { TABLES } from './tables';

describe('cenas das mesas', () => {
  it('cada mesa tem material, luz e marcação próprios (não é só uma troca de cor)', () => {
    expect(new Set(TABLES.map((t) => t.scene.felt)).size).toBe(TABLES.length);
    expect(new Set(TABLES.map((t) => t.scene.trim)).size).toBe(TABLES.length);
    const inlays = TABLES.map((t) => t.scene.inlay);
    expect(new Set(inlays).size).toBe(TABLES.length);
  });

  it('a luz fica mais forte e o ambiente mais escuro até o High Table', () => {
    const lamps = TABLES.map((t) => t.scene.lampStrength);
    expect(lamps.at(-1)).toBe(Math.max(...lamps));
    const vignette = TABLES.map((t) => t.ambient.vignette);
    expect([...vignette]).toEqual([...vignette].sort((a, b) => a - b));
  });

  it('toda mesa tem desafios e declara o conteúdo futuro sem inventar desafios', () => {
    for (const table of TABLES) {
      expect(
        ALL_CHALLENGES.some((c) => c.areaId === table.areaId),
        table.id,
      ).toBe(true);
    }
    const planned = TABLES.flatMap((t) => t.planned);
    expect(planned).toEqual(
      expect.arrayContaining([
        'match (Python 3.10+)',
        'busca binária',
        'ordenação',
        'complexidade',
      ]),
    );
  });
});
