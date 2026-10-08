import { describe, expect, it } from 'vitest';
import { ALL_CHALLENGES, BOSS_CHALLENGE, getChallenge } from '@/content/challenges';
import { CARDS, cardChips, cardEffect, cardMult, CONCEPT_FACTOR, getCard } from './cards';
import { COMBOS, findActiveCombos } from './combos';
import { BOSS_MAX_LADDER, hintCost, nextHintLevel } from './hints';
import { createProfile } from './progression';
import {
  buyCard,
  buyLife,
  canRedraw,
  chooseChallenge,
  claimReward,
  createRun,
  forfeitEncounter,
  HAND_SIZE,
  handCards,
  LIFE_PRICE,
  MAX_LIVES,
  RISK_LEVELS,
  RISK_ORDER,
  SKIP_REWARD_CHIPS,
  redrawHand,
  registerFailure,
  registerRun,
  removeCard,
  removePrice,
  requestHint,
  rerollPrice,
  rerollShop,
  resolveEncounter,
  setRisk,
  startChallenge,
  STARTER_PACKS,
  upgradeCard,
  upgradePrice,
  type Result,
  type RiskLevel,
  type RunState,
} from './run';
import { computeScore, previewHand, precisionFactor } from './scoring';
import { parseRun } from '@/lib/storage';
import { RUN_LIMITS } from '@/runner/types';

const unwrap = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

const LAYER_OF: Record<string, number> = {
  'eh-bissexto': 1,
  'somar-ate': 3,
  fatorial: 6,
  'boss-infinite-loop': 8,
};

