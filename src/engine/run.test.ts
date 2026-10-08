import { describe, expect, it } from 'vitest';
import { RUN_LAYERS } from '@/content/map';
import { createProfile, levelFromXp, xpForLevel, xpProgress, type Profile } from './progression';
import {
  RISK_LEVELS,
  riskAvailability,
  type RiskLevel,
  buyCard,
  buyLife,
  chooseChallenge,
  claimReward,
  createRun,
  deckEntry,
  finishRunProfile,
  getCurrentLayer,
  handCards,
  leaveShop,
  MAX_LIVES,
  MIN_DECK_SIZE,
  redrawHand,
  registerFailure,
  requestHint,
  removeCard,
  rerollShop,
  resolveEncounter,
  setRisk,
  startChallenge,
  STARTER_PACKS,
  upgradeCard,
  type Result,
  type RunState,
} from './run';

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

function newRun(packId = 'logica', seed = 1, profile = createProfile()) {
  return { run: unwrap(createRun(packId, seed, profile)), profile };
}

interface PlayStyle {
  failures?: number;
  hints?: number;
  solution?: boolean;
  risk?: RiskLevel;
}

/** Joga uma mesa inteira: escolhe a primeira opção, "escreve" o código e resolve. */
function playEncounter(run: RunState, profile: Profile, style: PlayStyle = {}) {
  const layer = getCurrentLayer(run);
  if (layer.kind === 'shop') throw new Error('Camada de loja');
  let state = unwrap(chooseChallenge(run, layer.options[0] as string));
  state = unwrap(setRisk(state, style.risk ?? 'safe'));
  state = unwrap(startChallenge(state));
  for (let i = 0; i < (style.failures ?? 0); i++) state = registerFailure(state, 'submit');
  // Com `solution`, as falhas acima precisam bastar para liberar o nível 5.
  const wanted = style.solution ? 5 : style.hints ? style.hints + 1 : 0;
  while ((state.encounter?.hintLevel ?? 0) < wanted) state = unwrap(requestHint(state));
  return resolveEncounter(state, profile);
}

function finishShop(run: RunState): RunState {
  return run.status === 'shop' ? unwrap(leaveShop(run)) : run;
}

describe('criação de run', () => {
  it('cria baralho, fichas e vidas iniciais para cada pacote', () => {
    for (const pack of STARTER_PACKS) {
      const { run } = newRun(pack.id);
      expect(run.deck.map((c) => c.cardId)).toEqual(pack.cards);
      expect(run.status).toBe('map');
      expect(run.lives).toBe(3);
      expect(run.chips).toBeGreaterThan(0);
    }
  });

  it('recusa pacote desconhecido', () => {
    expect(createRun('nada', 1, createProfile()).ok).toBe(false);
  });

  it('a trilha é linear: uma mesa após a outra, com escolha entre desafios, e termina no boss', () => {
    const options = RUN_LAYERS.flatMap((l) => (l.kind === 'challenge' ? l.options : []));
    expect(options.length).toBeGreaterThanOrEqual(10);
    expect(RUN_LAYERS.at(-1)?.kind).toBe('boss');
  });
});

