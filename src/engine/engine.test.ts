import { describe, expect, it } from 'vitest';
import { CARDS, cardChips, cardMult, getCard, LEGACY_CARD_IDS } from './cards';
import { COMBOS, findActiveCombos, nearCombos } from './combos';
import { evaluateHand } from './hands';
import { createRng, shuffle, weightedSample } from './rng';
import { precisionFactor, previewPlay, RANK_BASE, scoreHand } from './handscore';
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

describe('pontuação da mão', () => {
  const base = (played: DeckCard[], extra: Partial<Parameters<typeof scoreHand>[0]> = {}) => ({
    played,
    concepts: [] as CardId[],
    jokers: [] as string[],
    code: 'return 1',
    firstTry: true,
    failedSubmissions: 0,
    hintsUsed: 0,
    solutionViewed: false,
    ...extra,
  });

  it('precisão penaliza erros e dicas, com piso', () => {
    expect(precisionFactor(0, 0, false)).toBe(1);
    expect(precisionFactor(1, 1, false)).toBe(0.8);
    expect(precisionFactor(20, 20, false)).toBe(0.4);
    expect(precisionFactor(0, 0, true)).toBe(0.4);
  });

  it('a mão certa já vale antes das cartas, e cada carta soma fichas e multiplicador', () => {
    const score = scoreHand(base(deck('for', 'while')));
    expect(score.rank.id).toBe('pair');
    expect(score.steps[0]).toMatchObject({ kind: 'rank', chips: RANK_BASE.pair.chips });
    const cards = score.steps.filter((step) => step.kind === 'card');
    expect(cards).toHaveLength(2);
    expect(score.chips).toBe(RANK_BASE.pair.chips + cards.reduce((sum, c) => sum + c.addChips, 0));
    expect(score.total).toBe(Math.round(score.chips * score.mult));
  });

  it('dobra o efeito de cartas cujo conceito o exercício usa', () => {
    const plain = scoreHand(base(deck('condition')));
    const boosted = scoreHand(base(deck('condition'), { concepts: ['condition'] }));
    expect(boosted.steps[1]?.addChips).toBe((plain.steps[1]?.addChips ?? 0) * 2);
    expect(boosted.total).toBeGreaterThan(plain.total);
  });

  it('combos entram quando as duas cartas são jogadas', () => {
    const score = scoreHand(base(deck('list', 'for')));
    expect(score.combos.map((c) => c.combo.id)).toContain('iterator');
    expect(score.steps.some((step) => step.kind === 'combo')).toBe(true);
  });

  it('jokers disparam na ordem e só quando o código usa o idioma', () => {
    const withIdiom = scoreHand(
      base(deck('for'), { jokers: ['comprehension', 'fstring'], code: 'return [n for n in x]' }),
    );
    const jokers = withIdiom.steps.filter((step) => step.kind === 'joker');
    expect(jokers.map((step) => step.jokerId)).toEqual(['comprehension']);
    const without = scoreHand(base(deck('for'), { jokers: ['comprehension'], code: 'return 1' }));
    expect(without.steps.some((step) => step.kind === 'joker')).toBe(false);
    expect(withIdiom.total).toBeGreaterThan(without.total);
  });

  it('multiplicadores de joker multiplicam o placar acumulado', () => {
    const one = scoreHand(base(deck('for'), { jokers: [] }));
    const x = scoreHand(base(deck('for'), { jokers: ['clean-hand'] }));
    expect(x.mult).toBeCloseTo(one.mult * 1.5, 1);
  });

  it('precisão e solução reduzem o total; carta anulada não pontua', () => {
    const clean = scoreHand(base(deck('for', 'list')));
    const messy = scoreHand(base(deck('for', 'list'), { failedSubmissions: 2 }));
    expect(messy.total).toBeLessThan(clean.total);
    expect(messy.steps.at(-1)).toMatchObject({ kind: 'precision', xMult: 0.8 });
    const peeked = scoreHand(base(deck('for', 'list'), { solutionViewed: true }));
    expect(peeked.precision).toBe(0.4);
    const debuffed = scoreHand(base(deck('for', 'list'), { debuffed: (c) => c.cardId === 'for' }));
    expect(debuffed.steps.find((step) => step.label === 'FOR')?.debuffed).toBe(true);
    expect(debuffed.total).toBeLessThan(clean.total);
  });

  it('a prévia mínima bate com o placar de uma mão sem jokers nem erros', () => {
    const hand = deck('boolean', 'condition', 'for');
    const preview = previewPlay(hand, ['boolean']);
    const score = scoreHand(base(hand, { concepts: ['boolean'] }));
    expect(preview.chips).toBe(score.chips);
    expect(preview.mult).toBe(score.mult);
  });

  it('melhorias de carta e de mão entram na conta', () => {
    const plain = scoreHand(base(deck('condition')));
    const upgraded = scoreHand(base([{ uid: 'x', cardId: 'condition', upgrade: 2 }]));
    expect(upgraded.total).toBeGreaterThan(plain.total);
    const leveled = scoreHand(base(deck('condition'), { handLevel: 3 }));
    expect(leveled.total).toBeGreaterThan(plain.total);
  });
});
