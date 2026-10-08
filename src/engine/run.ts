import { getChallenge } from '@/content/challenges';
import { RUN_LAYERS, type MapLayer } from '@/content/map';
import { getCard, CARDS, RARITY_WEIGHT } from './cards';
import { hintBlockedReason, nextHintLevel, scoredHints } from './hints';
import { levelFromXp, type Profile } from './progression';
import { createRng, shuffle, weightedSample, type Rng } from './rng';
import { computeScore, type ScoreBreakdown } from './scoring';
import type { CardId, DeckCard } from './types';

export const HAND_SIZE = 5;
export const START_CHIPS = 30;
export const START_LIVES = 3;
export const MAX_LIVES = 5;

/** Risco/recompensa com fichas fictícias: maior risco = maior prêmio e maior perda se der Bust. */
export type RiskLevel = 'safe' | 'risky' | 'high';

export interface RiskDef {
  label: string;
  /** Multiplica as fichas ganhas ao vencer a mesa. */
  multiplier: number;
  /** Fichas colocadas na mesa: voltam se você vencer, perdem-se no Bust. */
  wager: number;
  /** Dificuldade mínima do desafio para liberar este nível (o primeiro desafio é sempre SAFE). */
  minDifficulty: number;
}

export const RISK_LEVELS: Record<RiskLevel, RiskDef> = {
  safe: { label: 'SAFE', multiplier: 1, wager: 0, minDifficulty: 1 },
  risky: { label: 'RISKY', multiplier: 1.5, wager: 10, minDifficulty: 2 },
  high: { label: 'HIGH RISK', multiplier: 2, wager: 25, minDifficulty: 2 },
};
export const RISK_ORDER: readonly RiskLevel[] = ['safe', 'risky', 'high'];
export const MIN_DECK_SIZE = 4;
export const MAX_UPGRADE = 3;
export const REROLL_BASE = 5;
export const LIFE_PRICE = 40;
export const SKIP_REWARD_CHIPS = 8;

export interface StarterPack {
  id: string;
  name: string;
  tagline: string;
  cards: CardId[];
}

export const STARTER_PACKS: readonly StarterPack[] = [
  {
    id: 'logica',
    name: 'Pacote Lógica',
    tagline: 'Decisões afiadas: BOOLEAN e CONDITION formam um LOGIC GATE nas mesas de lógica.',
    cards: ['variable', 'operator', 'boolean', 'condition', 'function'],
  },
  {
    id: 'dados',
    name: 'Pacote Dados',
    tagline: 'Coleções: LIST + FOR formam um ITERATOR, e DICTIONARY + FOR um COUNTER.',
    cards: ['variable', 'for', 'list', 'dictionary', 'condition'],
  },
  {
    id: 'funcoes',
    name: 'Pacote Funções',
    tagline: 'FUNCTION, PARAMETER e RETURN: o esqueleto de todo código que você escreve.',
    cards: ['variable', 'operator', 'function', 'parameter', 'return'],
  },
];

export type RunStatus = 'map' | 'table' | 'challenge' | 'reward' | 'shop' | 'won' | 'lost';

export interface EncounterOutcome {
  score: ScoreBreakdown;
  target: number;
  bust: boolean;
  /** Pontuação de pelo menos 2× a meta. */
  highRoll: boolean;
  /** Acerto de primeira, sem erros nem dicas. */
  jackpot: boolean;
  /** O código enviado casa com o padrão de solução eficiente do desafio. */
  efficient: boolean;
  chipsGained: number;
  /** Variação líquida de fichas pela aposta: positiva no ganho, negativa no bust. */
  /** Perda líquida de fichas pela aposta: 0 ao vencer (a aposta volta), negativa no Bust. */
  stakeDelta: number;
  risk: RiskLevel;
  xpGained: number;
  livesLost: number;
  rewardOptions: CardId[];
}