/** Entra num desafio como o jogo faz: escolher, definir o risco, pagar a aposta. */
function enter(
  challengeId: string,
  opts: { pack?: string; seed?: number; risk?: RiskLevel; chips?: number; streak?: number } = {},
): RunState {
  const base = unwrap(createRun(opts.pack ?? 'logica', opts.seed ?? 1, createProfile()));
  const prepared: RunState = {
    ...base,
    layerIndex: LAYER_OF[challengeId] ?? 0,
    chips: opts.chips ?? base.chips,
    streak: opts.streak ?? 0,
  };
  let run = unwrap(chooseChallenge(prepared, challengeId));
  run = unwrap(setRisk(run, opts.risk ?? 'safe'));
  return unwrap(startChallenge(run));
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((uid) => b.includes(uid));

describe('troca de mão (redraw) é uma mecânica real', () => {
  it('o baralho inicial de todo pacote é maior que a mão', () => {
    for (const pack of STARTER_PACKS) {
      expect(pack.cards.length, pack.id).toBeGreaterThan(HAND_SIZE);
      expect(new Set(pack.cards).size, `${pack.id} sem cartas repetidas`).toBe(pack.cards.length);
    }
  });

  it('sempre produz uma mão diferente, para qualquer semente e pacote', () => {
    for (const pack of STARTER_PACKS) {
      for (let seed = 1; seed <= 150; seed++) {
        const base = unwrap(createRun(pack.id, seed, createProfile()));
        const table = unwrap(chooseChallenge(base, 'calcular-total'));
        const before = table.encounter!.hand;
        const after = unwrap(redrawHand(table)).encounter!.hand;
        expect(sameSet(before, after), `${pack.id} seed ${seed}`).toBe(false);
        expect(after).toHaveLength(HAND_SIZE);
        expect(new Set(after).size).toBe(HAND_SIZE);
      }
    }
  });

  it('é determinística e só pode ser usada uma vez', () => {
    const table = unwrap(
      chooseChallenge(unwrap(createRun('dados', 9, createProfile())), 'saudacao'),
    );
    const a = unwrap(redrawHand(table));
    const b = unwrap(redrawHand(table));
    expect(a.encounter!.hand).toEqual(b.encounter!.hand);
    expect(a.encounter!.redrawsLeft).toBe(0);
    expect(redrawHand(a).ok).toBe(false);
  });

  it('com baralho do tamanho da mão não finge trocar: recusa e explica', () => {
    const run = unwrap(createRun('logica', 3, createProfile()));
    const small = { ...run, deck: run.deck.slice(0, HAND_SIZE) };
    const table = unwrap(chooseChallenge(small, 'calcular-total'));
    const allowed = canRedraw(table);
    expect(allowed.ok).toBe(false);
    if (!allowed.ok) expect(allowed.reason).toMatch(/não há cartas novas/);
    expect(redrawHand(table).ok).toBe(false);
    expect(table.encounter!.redrawsLeft).toBe(1); // a troca não foi gasta
  });
});

describe('cartas: o texto mostrado é o efeito do engine', () => {
  it('as 16 cartas têm efeito real e o dobro quando o desafio usa o conceito', () => {
    expect(CARDS).toHaveLength(16);
    for (const card of CARDS) {
      const base = cardEffect(card, 0, false);
      const doubled = cardEffect(card, 0, true);
      expect(base.chips, card.id).toBeGreaterThan(0);
      expect(base.mult, card.id).toBeGreaterThan(0);
      expect(doubled.chips, card.id).toBe(base.chips * CONCEPT_FACTOR);
      expect(doubled.mult, card.id).toBeCloseTo(base.mult * CONCEPT_FACTOR, 5);
      expect(base.chips).toBe(cardChips(card, 0));
      expect(base.mult).toBe(cardMult(card, 0));
    }
  });

  it('cada carta entra no cálculo da pontuação exatamente com o efeito exibido', () => {
    for (const card of CARDS) {
      for (const upgrade of [0, 2]) {
        const hand = [{ uid: 'u', cardId: card.id, upgrade }];
        const plain = previewHand(hand, []);
        const boosted = previewHand(hand, [card.id]);
        const shownPlain = cardEffect(card, upgrade, false);
        const shownBoosted = cardEffect(card, upgrade, true);
        expect(plain.sumChips, card.id).toBe(shownPlain.chips);
        expect(plain.sumMult, card.id).toBeCloseTo(shownPlain.mult, 5);
        expect(boosted.sumChips, card.id).toBe(shownBoosted.chips);
        expect(boosted.sumMult, card.id).toBeCloseTo(shownBoosted.mult, 5);
        expect(boosted.lines[0]?.boosted).toBe(true);
      }
    }
  });

  it('nenhuma carta é decorativa: todas dobram em pelo menos um desafio', () => {
    for (const card of CARDS) {
      const uses = ALL_CHALLENGES.filter((c) => c.concepts.includes(card.id));
      expect(uses.length, card.id).toBeGreaterThan(0);
    }
  });

  it('melhorar uma carta muda o efeito mostrado e o cálculo', () => {
    const card = getCard('for');
    const lvl0 = cardEffect(card, 0, false);
    const lvl3 = cardEffect(card, 3, false);
    expect(lvl3.chips - lvl0.chips).toBe(12);
    expect(lvl3.mult - lvl0.mult).toBeCloseTo(0.15, 5);
  });

  it('o efeito não depende do tema do desafio, só do conceito (texto universal)', () => {
    const hand = [{ uid: 'u', cardId: 'variable' as const, upgrade: 0 }];
    const a = previewHand(hand, getChallenge('saudacao').concepts);
    const b = previewHand(hand, []);
    expect(a.sumChips).toBeGreaterThan(b.sumChips); // saudacao usa VARIABLE: dobra
    const noVar = previewHand(hand, getChallenge('eh-bissexto').concepts);
    expect(noVar.sumChips).toBe(b.sumChips); // desafio de outro tema: efeito base, nunca zero
  });
});

describe('combos de conceitos', () => {
  it('cada um dos 10 só ativa com as duas cartas na mão E os dois conceitos no desafio', () => {
    expect(COMBOS).toHaveLength(10);
    for (const combo of COMBOS) {
      const [a, b] = combo.requires;
      expect(findActiveCombos([a, b], [a, b]).map((c) => c.combo.id)).toContain(combo.id);
      expect(findActiveCombos([a], [a, b]).map((c) => c.combo.id)).not.toContain(combo.id);
      expect(findActiveCombos([a, b], [a]).map((c) => c.combo.id)).not.toContain(combo.id);
      expect(findActiveCombos([], [a, b])).toEqual([]);
    }
  });

  it('o bônus mostrado é exatamente o que entra no multiplicador', () => {
    for (const combo of COMBOS) {
      const challenge = ALL_CHALLENGES.find((c) =>
        combo.requires.every((id) => c.concepts.includes(id)),
      );
      expect(challenge, `${combo.id} alcançável`).toBeDefined();
      const cards = combo.requires.map((cardId, i) => ({ uid: `c${i}`, cardId, upgrade: 0 }));
      const filler = CARDS.filter((c) => !combo.requires.includes(c.id)).slice(0, 3);
      const withCombo = previewHand(
        [...cards, ...filler.map((c, i) => ({ uid: `f${i}`, cardId: c.id, upgrade: 0 }))],
        challenge!.concepts,
      );
      const active = withCombo.combos.find((c) => c.combo.id === combo.id);
      expect(active?.bonus, combo.id).toBe(combo.bonus);
      expect(withCombo.comboMult).toBeGreaterThanOrEqual(combo.bonus);
      const total = computeScore({
        basePoints: 100,
        concepts: challenge!.concepts,
        hand: cards,
        streak: 0,
        failedSubmissions: 0,
        voluntaryHints: 0,
        solutionViewed: false,
      });
      const without = computeScore({
        basePoints: 100,
        concepts: [],
        hand: cards,
        streak: 0,
        failedSubmissions: 0,
        voluntaryHints: 0,
        solutionViewed: false,
      });
      expect(total.comboMult, combo.id).toBeGreaterThanOrEqual(combo.bonus);
      expect(without.comboMult).toBe(0);
      expect(total.mult).toBeGreaterThan(without.mult);
    }
  });
});

describe('risco e fichas: contas que fecham', () => {
  it('SAFE, RISKY e HIGH mudam aposta e recompensa, mas nunca a meta nem o Bust', () => {
    const outcomes = RISK_ORDER.map((risk) => {
      let run = enter('eh-bissexto', { risk, chips: 100 });
      run = registerFailure(run, 'submit');
      return { risk, run: resolveEncounter(run, createProfile()).run };
    });
    const [safe, risky, high] = outcomes.map((o) => o.run.encounter!.outcome!);
    expect(new Set(outcomes.map((o) => o.run.encounter!.outcome!.bust)).size).toBe(1);
    expect(safe!.score.total).toBe(risky!.score.total);
    expect(risky!.score.total).toBe(high!.score.total);
    expect(safe!.target).toBe(high!.target);
    expect(risky!.chipsGained).toBe(Math.round(safe!.chipsGained * 1.5));
    expect(high!.chipsGained).toBe(safe!.chipsGained * 2);
  });

  it.each(RISK_ORDER)(
    '%s: o saldo antes e depois bate com a regra, na vitória e no Bust',
    (risk) => {
      const wager = RISK_LEVELS[risk].wager;
      // Vitória
      const win = enter('eh-bissexto', { risk, chips: 100 });
      expect(win.chips).toBe(100 - wager);
      const won = resolveEncounter(win, createProfile()).run;
      const wo = won.encounter!.outcome!;
      expect(wo.bust).toBe(false);
      expect(wo.chipsBefore).toBe(100);
      expect(wo.chipsAfter).toBe(won.chips);
      expect(won.chips).toBe(100 + wo.chipsGained); // a aposta voltou: ganho líquido = recompensa
      // Bust
      let lose = enter('eh-bissexto', { risk, chips: 100 });
      for (let i = 0; i < 9; i++) lose = registerFailure(lose, 'submit');
      const lost = resolveEncounter(lose, createProfile()).run;
      const lo = lost.encounter!.outcome!;
      expect(lo.bust).toBe(true);
      expect(lo.stakeDelta).toBe(-wager);
      expect(lo.chipsBefore).toBe(100);
      expect(lo.chipsAfter).toBe(100 - wager);
      expect(lost.chips).toBe(lo.chipsAfter);
      expect(lost.lives).toBe(lose.lives - 1);
      expect(lost.streak).toBe(0);
    },
  );
});

describe('vidas: sobrevivência de verdade', () => {
  it('Bust tira 1; 0 vidas encerra a run; seguro devolve 1 até o teto', () => {
    let run = enter('eh-bissexto');
    for (let i = 0; i < 9; i++) run = registerFailure(run, 'submit');
    run = resolveEncounter(run, createProfile()).run;
    expect(run.lives).toBe(2);
    const dead = unwrap(claimReward({ ...run, lives: 0 }, null));
    expect(dead.status).toBe('lost');
    const shop: RunState = {
      ...run,
      status: 'shop',
      chips: 500,
      shop: { offers: [], rerolls: 0, boughtLife: false },
      encounter: null,
    };
    const insured = unwrap(buyLife(shop));
    expect(insured.lives).toBe(3);
    expect(insured.chips).toBe(500 - LIFE_PRICE);
    expect(buyLife(insured).ok).toBe(false); // uma por loja
    expect(buyLife({ ...shop, lives: MAX_LIVES }).ok).toBe(false);
  });

  it('retry: uma run nova começa limpa, sem vazar estado da anterior', () => {
    let old = enter('eh-bissexto', { chips: 77, streak: 4 });
    old = { ...old, lives: 1, score: 999, xpEarned: 50 };
    const fresh = unwrap(createRun('dados', 5, createProfile()));
    expect(fresh.chips).toBe(30);
    expect(fresh.lives).toBe(3);
    expect(fresh.streak).toBe(0);
    expect(fresh.score).toBe(0);
    expect(fresh.xpEarned).toBe(0);
    expect(fresh.history).toEqual([]);
    expect(fresh.encounter).toBeNull();
    expect(fresh.deck.map((c) => c.cardId)).toEqual(
      STARTER_PACKS.find((p) => p.id === 'dados')!.cards,
    );
    expect(fresh.deck.every((c) => c.upgrade === 0)).toBe(true);
    expect(old.chips).not.toBe(fresh.chips);
  });
});

describe('loja: cada ação muda a build e o saldo', () => {
  const shopRun = (): RunState => ({
    ...unwrap(createRun('logica', 2, createProfile())),
    status: 'shop',
    layerIndex: 2,
    chips: 300,
    shop: { offers: ['while', 'set', 'recursion'], rerolls: 0, boughtLife: false },
  });

  it('comprar: desconta o preço, a carta entra no baralho e some da prateleira', () => {
    const run = shopRun();
    const bought = unwrap(buyCard(run, 'while'));
    expect(bought.chips).toBe(run.chips - getCard('while').price);
    expect(bought.deck.map((c) => c.cardId)).toContain('while');
    expect(bought.deck).toHaveLength(run.deck.length + 1);
    expect(bought.shop!.offers).not.toContain('while');
    expect(buyCard(bought, 'while').ok).toBe(false);
  });

  it('melhorar: desconta e muda o efeito real da carta', () => {
    const run = shopRun();
    const target = run.deck[0]!;
    const up = unwrap(upgradeCard(run, target.uid));
    expect(up.chips).toBe(run.chips - upgradePrice(target));
    const after = up.deck.find((c) => c.uid === target.uid)!;
    expect(after.upgrade).toBe(1);
    expect(cardEffect(getCard(after.cardId), after.upgrade, false).chips).toBeGreaterThan(
      cardEffect(getCard(target.cardId), 0, false).chips,
    );
  });

  it('remover: desconta, tira a carta de verdade e respeita o mínimo', () => {
    const run = shopRun();
    const target = run.deck[0]!;
    const removed = unwrap(removeCard(run, target.uid));
    expect(removed.chips).toBe(run.chips - removePrice(run));
    expect(removed.deck.some((c) => c.uid === target.uid)).toBe(false);
    expect(removeCard({ ...run, deck: run.deck.slice(0, 4) }, target.uid).ok).toBe(false);
  });

  it('rolar de novo: desconta, sobe o preço e troca as ofertas', () => {
    const run = shopRun();
    const rolled = unwrap(rerollShop(run));
    expect(rolled.chips).toBe(run.chips - rerollPrice(run.shop!));
    expect(rolled.shop!.rerolls).toBe(1);
    expect(rerollPrice(rolled.shop!)).toBeGreaterThan(rerollPrice(run.shop!));
    expect(rolled.shop!.offers).not.toEqual(run.shop!.offers);
  });

  it('o que a loja entrega chega à mão: a carta comprada pode ser sorteada na mesa', () => {
    let run = unwrap(buyCard(shopRun(), 'recursion'));
    run = { ...run, status: 'map', layerIndex: 3, shop: null };
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const table = unwrap(chooseChallenge({ ...run, seed }, 'somar-ate'));
      for (const c of handCards(table)) seen.add(c.cardId);
    }
    expect(seen.has('recursion')).toBe(true);
  });
});

