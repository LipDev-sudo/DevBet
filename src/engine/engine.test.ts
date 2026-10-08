import { describe, expect, it } from 'vitest';
import { CARDS, cardChips, cardMult, getCard, LEGACY_CARD_IDS } from './cards';
import { COMBOS, findActiveCombos, nearCombos } from './combos';
import { evaluateHand } from './hands';
import { createRng, shuffle, weightedSample } from './rng';
import { computeScore, precisionFactor, streakMultiplier } from './scoring';
import type { CardId, DeckCard } from './types';

const deck = (...ids: CardId[]): DeckCard[] =>
  ids.map((cardId, i) => ({ uid: `c${i}`, cardId, upgrade: 0 }));

const ids = (cards: readonly { id: string }[]) => cards.map((c) => c.id);

describe('rng', () => {
  it('é determinístico para a mesma seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('shuffle preserva os elementos e não muta a entrada', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input, createRng(7));
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('weightedSample não repete itens e respeita a contagem', () => {
    const out = weightedSample(['a', 'b', 'c'], 5, () => 1, createRng(1));
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
  });
});

describe('cartas', () => {
  it('possui ids únicos e quantidade moderada', () => {
    expect(CARDS.length).toBeGreaterThanOrEqual(12);
    expect(CARDS.length).toBeLessThanOrEqual(20);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
  });

  it('toda carta é um conceito de Python explicado, com exemplo em Python', () => {
    for (const card of CARDS) {
      expect(card.concept.length, card.id).toBeGreaterThan(30);
      expect(card.snippet.length, card.id).toBeGreaterThan(5);
      expect(card.snippet, card.id).not.toMatch(/\bfunction\b|\bconst\b|\blet\b|=>|;\s*$/m);
    }
  });

  it('cobre os conceitos de cada mesa', () => {
    const ids = CARDS.map((c) => c.id);
    for (const required of [
      'variable',
      'operator',
      'boolean',
      'condition',
      'for',
      'while',
      'list',
      'dictionary',
      'set',
      'function',
      'parameter',
      'return',
      'recursion',
      'search',
    ] as const) {
      expect(ids).toContain(required);
    }
  });

  it('migra nomes antigos (JavaScript) para conceitos Python', () => {
    expect(LEGACY_CARD_IDS.array).toBe('list');
    expect(LEGACY_CARD_IDS.if).toBe('condition');
    for (const target of Object.values(LEGACY_CARD_IDS)) expect(ids(CARDS)).toContain(target);
  });

  it('melhorias aumentam fichas e multiplicador', () => {
    const card = getCard('condition');
    expect(cardChips(card, 2)).toBe(card.chips + 8);
    expect(cardMult(card, 2)).toBeCloseTo(card.mult + 0.1);
  });
});

describe('combos', () => {
  const concepts = ['list', 'for', 'condition', 'variable'] as const;

  it('LIST + FOR produz ITERATOR quando o desafio usa os dois conceitos', () => {
    const active = findActiveCombos(['list', 'for', 'variable'], concepts);
    expect(active.map((c) => c.combo.name)).toEqual(['ITERATOR']);
    expect(active[0]?.bonus).toBeGreaterThan(0.5);
  });

  it('FOR + CONDITION produz FILTER LOOP', () => {
    expect(findActiveCombos(['for', 'condition'], concepts).map((c) => c.combo.name)).toEqual([
      'FILTER LOOP',
    ]);
  });

  it('combos são raros: sem os dois conceitos no desafio, não aparecem', () => {
    expect(findActiveCombos(['list', 'for'], ['for', 'variable'])).toEqual([]);
    expect(findActiveCombos(['list'], concepts)).toEqual([]);
  });

  it('FUNCTION + RECURSION e BOOLEAN + CONDITION existem, com relação conceitual descrita', () => {
    const names = COMBOS.map((c) => c.name);
    expect(names).toContain('RECURSIVE ENGINE');
    expect(names).toContain('LOGIC GATE');
    for (const combo of COMBOS) expect(combo.description.length).toBeGreaterThan(15);
  });

  it('nearCombos aponta a carta que falta', () => {
    expect(nearCombos(['list']).map((n) => n.missing)).toContain('for');
  });
});

describe('mãos', () => {
  it('HIGH CARD quando nada se relaciona', () => {
    expect(evaluateHand(['variable', 'unit-test']).id).toBe('high-card');
  });

  it('PAIR: duas cartas com assunto em comum', () => {
    expect(evaluateHand(['boolean', 'condition']).id).toBe('pair');
  });

  it('FLUSH: três da mesma categoria', () => {
    expect(evaluateHand(['condition', 'for', 'while']).id).toBe('flush');
  });

  it('STRAIGHT: três níveis consecutivos', () => {
    expect(evaluateHand(['variable', 'boolean', 'for']).id).toBe('straight');
  });

  it('FULL HOUSE: controle + estruturas + funções', () => {
    expect(evaluateHand(['variable', 'condition', 'dictionary', 'function']).id).toBe('full-house');
  });

  it('ROYAL HAND: quatro ou mais conceitos avançados', () => {
    expect(evaluateHand(['recursion', 'search', 'unit-test', 'breakpoint', 'variable']).id).toBe(
      'royal-flush',
    );
    expect(evaluateHand(['recursion', 'search', 'unit-test']).id).not.toBe('royal-flush');
  });

  it('escolhe sempre a combinação mais forte', () => {
    expect(evaluateHand(['boolean', 'condition', 'for', 'list']).mult).toBeGreaterThanOrEqual(1.5);
  });
});

describe('pontuação', () => {
  it('multiplicador de combo cresce com a sequência', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(2)).toBe(1.3);
    expect(streakMultiplier(99)).toBe(streakMultiplier(6));
  });

  it('precisão penaliza erros e dicas, com piso', () => {
    expect(precisionFactor(0, 0, false)).toBe(1);
    expect(precisionFactor(1, 1, false)).toBe(0.82);
    expect(precisionFactor(20, 20, false)).toBe(0.4);
    expect(precisionFactor(0, 0, true)).toBe(0.4);
  });

  it('dobra o efeito de cartas cujo conceito o desafio usa', () => {
    const hand = deck('condition');
    const logic = computeScore({
      basePoints: 100,
      concepts: ['condition'],
      hand,
      streak: 0,
      failedSubmissions: 0,
      voluntaryHints: 0,
      solutionViewed: false,
    });
    const loops = computeScore({ ...baseInput(hand), concepts: ['for'] });
    expect(logic.cards[0]?.boosted).toBe(true);
    expect(logic.total).toBeGreaterThan(loops.total);
  });

  it('calcula (base + fichas) × mult × streak × precisão', () => {
    const hand = deck('variable', 'unit-test');
    const out = computeScore({ ...baseInput(hand), concepts: ['list'], streak: 2 });
    // variable: 10 chips/+0.10; unit-test: 18 chips/+0.30; nenhum conceito usado, sem par, sem combo.
    expect(out.cardChips).toBe(28);
    expect(out.mult).toBe(1.4);
    expect(out.total).toBe(Math.round((100 + 28) * 1.4 * 1.3));
  });

  it('melhorias entram na conta', () => {
    const plain = computeScore(baseInput(deck('condition')));
    const upgraded = computeScore(baseInput([{ uid: 'x', cardId: 'condition', upgrade: 2 }]));
    expect(upgraded.total).toBeGreaterThan(plain.total);
  });
});

function baseInput(hand: DeckCard[]) {
  return {
    basePoints: 100,
    concepts: ['variable'] as CardId[],
    hand,
    streak: 0,
    failedSubmissions: 0,
    voluntaryHints: 0,
    solutionViewed: false,
  };
}
