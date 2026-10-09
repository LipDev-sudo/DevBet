import { describe, expect, it } from 'vitest';
import { getJoker, JOKERS, type JokerContext } from './jokers';

const base: JokerContext = {
  firstTry: true,
  handRankId: 'pair',
  comboCount: 1,
  playedCount: 5,
  cardIds: ['list', 'for', 'condition', 'variable', 'boolean'],
  categories: ['estruturas', 'controle', 'fundamentos'],
};

describe('jokers', () => {
  it('todo joker tem id único, preço, exemplo e dispara de forma determinística', () => {
    expect(new Set(JOKERS.map((j) => j.id)).size).toBe(JOKERS.length);
    for (const joker of JOKERS) {
      expect(joker.price).toBeGreaterThan(0);
      expect(joker.triggers(base)).toBe(joker.triggers(base));
      expect(joker.snippet.length).toBeGreaterThan(3);
    }
  });

  it('dispara pelas cartas e pela forma da mão', () => {
    expect(getJoker('comprehension').triggers(base)).toBe(1);
    expect(getJoker('comprehension').triggers({ ...base, cardIds: ['list'] })).toBe(0);
    expect(getJoker('ternary').triggers(base)).toBe(1);
    expect(getJoker('ternary').triggers({ ...base, cardIds: ['for'] })).toBe(0);
    expect(getJoker('fstring').triggers(base)).toBe(1);
    expect(getJoker('any-all').triggers(base)).toBe(1);
    expect(getJoker('docstring').triggers(base)).toBe(0);
    expect(getJoker('docstring').triggers({ ...base, cardIds: ['function'] })).toBe(1);
    expect(getJoker('stdlib').triggers(base)).toBe(3);
    expect(getJoker('comments').triggers(base)).toBe(3);
    expect(getJoker('comments').triggers({ ...base, playedCount: 1 })).toBe(1);
  });

  it('formato da mão: par, tamanho e combos', () => {
    expect(getJoker('pair-master').triggers(base)).toBe(1);
    expect(getJoker('pair-master').triggers({ ...base, handRankId: 'flush' })).toBe(0);
    expect(getJoker('big-hand').triggers(base)).toBe(1);
    expect(getJoker('big-hand').triggers({ ...base, playedCount: 4 })).toBe(0);
    expect(getJoker('minimalist').triggers({ ...base, playedCount: 2 })).toBe(1);
    expect(getJoker('minimalist').triggers(base)).toBe(0);
    expect(getJoker('combo-hunter').triggers({ ...base, comboCount: 2 })).toBe(2);
  });

  it('mão limpa só dispara quando a pergunta foi acertada de primeira', () => {
    expect(getJoker('clean-hand').triggers(base)).toBe(1);
    expect(getJoker('clean-hand').triggers({ ...base, firstTry: false })).toBe(0);
  });
});