describe('dicas: o custo vem antes e bate com a pontuação', () => {
  it('o rótulo de custo de cada nível corresponde à precisão realmente aplicada', () => {
    const challenge = getChallenge('somar-ate');
    let run = enter('somar-ate', { streak: 0 });
    run = { ...run, encounter: { ...run.encounter!, failedRuns: 4 } };
    let previous = 1;
    for (let level = 1; level <= 5; level++) {
      const cost = hintCost(challenge, level - 1)!;
      run = unwrap(requestHint(run));
      const e = run.encounter!;
      const precision = precisionFactor(e.failedSubmissions, e.voluntaryHints, e.solutionViewed);
      if (level === 1) {
        expect(cost.label).toBe('grátis');
        expect(precision).toBe(1);
      } else if (level < 5) {
        expect(cost.precisionPercent).toBe(10);
        expect(previous - precision).toBeCloseTo(0.1, 2);
      } else {
        expect(cost.solution).toBe(true);
        expect(precision).toBeCloseTo(0.24, 2); // 0,6 × 0,4
      }
      previous = precision;
    }
  });

  it('no boss a escada pula a dica 4 e o custo da solução inclui as dicas puladas', () => {
    expect(BOSS_CHALLENGE.ladder.example).toBeUndefined();
    expect(nextHintLevel(BOSS_CHALLENGE, BOSS_MAX_LADDER)).toBe(5);
    const cost = hintCost(BOSS_CHALLENGE, BOSS_MAX_LADDER)!;
    expect(cost.solution).toBe(true);
    expect(cost.precisionPercent).toBe(20);
    expect(cost.label).toMatch(/−20%/);
    expect(hintCost(BOSS_CHALLENGE, 5)).toBeNull();
  });
});