export interface Encounter {
  challengeId: string;
  hand: string[];
  redrawsLeft: number;
  risk: RiskLevel;
  failedRuns: number;
  failedSubmissions: number;
  voluntaryHints: number;
  /** Maior nível de ajuda do Dealer já pedido (0–5). */
  hintLevel: number;
  solutionViewed: boolean;
  runsUsed: number;
  draft: string | null;
  outcome: EncounterOutcome | null;
}

export interface ShopState {
  offers: CardId[];
  rerolls: number;
  boughtLife: boolean;
}

export interface RunState {
  /** 2 = Python + conceitos + risco. Saves da versão 1 são migrados ao carregar. */
  version: 2;
  id: string;
  seed: number;
  step: number;
  nextUid: number;
  unlockLevel: number;
  status: RunStatus;
  layerIndex: number;
  chips: number;
  lives: number;
  streak: number;
  score: number;
  xpEarned: number;
  removals: number;
  deck: DeckCard[];
  encounter: Encounter | null;
  shop: ShopState | null;
  history: {
    challengeId: string;
    score: number;
    bust: boolean;
    /** Contexto do resultado, para explicar a derrota. */
    target?: number;
    failedRuns?: number;
    hintLevel?: number;
    risk?: RiskLevel;
  }[];
}

export type Result<T> = { ok: true; state: T } | { ok: false; reason: string };

const ok = <T>(state: T): Result<T> => ({ ok: true, state });
const fail = (reason: string): Result<never> => ({ ok: false, reason });

function rngFor(state: RunState): Rng {
  return createRng((state.seed ^ Math.imul(state.step + 1, 0x9e3779b1)) >>> 0);
}

function currentLayer(state: RunState): MapLayer {
  const layer = RUN_LAYERS[state.layerIndex];
  if (!layer) throw new Error(`Camada inexistente: ${state.layerIndex}`);
  return layer;
}

export function getCurrentLayer(state: RunState): MapLayer {
  return currentLayer(state);
}

export function deckEntry(state: RunState, uid: string): DeckCard {
  const entry = state.deck.find((card) => card.uid === uid);
  if (!entry) throw new Error(`Carta fora do baralho: ${uid}`);
  return entry;
}

export function handCards(state: RunState): DeckCard[] {
  return state.encounter ? state.encounter.hand.map((uid) => deckEntry(state, uid)) : [];
}

/* ---------------------------------------------------------------- criação */

export function createRun(packId: string, seed: number, profile: Profile): Result<RunState> {
  const pack = STARTER_PACKS.find((p) => p.id === packId);
  if (!pack) return fail('Pacote inicial desconhecido.');
  const deck = pack.cards.map((cardId, index) => ({ uid: `d${index}`, cardId, upgrade: 0 }));
  return ok({
    version: 2,
    id: `run-${seed.toString(36)}`,
    seed: seed >>> 0,
    step: 0,
    nextUid: deck.length,
    unlockLevel: levelFromXp(profile.xp),
    status: 'map',
    layerIndex: 0,
    chips: START_CHIPS,
    lives: START_LIVES,
    streak: 0,
    score: 0,
    xpEarned: 0,
    removals: 0,
    deck,
    encounter: null,
    shop: null,
    history: [],
  });
}

/* ------------------------------------------------------------------ mão */

export function dealHand(deck: readonly DeckCard[], rng: Rng, size = HAND_SIZE): string[] {
  return shuffle(deck, rng)
    .slice(0, size)
    .map((card) => card.uid);
}

function newEncounter(state: RunState, challengeId: string): RunState {
  const rng = rngFor(state);
  return {
    ...state,
    step: state.step + 1,
    status: 'table',
    encounter: {
      challengeId,
      hand: dealHand(state.deck, rng),
      redrawsLeft: 1,
      risk: 'safe',
      failedRuns: 0,
      failedSubmissions: 0,
      voluntaryHints: 0,
      hintLevel: 0,
      solutionViewed: false,
      runsUsed: 0,
      draft: null,
      outcome: null,
    },
  };
}