describe('mesa', () => {
  it('senta o jogador, sorteia a mão e permite trocar uma vez', () => {
    const { run } = newRun();
    const layer = getCurrentLayer(run);
    if (layer.kind === 'shop') throw new Error();
    const table = unwrap(chooseChallenge(run, layer.options[1] as string));
    expect(table.status).toBe('table');
    expect(handCards(table)).toHaveLength(5);
    const redrawn = unwrap(redrawHand(table));
    expect(redrawn.encounter?.redrawsLeft).toBe(0);
    expect(redrawHand(redrawn).ok).toBe(false);
  });

  it('é determinístico: mesma seed, mesma mão', () => {
    const a = newRun('dados', 99).run;
    const b = newRun('dados', 99).run;
    const layer = getCurrentLayer(a);
    if (layer.kind === 'shop') throw new Error();
    const id = layer.options[0] as string;
    expect(unwrap(chooseChallenge(a, id)).encounter?.hand).toEqual(
      unwrap(chooseChallenge(b, id)).encounter?.hand,
    );
  });

  it('recusa desafio fora da mesa', () => {
    const { run } = newRun();
    expect(chooseChallenge(run, 'boss-infinite-loop').ok).toBe(false);
  });

  it('o primeiro desafio só aceita SAFE; riscos maiores abrem na mesa seguinte', () => {
    const { run } = newRun();
    const layer = getCurrentLayer(run);
    if (layer.kind === 'shop') throw new Error();
    const first = unwrap(chooseChallenge(run, layer.options[0] as string));
    expect(setRisk(first, 'risky').ok).toBe(false);
    expect(riskAvailability(2, 'risky', 100).ok).toBe(true);
    const second = unwrap(chooseChallenge({ ...run, layerIndex: 1 }, 'eh-bissexto'));
    expect(setRisk(second, 'high').ok).toBe(true);
  });

  it('o risco respeita o saldo e o valor em jogo sai das fichas ao começar', () => {
    const { run } = newRun();
    const table = unwrap(chooseChallenge({ ...run, layerIndex: 1 }, 'eh-bissexto'));
    expect(setRisk({ ...table, chips: 5 }, 'risky').ok).toBe(false);
    const started = unwrap(startChallenge(unwrap(setRisk(table, 'risky'))));
    expect(started.chips).toBe(run.chips - RISK_LEVELS.risky.wager);
  });

  it('níveis de risco crescem em prêmio e em perda potencial', () => {
    expect(RISK_LEVELS.safe).toMatchObject({ multiplier: 1, wager: 0 });
    expect(RISK_LEVELS.risky.multiplier).toBeGreaterThan(RISK_LEVELS.safe.multiplier);
    expect(RISK_LEVELS.high.multiplier).toBeGreaterThan(RISK_LEVELS.risky.multiplier);
    expect(RISK_LEVELS.high.wager).toBeGreaterThan(RISK_LEVELS.risky.wager);
  });
});

describe('resultado do desafio', () => {
  it('acerto limpo vence a mesa, rende fichas, XP e combo', () => {
    const { run, profile } = newRun();
    const out = playEncounter(run, profile);
    const outcome = out.run.encounter?.outcome;
    expect(out.run.status).toBe('reward');
    expect(outcome?.bust).toBe(false);
    expect(outcome?.jackpot).toBe(true);
    expect(out.run.streak).toBe(1);
    expect(out.run.chips).toBeGreaterThan(run.chips);
    expect(out.profile.xp).toBeGreaterThan(0);
    expect(outcome?.rewardOptions.length).toBeGreaterThan(0);
  });

  it('risco multiplica as fichas ganhas e devolve a aposta na vitória', () => {
    const { run, profile } = newRun();
    const atLogic = { ...run, layerIndex: 1 };
    const safe = playEncounter(atLogic, profile).run;
    const risky = playEncounter(atLogic, profile, { risk: 'risky' }).run;
    const safeGain = safe.encounter?.outcome?.chipsGained ?? 0;
    const riskyGain = risky.encounter?.outcome?.chipsGained ?? 0;
    expect(riskyGain).toBe(Math.round(safeGain * RISK_LEVELS.risky.multiplier));
    expect(risky.chips).toBe(atLogic.chips + riskyGain); // a aposta voltou
    expect(risky.encounter?.outcome?.stakeDelta).toBe(0);
  });

  it('erros demais + solução vista = Bust: perde vida, aposta e combo', () => {
    const { run, profile } = newRun();
    const atLogic = { ...run, layerIndex: 1 };
    const out = playEncounter(atLogic, profile, {
      failures: 4,
      hints: 2,
      solution: true,
      risk: 'high',
    });
    const outcome = out.run.encounter?.outcome;
    expect(outcome?.bust).toBe(true);
    expect(outcome?.stakeDelta).toBe(-RISK_LEVELS.high.wager);
    expect(out.run.lives).toBe(2);
    expect(out.run.streak).toBe(0);
    expect(out.run.chips).toBe(atLogic.chips - RISK_LEVELS.high.wager);
    expect(outcome?.rewardOptions).toEqual([]);
    expect(out.profile.solved).toEqual({});
  });

  it('registra melhor pontuação por desafio', () => {
    const { run, profile } = newRun();
    const out = playEncounter(run, profile);
    const id = out.run.history[0]?.challengeId as string;
    expect(out.profile.solved[id]?.times).toBe(1);
  });
});