describe('executar × entregar: sem soft-lock', () => {
  it('59, 60 e 61 execuções: a entrega continua possível e o desafio termina', () => {
    for (const used of [59, 60, 61, 500]) {
      let run = enter('eh-bissexto');
      for (let i = 0; i < used; i++) run = registerRun(run);
      expect(run.encounter!.runsUsed).toBe(used);
      const resolved = resolveEncounter(run, createProfile()).run;
      expect(resolved.status, `${used} execuções`).toBe('reward');
      expect(resolved.encounter!.outcome!.bust).toBe(false);
    }
  });

  it('código errado depois do limite: a entrega falha com custo de precisão, mas há saída', () => {
    let run = enter('eh-bissexto');
    for (let i = 0; i < RUN_LIMITS.maxRunsPerChallenge + 1; i++) run = registerRun(run);
    run = registerFailure(run, 'submit');
    expect(run.encounter!.failedSubmissions).toBe(1);
    const resolved = resolveEncounter(run, createProfile()).run;
    expect(resolved.encounter!.outcome!.score.precision).toBe(0.92);
    const gaveUp = forfeitEncounter(run, createProfile()).run;
    expect(gaveUp.status).toBe('reward');
    expect(gaveUp.encounter!.outcome!.bust).toBe(true);
  });

  it('Executar com erro não custa pontos nem tira o Jackpot; entrega errada custa', () => {
    let run = enter('eh-bissexto');
    for (let i = 0; i < 5; i++) run = registerFailure(run, 'run');
    const tested = resolveEncounter(run, createProfile()).run.encounter!.outcome!;
    expect(tested.score.precision).toBe(1);
    expect(tested.jackpot).toBe(true);
    const wrongSubmit = resolveEncounter(
      registerFailure(enter('eh-bissexto'), 'submit'),
      createProfile(),
    ).run.encounter!.outcome!;
    expect(wrongSubmit.score.precision).toBeLessThan(1);
    expect(wrongSubmit.jackpot).toBe(false);
  });

  it('recarregar depois do limite: o save restaura o desafio e ele continua com saída', () => {
    let run = enter('eh-bissexto');
    for (let i = 0; i < 60; i++) run = registerRun(run);
    const reloaded = parseRun(JSON.parse(JSON.stringify(run)))!;
    expect(reloaded.encounter!.runsUsed).toBe(60);
    expect(resolveEncounter(reloaded, createProfile()).run.status).toBe('reward');
    expect(forfeitEncounter(reloaded, createProfile()).run.status).toBe('reward');
  });
});