/** Escolhe um desafio na mesa atual e senta o jogador. */
export function chooseChallenge(state: RunState, challengeId: string): Result<RunState> {
  const layer = currentLayer(state);
  if (state.status !== 'map' || layer.kind === 'shop')
    return fail('Não é hora de escolher um desafio.');
  if (!layer.options.includes(challengeId)) return fail('Esse desafio não está nesta mesa.');
  return ok(newEncounter(state, challengeId));
}

export function redrawHand(state: RunState): Result<RunState> {
  const encounter = state.encounter;
  if (state.status !== 'table' || !encounter) return fail('Só é possível trocar a mão na mesa.');
  if (encounter.redrawsLeft <= 0) return fail('Você já usou a troca desta mesa.');
  const rng = rngFor(state);
  return ok({
    ...state,
    step: state.step + 1,
    encounter: {
      ...encounter,
      hand: dealHand(state.deck, rng),
      redrawsLeft: encounter.redrawsLeft - 1,
    },
  });
}

export function riskAvailability(
  difficulty: number,
  risk: RiskLevel,
  chips: number,
): { ok: true } | { ok: false; reason: string } {
  const def = RISK_LEVELS[risk];
  if (difficulty < def.minDifficulty) {
    return { ok: false, reason: 'Disponível a partir da mesa LOGIC. Comece com SAFE.' };
  }
  if (def.wager > chips) return { ok: false, reason: 'Fichas insuficientes para esse risco.' };
  return { ok: true };
}

export function setRisk(state: RunState, risk: RiskLevel): Result<RunState> {
  const encounter = state.encounter;
  if (state.status !== 'table' || !encounter)
    return fail('Só é possível escolher o risco na mesa.');
  if (!(risk in RISK_LEVELS)) return fail('Risco inválido.');
  const availability = riskAvailability(
    getChallenge(encounter.challengeId).difficulty,
    risk,
    state.chips,
  );
  if (!availability.ok) return fail(availability.reason);
  return ok({ ...state, encounter: { ...encounter, risk } });
}

/** Aposta recolhida e desafio liberado. */
export function startChallenge(state: RunState): Result<RunState> {
  const encounter = state.encounter;
  if (state.status !== 'table' || !encounter) return fail('Nenhuma mesa aberta.');
  const wager = RISK_LEVELS[encounter.risk].wager;
  if (wager > state.chips) return fail('Fichas insuficientes para esse risco.');
  return ok({ ...state, status: 'challenge', chips: state.chips - wager });
}

/* ------------------------------------------------------ durante o desafio */

function patchEncounter(state: RunState, patch: Partial<Encounter>): RunState {
  if (!state.encounter) return state;
  return { ...state, encounter: { ...state.encounter, ...patch } };
}

export function saveDraft(state: RunState, draft: string): RunState {
  return patchEncounter(state, { draft });
}

export function registerRun(state: RunState): RunState {
  const encounter = state.encounter;
  return encounter ? patchEncounter(state, { runsUsed: encounter.runsUsed + 1 }) : state;
}

export function registerFailure(state: RunState, kind: 'run' | 'submit'): RunState {
  const encounter = state.encounter;
  if (!encounter) return state;
  return patchEncounter(state, {
    failedRuns: encounter.failedRuns + 1,
    failedSubmissions: encounter.failedSubmissions + (kind === 'submit' ? 1 : 0),
  });
}

/** Pede o próximo nível de ajuda do Dealer. A pergunta (nível 1) não custa pontos; os demais custam. */
export function requestHint(state: RunState): Result<RunState> {
  const encounter = state.encounter;
  if (state.status !== 'challenge' || !encounter) return fail('Nenhum desafio em andamento.');
  const challenge = getChallenge(encounter.challengeId);
  const blocked = hintBlockedReason(challenge, encounter.hintLevel, encounter.failedRuns);
  if (blocked) return fail(blocked);
  const level = nextHintLevel(challenge, encounter.hintLevel) as number;
  return ok(
    patchEncounter(state, {
      hintLevel: level,
      voluntaryHints: scoredHints(level),
      solutionViewed: encounter.solutionViewed || level === 5,
    }),
  );
}

