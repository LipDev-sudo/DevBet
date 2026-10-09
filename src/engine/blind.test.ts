import { describe, expect, it } from 'vitest';
import { exercisePool, getExercise } from '@/content/exercises';
import { getCard } from './cards';
import {
  ANTES,
  BASE_DISCARDS,
  BASE_HANDS,
  BIG_HAND,
  buyItem,
  canDiscard,
  canPlay,
  continueAfterScore,
  createRun,
  currentBlind,
  deckEntry,
  discard,
  forfeitHand,
  HAND_SIZE,
  JOKER_SLOTS,
  leaveShop,
  maxPlayFor,
  openShop,
  playHand,
  rerollShop,
  sellJoker,
  startBlind,
  STARTER_PACKS,
  submitHand,
  type Result,
  type RunState,
} from './blind';
import { createProfile } from './progression';
import { evaluateHand } from './hands';

const profile = { ...createProfile(), tutorialCompleted: true };

function unwrap(result: Result<RunState>): RunState {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

function fresh(packId = 'logica', seed = 7): RunState {
  return unwrap(createRun(packId, seed, profile));
}

/** Troca a mão por cartas específicas do baralho (os demais uids vão para o monte), para testes de conceito. */
function withHand(run: RunState, cardIds: string[]): RunState {
  const round = run.round!;
  const chosen: string[] = [];
  for (const id of cardIds) {
    const entry = run.deck.find((card) => card.cardId === id && !chosen.includes(card.uid));
    if (!entry) throw new Error(`Sem ${id} no baralho`);
    chosen.push(entry.uid);
  }
  const rest = run.deck.map((card) => card.uid).filter((uid) => !chosen.includes(uid));
  const fill = rest.slice(0, HAND_SIZE - chosen.length);
  return {
    ...run,
    round: { ...round, hand: [...chosen, ...fill], drawPile: rest.slice(fill.length) },
  };
}

function inRound(packId = 'logica', seed = 7): RunState {
  return unwrap(startBlind(fresh(packId, seed)));
}

describe('criação e blinds', () => {
  it('cria a run no estado "blind" com baralho de 24 cartas e dinheiro inicial', () => {
    const run = fresh();
    expect(run.status).toBe('blind');
    expect(run.deck).toHaveLength(24);
    expect(run.jokers).toEqual([]);
    expect(run.round).toBeNull();
    expect(currentBlind(run).id).toBe('a1b1');
  });

  it('startBlind dá 8 cartas, o resto no monte, 4 mãos e 3 descartes', () => {
    const run = inRound();
    const round = run.round!;
    expect(run.status).toBe('round');
    expect(round.hand).toHaveLength(HAND_SIZE);
    expect(round.drawPile).toHaveLength(24 - HAND_SIZE);
    expect(round.handsLeft).toBe(BASE_HANDS);
    expect(round.discardsLeft).toBe(BASE_DISCARDS);
    expect(round.roundScore).toBe(0);
    const all = [...round.hand, ...round.drawPile];
    expect(new Set(all).size).toBe(24);
  });

  it('é determinístico para a mesma seed', () => {
    expect(inRound('logica', 5).round!.hand).toEqual(inRound('logica', 5).round!.hand);
    expect(inRound('logica', 5).round!.hand).not.toEqual(inRound('logica', 6).round!.hand);
  });

  it('os packs têm 12 conceitos distintos', () => {
    for (const pack of STARTER_PACKS) expect(new Set(pack.cards).size).toBe(12);
  });
});

describe('descartar', () => {
  it('troca as cartas, gasta 1 descarte e mantém a mão em 8', () => {
    const run = inRound();
    const gone = run.round!.hand.slice(0, 3);
    const next = unwrap(discard(run, gone));
    expect(next.round!.hand).toHaveLength(HAND_SIZE);
    expect(next.round!.discardsLeft).toBe(BASE_DISCARDS - 1);
    expect(next.round!.hand.some((uid) => gone.includes(uid))).toBe(false);
    expect(next.round!.discardPile).toEqual(gone);
  });

  it('valida: vazio, repetida, fora da mão, mais de 5 e sem descartes', () => {
    const run = inRound();
    const hand = run.round!.hand;
    expect(canDiscard(run, [])).toBeTruthy();
    expect(canDiscard(run, [hand[0]!, hand[0]!])).toBeTruthy();
    expect(canDiscard(run, ['nao-existe'])).toBeTruthy();
    expect(canDiscard(run, hand.slice(0, 6))).toBeTruthy();
    let r = run;
    for (let i = 0; i < BASE_DISCARDS; i++) r = unwrap(discard(r, [r.round!.hand[0]!]));
    expect(canDiscard(r, [r.round!.hand[0]!])).toMatch(/acabaram/);
  });

  it('o boss "Arquivista" não permite descartes', () => {
    let run = inRound();
    run = { ...run, ante: 3, blindIndex: 1, status: 'blind', round: null };
    run = unwrap(startBlind(run));
    expect(run.round!.discardsLeft).toBe(0);
    expect(canDiscard(run, [run.round!.hand[0]!])).toMatch(/não permite/);
  });
});

describe('jogar uma mão', () => {
  it('1 a 3 cartas pedem um mini-desafio do conceito da 1ª carta escolhida', () => {
    const run = inRound();
    const hand = run.round!.hand;
    const lead = hand[2]!;
    const next = unwrap(playHand(run, [lead, hand[0]!]));
    expect(next.status).toBe('coding');
    expect(next.round!.hand).not.toContain(lead);
    const play = next.round!.play!;
    expect(play.uids).toEqual([lead, hand[0]]);
    const exercise = getExercise(play.exerciseId);
    expect(exercise.id.startsWith('mini-')).toBe(true);
    expect(exercise.concepts[0]).toBe(deckEntry(run, lead).cardId);
    expect(next.usedExercises).toContain(exercise.id);
  });

  it('mãos grandes pedem um desafio completo quando o conceito tem um', () => {
    const run = withHand(inRound('dados', 3), ['for', 'list', 'variable', 'operator', 'condition']);
    const uids = run.round!.hand.slice(0, BIG_HAND);
    const next = unwrap(playHand(run, uids));
    const exercise = getExercise(next.round!.play!.exerciseId);
    expect(exercise.id.startsWith('mini-')).toBe(false);
    expect(exercise.concepts).toContain('for');
  });

  it('não repete exercício enquanto houver outro disponível', () => {
    const base = withHand(inRound('dados', 11), ['variable', 'operator']);
    const pool = exercisePool('variable', false);
    expect(pool.length).toBeGreaterThanOrEqual(2);
    const lead = base.round!.hand[0]!;
    const used = pool.slice(1).map((exercise) => exercise.id);
    const next = unwrap(playHand({ ...base, usedExercises: used }, [lead]));
    expect(next.round!.play!.exerciseId).toBe(pool[0]!.id);
    // Esgotado o conjunto, o exercício pode se repetir em vez de travar a mão.
    const all = unwrap(playHand({ ...base, usedExercises: pool.map((e) => e.id) }, [lead]));
    expect(pool.map((e) => e.id)).toContain(all.round!.play!.exerciseId);
  });

  it('valida as escolhas e o limite do boss', () => {
    const run = inRound();
    const hand = run.round!.hand;
    expect(canPlay(run, [])).toBeTruthy();
    expect(canPlay(run, hand.slice(0, 6))).toBeTruthy();
    expect(canPlay(run, [hand[0]!, hand[0]!])).toBeTruthy();
    const boss = unwrap(
      startBlind({ ...run, ante: 0, blindIndex: 1, status: 'blind', round: null }),
    );
    expect(maxPlayFor(boss)).toBe(3);
    expect(canPlay(boss, boss.round!.hand.slice(0, 4))).toMatch(/no máximo 3/);
    expect(canPlay(boss, boss.round!.hand.slice(0, 3))).toBeNull();
  });

  it('o boss final força o desafio THE INFINITE LOOP na 1ª mão', () => {
    const base = fresh();
    const run = unwrap(
      startBlind({ ...base, ante: ANTES.length - 1, blindIndex: 1, status: 'blind' }),
    );
    const next = unwrap(playHand(run, [run.round!.hand[0]!]));
    expect(next.round!.play!.exerciseId).toBe('boss-infinite-loop');
  });
});

describe('pontuar e seguir', () => {
  function playOnce(run: RunState, code = 'return 1') {
    const lead = run.round!.hand[0]!;
    return unwrap(submitHand(unwrap(playHand(run, [lead])), code));
  }

  it('entregar pontua, gasta uma mão e mostra o placar', () => {
    const run = inRound();
    const scored = playOnce(run);
    expect(scored.status).toBe('scored');
    expect(scored.round!.handsLeft).toBe(BASE_HANDS - 1);
    expect(scored.round!.handsPlayed).toBe(1);
    expect(scored.round!.roundScore).toBeGreaterThan(0);
    expect(scored.round!.last!.score.total).toBe(scored.round!.roundScore);
    expect(scored.score).toBe(scored.round!.roundScore);
    expect(scored.bestHand).toBe(scored.round!.roundScore);
    expect(scored.round!.hand).toHaveLength(HAND_SIZE - 1);
  });

  it('desistir gasta a mão e vale zero', () => {
    const run = inRound();
    const lead = run.round!.hand[0]!;
    const next = unwrap(forfeitHand(unwrap(playHand(run, [lead]))));
    expect(next.round!.roundScore).toBe(0);
    expect(next.round!.last!.forfeit).toBe(true);
    expect(next.round!.handsLeft).toBe(BASE_HANDS - 1);
  });

  it('continuar compra cartas até 8 e volta para a rodada', () => {
    const run = inRound();
    const scored = playOnce({ ...run, round: { ...run.round!, target: 99999 } });
    const next = unwrap(continueAfterScore(scored));
    expect(next.status).toBe('round');
    expect(next.round!.hand).toHaveLength(HAND_SIZE);
  });

  it('sem mãos e abaixo da meta é derrota', () => {
    let run = inRound();
    for (let i = 0; i < BASE_HANDS; i++) {
      const lead = run.round!.hand[0]!;
      run = unwrap(forfeitHand(unwrap(playHand(run, [lead]))));
      run = unwrap(continueAfterScore(run));
      if (run.status === 'lost') break;
    }
    expect(run.status).toBe('lost');
    expect(run.history.at(-1)).toMatchObject({ cleared: false, hands: BASE_HANDS });
  });

  it('bater a meta vence a blind e paga blind + mãos sobrando + juros', () => {
    let run = inRound();
    run = { ...run, money: 12, round: { ...run.round!, target: 1 } };
    const scored = playOnce(run);
    const cleared = unwrap(continueAfterScore(scored));
    expect(cleared.status).toBe('cleared');
    const payout = cleared.round!.payout!;
    expect(payout.blind).toBe(currentBlind(run).reward);
    expect(payout.handsLeft).toBe(BASE_HANDS - 1);
    expect(payout.interest).toBe(2);
    expect(cleared.money).toBe(12 + payout.total);
    expect(cleared.history.at(-1)).toMatchObject({ cleared: true });
  });
});

describe('loja', () => {
  function shopRun(): RunState {
    let run = inRound();
    run = { ...run, round: { ...run.round!, target: 1 } };
    const lead = run.round!.hand[0]!;
    run = unwrap(submitHand(unwrap(playHand(run, [lead])), 'return 1'));
    run = unwrap(continueAfterScore(run));
    return unwrap(openShop(run));
  }

  it('abre depois da blind vencida com jokers, cartas e um upgrade de mão', () => {
    const run = shopRun();
    expect(run.status).toBe('shop');
    const kinds = run.shop!.items.map((item) => item.kind);
    expect(kinds.filter((k) => k === 'joker')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'card')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'hand')).toHaveLength(1);
  });

  it('comprar desconta o preço e entrega o item; sem dinheiro explica quanto falta', () => {
    const run = { ...shopRun(), money: 100 };
    const jokerIndex = run.shop!.items.findIndex((item) => item.kind === 'joker');
    const price = run.shop!.items[jokerIndex]!.price;
    const bought = unwrap(buyItem(run, jokerIndex));
    expect(bought.money).toBe(100 - price);
    expect(bought.jokers).toHaveLength(1);
    expect(bought.shop!.items).toHaveLength(4);
    const poor = buyItem({ ...run, money: 0 }, 0);
    expect(poor.ok).toBe(false);
    if (!poor.ok) expect(poor.reason).toMatch(/Faltam/);
  });

  it('respeita o limite de jokers e a venda devolve metade', () => {
    let run = { ...shopRun(), money: 999 };
    for (let i = 0; i < JOKER_SLOTS; i++) {
      const index = run.shop!.items.findIndex((item) => item.kind === 'joker');
      if (index === -1) run = unwrap(rerollShop(run));
      const idx = run.shop!.items.findIndex((item) => item.kind === 'joker');
      run = unwrap(buyItem(run, idx));
    }
    expect(run.jokers).toHaveLength(JOKER_SLOTS);
    let index = run.shop!.items.findIndex((item) => item.kind === 'joker');
    while (index === -1) {
      run = unwrap(rerollShop(run));
      index = run.shop!.items.findIndex((item) => item.kind === 'joker');
    }
    const full = buyItem(run, index);
    expect(full.ok).toBe(false);
    const sold = unwrap(sellJoker(run, run.jokers[0]!));
    expect(sold.jokers).toHaveLength(JOKER_SLOTS - 1);
    expect(sold.money).toBeGreaterThan(run.money);
  });

  it('sair da loja leva à próxima blind; depois do boss, ao próximo ante', () => {
    let run = shopRun();
    run = unwrap(leaveShop(run));
    expect(run.status).toBe('blind');
    expect([run.ante, run.blindIndex]).toEqual([0, 1]);
    run = unwrap(leaveShop({ ...run, status: 'shop' }));
    expect([run.ante, run.blindIndex]).toEqual([1, 0]);
  });

  it('vencer a última blind vence a run', () => {
    const base = fresh();
    let run = unwrap(
      startBlind({ ...base, ante: ANTES.length - 1, blindIndex: 1, status: 'blind' }),
    );
    run = { ...run, round: { ...run.round!, target: 1 } };
    const lead = run.round!.hand[0]!;
    run = unwrap(submitHand(unwrap(playHand(run, [lead])), 'return 1'));
    run = unwrap(continueAfterScore(run));
    expect(run.status).toBe('cleared');
    run = unwrap(openShop(run));
    expect(run.status).toBe('won');
  });
});

describe('combos e mãos de cartas', () => {
  it('a mão jogada é avaliada pelas cartas jogadas', () => {
    const run = inRound('funcoes', 2);
    const hand = run.round!.hand.map((uid) => deckEntry(run, uid));
    const ids = hand.slice(0, 3).map((card) => card.cardId);
    expect(evaluateHand(ids).id).toBeTruthy();
    expect(getCard(ids[0]!).name).toBeTruthy();
  });
});