describe('desistir: saída válida e com consequência', () => {
  it('conta como Bust: −1 vida, aposta perdida, sequência zerada, sem pontuar nem XP', () => {
    const run = enter('eh-bissexto', { risk: 'high', chips: 100, streak: 3 });
    const profile = createProfile();
    const { run: after, profile: nextProfile } = forfeitEncounter(run, profile);
    const o = after.encounter!.outcome!;
    expect(o.forfeit).toBe(true);
    expect(o.bust).toBe(true);
    expect(o.score.total).toBe(0);
    expect(o.xpGained).toBe(0);
    expect(o.rewardOptions).toEqual([]);
    expect(after.lives).toBe(run.lives - 1);
    expect(after.chips).toBe(100 - RISK_LEVELS.high.wager);
    expect(after.streak).toBe(0);
    expect(after.score).toBe(run.score);
    expect(nextProfile.xp).toBe(profile.xp);
    expect(nextProfile.solved).toEqual({});
  });

  it('no boss exige revanche; sem vidas encerra a run', () => {
    const boss = enter('boss-infinite-loop');
    const afterBoss = forfeitEncounter(boss, createProfile()).run;
    const rematch = unwrap(claimReward(afterBoss, null));
    expect(rematch.status).toBe('table');
    expect(rematch.encounter!.challengeId).toBe('boss-infinite-loop');
    const last = forfeitEncounter({ ...boss, lives: 1 }, createProfile()).run;
    expect(unwrap(claimReward(last, null)).status).toBe('lost');
  });
});