/* ------------------------------------------------------------ resultado */

/** Recompensa em fichas por vencer a mesa. */
export function chipRewardFor(
  base: number,
  opts: { jackpot: boolean; highRoll: boolean; royal: boolean },
) {
  const jackpotBonus = opts.jackpot ? Math.round(base * 0.5) : 0;
  return base + jackpotBonus + (opts.highRoll ? 10 : 0) + (opts.royal ? 10 : 0);
}

export function computeOutcome(
  state: RunState,
  rng: Rng,
): { outcome: EncounterOutcome; livesLeft: number } {
  const encounter = state.encounter;
  if (!encounter) throw new Error('Nenhum desafio em andamento.');
  const challenge = getChallenge(encounter.challengeId);
  const hand = encounter.hand.map((uid) => deckEntry(state, uid));
  const score = computeScore({
    basePoints: challenge.basePoints,
    concepts: challenge.concepts,
    hand,
    streak: state.streak,
    failedSubmissions: encounter.failedSubmissions,
    voluntaryHints: encounter.voluntaryHints,
    solutionViewed: encounter.solutionViewed,
  });
  const bust = score.total < challenge.target;
  const highRoll = !bust && score.total >= challenge.target * 2;
  const jackpot =
    !bust &&
    encounter.failedRuns === 0 &&
    encounter.voluntaryHints === 0 &&
    !encounter.solutionViewed;
  const royal = score.rank.id === 'royal-flush';
  const efficient =
    !bust && !encounter.solutionViewed && matchesEfficient(challenge.efficient, encounter.draft);

  const risk = RISK_LEVELS[encounter.risk];
  const chipsGained = bust
    ? 0
    : Math.round(
        chipRewardFor(challenge.chipReward, { jackpot, highRoll, royal }) * risk.multiplier,
      );
  const stakeDelta = bust ? -risk.wager : 0;
  const xpGained = Math.round(challenge.xp * (bust ? 0.5 : 1)) + (jackpot ? 10 : 0);
  const livesLost = bust ? 1 : 0;

  const owned = new Set(state.deck.map((card) => card.cardId));
  const rewardOptions = bust
    ? []
    : pickOffers(owned, state.unlockLevel, 3, rng, challenge.boss ? 'rare' : 'common');

  return {
    livesLeft: state.lives - livesLost,
    outcome: {
      score,
      target: challenge.target,
      bust,
      highRoll,
      jackpot,
      efficient,
      chipsGained,
      stakeDelta,
      risk: encounter.risk,
      xpGained,
      livesLost,
      rewardOptions,
    },
  };
}

function matchesEfficient(rule: { pattern: string } | undefined, code: string | null): boolean {
  if (!rule || !code) return false;
  try {
    return new RegExp(rule.pattern).test(code);
  } catch {
    return false;
  }
}

function pickOffers(
  owned: ReadonlySet<CardId>,
  unlockLevel: number,
  count: number,
  rng: Rng,
  minRarity: 'common' | 'rare',
): CardId[] {
  const pool = CARDS.filter((card) => card.unlockLevel <= unlockLevel && !owned.has(card.id));
  const weight = (card: (typeof CARDS)[number]) =>
    RARITY_WEIGHT[card.rarity] * (minRarity === 'rare' && card.rarity === 'common' ? 0.3 : 1);
  return weightedSample(pool, count, weight, rng).map((card) => card.id);
}

/**
 * Registra a entrega aprovada: calcula pontuação, fichas, XP e vidas.
 * O perfil é atualizado junto, pois XP e melhor pontuação são permanentes.
 */