describe('recompensas e trilha', () => {
  it('escolher uma carta a adiciona ao baralho e avança', () => {
    const { run, profile } = newRun();
    const out = playEncounter(run, profile).run;
    const pick = out.encounter?.outcome?.rewardOptions[0];
    if (!pick) throw new Error('sem oferta');
    const next = unwrap(claimReward(out, pick));
    expect(next.deck.some((c) => c.cardId === pick)).toBe(true);
    expect(next.layerIndex).toBe(1);
    expect(next.status).toBe('map');
  });

  it('pular a carta rende fichas', () => {
    const { run, profile } = newRun();
    const out = playEncounter(run, profile).run;
    const next = unwrap(claimReward(out, null));
    expect(next.chips).toBeGreaterThan(out.chips);
  });

  it('recusa carta fora da oferta', () => {
    const { run, profile } = newRun();
    const out = playEncounter(run, profile).run;
    expect(claimReward(out, 'search').ok).toBe(false);
  });

  it('abre a loja depois da segunda mesa', () => {
    let { run, profile } = newRun();
    for (let i = 0; i < 2; i++) {
      const out = playEncounter(run, profile);
      profile = out.profile;
      run = unwrap(claimReward(out.run, null));
    }
    expect(run.status).toBe('shop');
    expect(run.shop?.offers.length).toBeGreaterThan(0);
  });

  it('perder a última vida encerra a run', () => {
    const { run, profile } = newRun();
    const out = playEncounter({ ...run, lives: 1 }, profile, { failures: 9, solution: true });
    expect(out.run.encounter?.outcome?.bust).toBe(true);
    expect(unwrap(claimReward(out.run, null)).status).toBe('lost');
  });
});

describe('boss', () => {
  it('um Bust no boss exige revanche enquanto houver vidas', () => {
    const { run, profile } = newRun();
    const atBoss = { ...run, layerIndex: RUN_LAYERS.length - 1 };
    const out = playEncounter(atBoss, profile, { failures: 9, solution: true });
    expect(out.run.encounter?.outcome?.bust).toBe(true);
    const retry = unwrap(claimReward(out.run, null));
    expect(retry.status).toBe('table');
    expect(retry.encounter?.challengeId).toBe('boss-infinite-loop');
    expect(retry.lives).toBe(2);
  });

  it('vencer o boss encerra a run com vitória', () => {
    const { run, profile } = newRun();
    const atBoss = { ...run, layerIndex: RUN_LAYERS.length - 1, streak: 6 };
    const out = playEncounter(atBoss, profile);
    expect(unwrap(claimReward(out.run, null)).status).toBe('won');
  });
});

describe('simulação de runs completas', () => {
  function fullRun(packId: string, style: PlayStyle) {
    let { run, profile } = newRun(packId, 7);
    let guard = 0;
    while (run.status !== 'won' && run.status !== 'lost' && guard++ < 40) {
      if (run.status === 'shop') {
        run = finishShop(run);
        continue;
      }
      const out = playEncounter(run, profile, style);
      profile = out.profile;
      const options = out.run.encounter?.outcome?.rewardOptions ?? [];
      run = unwrap(claimReward(out.run, options[0] ?? null));
    }
    return { run, profile };
  }

  it.each(STARTER_PACKS.map((p) => p.id))(
    'jogando limpo, o pacote %s chega à vitória sem Bust',
    (packId) => {
      const { run } = fullRun(packId, {});
      expect(run.status).toBe('won');
      expect(run.history.every((h) => !h.bust)).toBe(true);
      expect(run.history).toHaveLength(6);
    },
  );

  it('jogando sem estudar (solução vista sempre), a casa vence', () => {
    const { run } = fullRun('logica', { failures: 4, hints: 2, solution: true });
    expect(run.status).toBe('lost');
  });

  it('a vitória atualiza o perfil', () => {
    const { run, profile } = fullRun('dados', {});
    const finished = finishRunProfile(profile, run);
    expect(finished.runsWon).toBe(1);
    expect(finished.bestRunScore).toBe(run.score);
  });
});