describe('recompensa: o que a tela pode mostrar é o que o engine permite', () => {
  const winWith = (deckIds: readonly string[], level: number, challengeId = 'eh-bissexto') => {
    const base = unwrap(createRun('logica', 1, createProfile()));
    const deck = deckIds.map((cardId, i) => ({
      uid: `k${i}`,
      cardId: cardId as never,
      upgrade: 0,
    }));
    const state: RunState = { ...base, deck, unlockLevel: level, nextUid: deck.length };
    let run = unwrap(
      chooseChallenge({ ...state, layerIndex: LAYER_OF[challengeId] ?? 0 }, challengeId),
    );
    run = unwrap(startChallenge(run));
    return resolveEncounter({ ...run, streak: 6 }, createProfile()).run;
  };
  const allCards = CARDS.map((c) => c.id);

  it('oferece só cartas que o jogador não tem e que o nível libera', () => {
    const owned = ['variable', 'operator', 'function', 'condition', 'boolean'];
    const run = winWith(owned, 1);
    const options = run.encounter!.outcome!.rewardOptions;
    expect(options.length).toBeGreaterThan(0);
    for (const id of options) {
      expect(owned).not.toContain(id);
      expect(getCard(id).unlockLevel).toBeLessThanOrEqual(1);
    }
  });

  it('sem cartas novas disponíveis: não há oferta, nenhuma carta é inventada e a casa paga fichas', () => {
    // Nível 1 libera 7 cartas; o jogador já tem todas.
    const level1 = CARDS.filter((c) => c.unlockLevel <= 1).map((c) => c.id);
    const run = winWith(level1, 1);
    const outcome = run.encounter!.outcome!;
    expect(outcome.bust).toBe(false);
    expect(outcome.rewardOptions).toEqual([]);
    expect(claimReward(run, 'while').ok).toBe(false); // não está na oferta (e não há oferta)
    expect(claimReward(run, 'variable').ok).toBe(false); // carta já possuída
    const closed = unwrap(claimReward(run, null));
    expect(closed.chips).toBe(run.chips + SKIP_REWARD_CHIPS);
    expect(closed.deck).toHaveLength(level1.length);
  });

  it('com todas as cartas do jogo na mão a oferta também é vazia', () => {
    const run = winWith(allCards, 7);
    expect(run.encounter!.outcome!.rewardOptions).toEqual([]);
  });

  it('subir de nível libera novas cartas na oferta seguinte', () => {
    const level1 = CARDS.filter((c) => c.unlockLevel <= 1).map((c) => c.id);
    const options = winWith(level1, 3).encounter!.outcome!.rewardOptions;
    expect(options.length).toBeGreaterThan(0);
    for (const id of options) expect(getCard(id).unlockLevel).toBeGreaterThan(1);
  });

  it('Bust e desistência não oferecem nada', () => {
    let run = enter('eh-bissexto');
    run = forfeitEncounter(run, createProfile()).run;
    expect(run.encounter!.outcome!.rewardOptions).toEqual([]);
  });

  it('vencer o boss encerra a run sem oferecer carta nem pagar fichas extras', () => {
    const run = enter('boss-infinite-loop', { streak: 6 });
    const won = resolveEncounter(run, createProfile()).run;
    const outcome = won.encounter!.outcome!;
    expect(outcome.bust).toBe(false);
    expect(outcome.rewardOptions).toEqual([]);
    const done = unwrap(claimReward(won, null));
    expect(done.status).toBe('won');
    expect(done.chips).toBe(won.chips); // nada de "+8" no fim da run
    expect(done.deck).toHaveLength(won.deck.length);
  });
});