export function resolveEncounter(
  state: RunState,
  profile: Profile,
): { run: RunState; profile: Profile } {
  if (state.status !== 'challenge' || !state.encounter) {
    throw new Error('Nenhum desafio em andamento para resolver.');
  }
  const rng = rngFor(state);
  const { outcome, livesLeft } = computeOutcome(state, rng);
  const challengeId = state.encounter.challengeId;
  const previous = profile.solved[challengeId];
  const payout = outcome.bust ? 0 : RISK_LEVELS[state.encounter.risk].wager;

  const run: RunState = {
    ...state,
    step: state.step + 1,
    status: 'reward',
    // Subir de nível durante a run já libera novas cartas nas próximas lojas e recompensas.
    unlockLevel: Math.max(state.unlockLevel, levelFromXp(profile.xp + outcome.xpGained)),
    chips: state.chips + outcome.chipsGained + payout,
    lives: livesLeft,
    streak: outcome.bust ? 0 : state.streak + 1,
    score: state.score + (outcome.bust ? 0 : outcome.score.total),
    xpEarned: state.xpEarned + outcome.xpGained,
    encounter: { ...state.encounter, outcome },
    history: [
      ...state.history,
      {
        challengeId,
        score: outcome.score.total,
        bust: outcome.bust,
        target: outcome.target,
        failedRuns: state.encounter.failedRuns,
        hintLevel: state.encounter.hintLevel,
        risk: state.encounter.risk,
      },
    ],
  };

  const solved = outcome.bust
    ? profile.solved
    : {
        ...profile.solved,
        [challengeId]: {
          best: Math.max(previous?.best ?? 0, outcome.score.total),
          times: (previous?.times ?? 0) + 1,
        },
      };
  const seen = new Set(profile.seenCards);
  for (const uid of state.encounter.hand) seen.add(deckEntry(state, uid).cardId);

  return {
    run,
    profile: { ...profile, xp: profile.xp + outcome.xpGained, solved, seenCards: [...seen] },
  };
}

/* -------------------------------------------------------- avançar a trilha */

function advance(state: RunState): RunState {
  const nextIndex = state.layerIndex + 1;
  if (nextIndex >= RUN_LAYERS.length)
    return { ...state, status: 'won', encounter: null, shop: null };
  const next = RUN_LAYERS[nextIndex] as MapLayer;
  const base: RunState = { ...state, layerIndex: nextIndex, encounter: null, shop: null };
  if (next.kind === 'shop') return openShop({ ...base, status: 'shop' });
  return { ...base, status: 'map' };
}

/** Fecha a recompensa: escolhe uma carta (ou pula, ganhando fichas) e segue em frente. */
export function claimReward(state: RunState, cardId: CardId | null): Result<RunState> {
  const encounter = state.encounter;
  const outcome = encounter?.outcome;
  if (state.status !== 'reward' || !encounter || !outcome)
    return fail('Nenhuma recompensa pendente.');

  let next = state;
  if (cardId !== null) {
    if (!outcome.rewardOptions.includes(cardId)) return fail('Essa carta não está na oferta.');
    next = addCard(next, cardId);
  } else if (!outcome.bust) {
    next = { ...next, chips: next.chips + SKIP_REWARD_CHIPS };
  }

  if (next.lives <= 0) return ok({ ...next, status: 'lost', encounter: null });

  const challenge = getChallenge(encounter.challengeId);
  if (outcome.bust && challenge.boss) {
    // O boss exige revanche: nova mão, mesma mesa.
    return ok(newEncounter({ ...next, encounter: null }, challenge.id));
  }
  return ok(advance(next));
}

function addCard(state: RunState, cardId: CardId): RunState {
  const entry: DeckCard = { uid: `d${state.nextUid}`, cardId, upgrade: 0 };
  return { ...state, deck: [...state.deck, entry], nextUid: state.nextUid + 1 };
}

/* ------------------------------------------------------------------ loja */

function openShop(state: RunState): RunState {
  const rng = rngFor(state);
  const owned = new Set(state.deck.map((card) => card.cardId));
  return {
    ...state,
    step: state.step + 1,
    shop: {
      offers: pickOffers(owned, state.unlockLevel, 3, rng, 'common'),
      rerolls: 0,
      boughtLife: false,
    },
  };
}

