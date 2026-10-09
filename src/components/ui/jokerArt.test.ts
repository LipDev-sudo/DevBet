import { describe, expect, it } from 'vitest';
import { JOKERS } from '@/engine/jokers';
import { JOKER_ART, SPRITE_COLOR } from './jokerArt';

describe('arte dos jokers', () => {
  it('todo joker tem um sprite 12×12 próprio, só com cores conhecidas', () => {
    const allowed = new Set(['.', 'a', 'b', ...Object.keys(SPRITE_COLOR)]);
    for (const joker of JOKERS) {
      const art = JOKER_ART[joker.id];
      expect(art, joker.id).toBeDefined();
      expect(art?.rows.length, joker.id).toBe(12);
      for (const row of art?.rows ?? []) {
        expect(row.length, `${joker.id}: "${row}"`).toBe(12);
        for (const ch of row) expect(allowed.has(ch), `${joker.id}: ${ch}`).toBe(true);
      }
      expect(art?.rows.join('').replace(/\./g, '').length, joker.id).toBeGreaterThan(10);
    }
  });

  it('cada joker tem uma paleta diferente da dos vizinhos (sprites não se repetem)', () => {
    const sprites = JOKERS.map((joker) => (JOKER_ART[joker.id]?.rows ?? []).join('|'));
    expect(new Set(sprites).size).toBe(JOKERS.length);
  });
});