describe('troca de mão: todos os estados do baralho', () => {
  const table = (deckSize: number): RunState => {
    const base = unwrap(createRun('dados', 3, createProfile()));
    const extra = ['while', 'set', 'search', 'recursion'] as const;
    const deck = [
      ...base.deck,
      ...extra.map((cardId, i) => ({ uid: `x${i}`, cardId, upgrade: 0 })),
    ].slice(0, deckSize);
    return unwrap(chooseChallenge({ ...base, deck }, 'calcular-total'));
  };

  it('5 cartas: bloqueada com explicação; 6 ou mais: troca de verdade', () => {
    const blocked = canRedraw(table(5));
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toMatch(/5 cartas/);
    for (const size of [6, 7, 8, 11]) {
      const run = table(size);
      expect(canRedraw(run).ok, `${size} cartas`).toBe(true);
      const after = unwrap(redrawHand(run));
      expect(sameSet(run.encounter!.hand, after.encounter!.hand), `${size} cartas`).toBe(false);
    }
  });

  it('remover cartas na loja até 5 bloqueia a troca; comprar uma carta a libera', () => {
    const run = unwrap(createRun('logica', 2, createProfile()));
    const shop: RunState = {
      ...run,
      status: 'shop',
      chips: 500,
      layerIndex: 2,
      shop: { offers: ['while'], rerolls: 0, boughtLife: false },
    };
    const trimmed = unwrap(
      removeCard(unwrap(removeCard(shop, shop.deck[0]!.uid)), shop.deck[1]!.uid),
    );
    expect(trimmed.deck).toHaveLength(5);
    const atTable = unwrap(
      chooseChallenge({ ...trimmed, status: 'map', shop: null, layerIndex: 3 }, 'somar-ate'),
    );
    expect(canRedraw(atTable).ok).toBe(false);
    const bought = unwrap(buyCard(trimmed, 'while'));
    const atTable6 = unwrap(
      chooseChallenge({ ...bought, status: 'map', shop: null, layerIndex: 3 }, 'somar-ate'),
    );
    expect(canRedraw(atTable6).ok).toBe(true);
  });

  it('depois de usada a troca fica bloqueada, mesmo com baralho grande', () => {
    const used = unwrap(redrawHand(table(8)));
    const state = canRedraw(used);
    expect(state.ok).toBe(false);
    if (!state.ok) expect(state.reason).toMatch(/já usou/);
  });
});