describe('loja', () => {
  function inShop(chips = 200) {
    let { run, profile } = newRun();
    for (let i = 0; i < 2; i++) {
      const out = playEncounter(run, profile);
      profile = out.profile;
      run = unwrap(claimReward(out.run, null));
    }
    return { ...run, chips } as RunState;
  }

  it('compra uma carta cobrando o preço', () => {
    const run = inShop();
    const offer = run.shop?.offers[0];
    if (!offer) throw new Error();
    const next = unwrap(buyCard(run, offer));
    expect(next.deck).toHaveLength(run.deck.length + 1);
    expect(next.chips).toBeLessThan(run.chips);
    expect(next.shop?.offers).not.toContain(offer);
  });

  it('recusa compra sem fichas', () => {
    const run = inShop(0);
    expect(buyCard(run, run.shop?.offers[0] as never).ok).toBe(false);
  });

  it('reroll custa mais a cada uso', () => {
    const run = inShop();
    const once = unwrap(rerollShop(run));
    const twice = unwrap(rerollShop(once));
    expect(run.chips - once.chips).toBeLessThan(once.chips - twice.chips);
  });

  it('melhora uma carta até o limite', () => {
    let run = inShop(1000);
    const uid = run.deck[0]?.uid as string;
    for (let i = 0; i < 3; i++) run = unwrap(upgradeCard(run, uid));
    expect(deckEntry(run, uid).upgrade).toBe(3);
    expect(upgradeCard(run, uid).ok).toBe(false);
  });

  it('remove cartas, mas preserva um baralho mínimo', () => {
    let run = inShop(1000);
    while (run.deck.length > MIN_DECK_SIZE)
      run = unwrap(removeCard(run, run.deck[0]?.uid as string));
    expect(removeCard(run, run.deck[0]?.uid as string).ok).toBe(false);
  });

  it('compra de vida respeita o teto e o limite por loja', () => {
    const run = inShop(500);
    const next = unwrap(buyLife(run));
    expect(next.lives).toBe(run.lives + 1);
    expect(buyLife(next).ok).toBe(false);
    expect(buyLife({ ...run, lives: MAX_LIVES }).ok).toBe(false);
  });

  it('sair da loja leva à próxima mesa', () => {
    const next = unwrap(leaveShop(inShop()));
    expect(next.status).toBe('map');
  });

  it('só funciona na loja', () => {
    const { run } = newRun();
    expect(rerollShop(run).ok).toBe(false);
    expect(buyLife(run).ok).toBe(false);
  });
});

describe('progressão', () => {
  it('curva de XP é crescente e consistente', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(xpForLevel(2))).toBe(2);
    expect(levelFromXp(xpForLevel(3) - 1)).toBe(2);
    const p = xpProgress(xpForLevel(3) + 10);
    expect(p.level).toBe(3);
    expect(p.intoLevel).toBe(10);
    expect(p.ratio).toBeGreaterThan(0);
  });

  it('novas cartas só aparecem após desbloquear', () => {
    const rich: Profile = { ...createProfile(), xp: 0 };
    const { run } = newRun('logica', 3, rich);
    expect(run.unlockLevel).toBe(1);
    const seen = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const r = unwrap(createRun('logica', seed, rich));
      const layer = getCurrentLayer(r);
      if (layer.kind === 'shop') continue;
      const out = playEncounter(r, rich).run;
      for (const id of out.encounter?.outcome?.rewardOptions ?? []) seen.add(id);
    }
    expect(seen.has('search')).toBe(false);
    expect(seen.has('recursion')).toBe(false);
  });
});

describe('desbloqueio durante a run', () => {
  it('subir de nível libera novas cartas na mesma run', () => {
    const { run, profile } = newRun();
    expect(run.unlockLevel).toBe(1);
    const almost = { ...profile, xp: 79 };
    const out = playEncounter(run, almost);
    expect(out.run.unlockLevel).toBe(2);
  });
});