export const rerollPrice = (shop: ShopState) => REROLL_BASE + shop.rerolls * 3;
export const upgradePrice = (card: DeckCard) => 20 + card.upgrade * 15;
export const removePrice = (state: RunState) => 15 + state.removals * 10;

export function buyCard(state: RunState, cardId: CardId): Result<RunState> {
  const shop = state.shop;
  if (state.status !== 'shop' || !shop) return fail('A loja está fechada.');
  if (!shop.offers.includes(cardId)) return fail('Essa carta não está à venda.');
  const price = getCard(cardId).price;
  if (state.chips < price) return fail('Fichas insuficientes.');
  const bought = addCard({ ...state, chips: state.chips - price }, cardId);
  return ok({ ...bought, shop: { ...shop, offers: shop.offers.filter((id) => id !== cardId) } });
}

export function rerollShop(state: RunState): Result<RunState> {
  const shop = state.shop;
  if (state.status !== 'shop' || !shop) return fail('A loja está fechada.');
  const price = rerollPrice(shop);
  if (state.chips < price) return fail('Fichas insuficientes.');
  const rng = rngFor(state);
  const owned = new Set(state.deck.map((card) => card.cardId));
  return ok({
    ...state,
    step: state.step + 1,
    chips: state.chips - price,
    shop: {
      ...shop,
      rerolls: shop.rerolls + 1,
      offers: pickOffers(owned, state.unlockLevel, 3, rng, 'common'),
    },
  });
}

export function upgradeCard(state: RunState, uid: string): Result<RunState> {
  if (state.status !== 'shop') return fail('A loja está fechada.');
  const entry = state.deck.find((card) => card.uid === uid);
  if (!entry) return fail('Carta não encontrada.');
  if (entry.upgrade >= MAX_UPGRADE) return fail('Essa carta já está no nível máximo.');
  const price = upgradePrice(entry);
  if (state.chips < price) return fail('Fichas insuficientes.');
  return ok({
    ...state,
    chips: state.chips - price,
    deck: state.deck.map((card) =>
      card.uid === uid ? { ...card, upgrade: card.upgrade + 1 } : card,
    ),
  });
}

export function removeCard(state: RunState, uid: string): Result<RunState> {
  if (state.status !== 'shop') return fail('A loja está fechada.');
  if (state.deck.length <= MIN_DECK_SIZE)
    return fail(`Mantenha ao menos ${MIN_DECK_SIZE} cartas no baralho.`);
  if (!state.deck.some((card) => card.uid === uid)) return fail('Carta não encontrada.');
  const price = removePrice(state);
  if (state.chips < price) return fail('Fichas insuficientes.');
  return ok({
    ...state,
    chips: state.chips - price,
    removals: state.removals + 1,
    deck: state.deck.filter((card) => card.uid !== uid),
  });
}

export function buyLife(state: RunState): Result<RunState> {
  const shop = state.shop;
  if (state.status !== 'shop' || !shop) return fail('A loja está fechada.');
  if (shop.boughtLife) return fail('O seguro já foi contratado nesta loja.');
  if (state.lives >= MAX_LIVES) return fail('Você já está com o máximo de vidas.');
  if (state.chips < LIFE_PRICE) return fail('Fichas insuficientes.');
  return ok({
    ...state,
    chips: state.chips - LIFE_PRICE,
    lives: state.lives + 1,
    shop: { ...shop, boughtLife: true },
  });
}

export function leaveShop(state: RunState): Result<RunState> {
  if (state.status !== 'shop') return fail('Você não está na loja.');
  return ok(advance(state));
}

/* ------------------------------------------------------------- fim de run */

/** Atualiza o perfil quando a run termina (vitória ou derrota). */
export function finishRunProfile(profile: Profile, run: RunState): Profile {
  return {
    ...profile,
    runsPlayed: profile.runsPlayed + 1,
    runsWon: profile.runsWon + (run.status === 'won' ? 1 : 0),
    bestRunScore: Math.max(profile.bestRunScore, run.score),
    seenCards: [...new Set([...profile.seenCards, ...run.deck.map((card) => card.cardId)])],
  };
}
