import { exercisePool, getExercise } from '@/content/exercises';
import { BOSS_CHALLENGE } from '@/content/challenges';
import { CARDS, getCard, RARITY_WEIGHT } from './cards';
import { COMBOS } from './combos';
import { hintBlockedReason, nextHintLevel, scoredHints } from './hints';
import { scoreHand, previewPlay, type HandScore } from './handscore';
import { getJoker, JOKERS, RARITY_JOKER_WEIGHT } from './jokers';
import { levelFromXp, type Profile } from './progression';
import { createRng, shuffle, weightedSample, type Rng } from './rng';
import { initialTutorial, type TutorialState } from './tutorial-state';
import type { CardId, CategoryId, DeckCard, HandRankId, Rarity } from './types';

/* --------------------------------------------------------------- regras base */

export const HAND_SIZE = 8;
export const MAX_PLAY = 5;
export const BASE_HANDS = 4;
export const BASE_DISCARDS = 3;
export const JOKER_SLOTS = 5;
export const START_MONEY = 6;
export const DECK_COPIES = 2;
export const REROLL_BASE = 2;
export const HAND_UPGRADE_PRICE = 5;
export const MAX_DECK = 40;
export const MIN_DECK = 12;
/** Cartas jogadas fora da mão grande (1–3) pedem mini-desafios; 4–5 pedem desafios completos. */
export const BIG_HAND = 4;

export interface BossRule {
  id: string;
  name: string;
  text: string;
  maxPlay?: number;
  handsDelta?: number;
  noDiscards?: boolean;
  debuffCategory?: CategoryId;
  debuffRarity?: Rarity;
}

export interface BlindDef {
  id: string;
  ante: number;
  index: 0 | 1;
  name: string;
  target: number;
  reward: number;
  boss?: BossRule;
  /** Desafio que a PRIMEIRA mão da blind precisa usar (o chefe final). */
  forcedFirst?: string;
}

export interface AnteDef {
  index: number;
  areaId: string;
  name: string;
  blinds: [BlindDef, BlindDef];
}

const blind = (
  ante: number,
  index: 0 | 1,
  name: string,
  target: number,
  reward: number,
  extra: Partial<BlindDef> = {},
): BlindDef => ({ id: `a${ante + 1}b${index + 1}`, ante, index, name, target, reward, ...extra });

export const ANTES: readonly AnteDef[] = [
  {
    index: 0,
    areaId: 'fundamentos',
    name: 'Fundamentos',
    blinds: [
      blind(0, 0, 'Mesa Aberta', 600, 3),
      blind(0, 1, 'O Crupiê Cauteloso', 720, 5, {
        boss: {
          id: 'max-3',
          name: 'O Crupiê Cauteloso',
          text: 'Só dá para jogar até 3 cartas por mão.',
          maxPlay: 3,
        },
      }),
    ],
  },
  {
    index: 1,
    areaId: 'logica',
    name: 'Lógica',
    blinds: [
      blind(1, 0, 'Mesa de Decisões', 870, 4),
      blind(1, 1, 'O Juiz Rígido', 1040, 6, {
        boss: {
          id: 'debuff-controle',
          name: 'O Juiz Rígido',
          text: 'As cartas de CONTROLE (BOOLEAN, CONDITION…) não pontuam.',
          debuffCategory: 'controle',
        },
      }),
    ],
  },
  {
    index: 2,
    areaId: 'loops',
    name: 'Loops',
    blinds: [
      blind(2, 0, 'Mesa Giratória', 1250, 4),
      blind(2, 1, 'O Relojoeiro', 1500, 7, {
        boss: {
          id: 'hands-minus',
          name: 'O Relojoeiro',
          text: 'Você tem 1 mão a menos nesta blind.',
          handsDelta: -1,
        },
      }),
    ],
  },
  {
    index: 3,
    areaId: 'estruturas',
    name: 'Dados',
    blinds: [
      blind(3, 0, 'Mesa de Coleções', 1800, 5),
      blind(3, 1, 'O Arquivista', 2150, 8, {
        boss: {
          id: 'no-discards',
          name: 'O Arquivista',
          text: 'Você não pode descartar cartas nesta blind.',
          noDiscards: true,
        },
      }),
    ],
  },
  {
    index: 4,
    areaId: 'engenharia',
    name: 'High Table',
    blinds: [
      blind(4, 0, 'A Mesa Alta', 2600, 6),
      blind(4, 1, 'THE INFINITE LOOP', 3100, 12, {
        boss: {
          id: 'debuff-common',
          name: 'THE INFINITE LOOP',
          text: 'A 1ª mão é o desafio do boss. Cartas COMUNS não pontuam.',
          debuffRarity: 'common',
        },
        forcedFirst: BOSS_CHALLENGE.id,
      }),
    ],
  },
];

export const BLIND_COUNT = ANTES.length * 2;

export function blindDef(ante: number, index: number): BlindDef {
  const def = ANTES[ante]?.blinds[index];
  if (!def) throw new Error(`Blind inexistente: ${ante}/${index}`);
  return def;
}

/* --------------------------------------------------------------- baralhos */

export interface StarterPack {
  id: string;
  name: string;
  tagline: string;
  /** 12 conceitos; o baralho tem DECK_COPIES de cada. */
  cards: CardId[];
}

export const STARTER_PACKS: readonly StarterPack[] = [
  {
    id: 'logica',
    name: 'Pacote Lógica',
    tagline: 'BOOLEAN + CONDITION formam um LOGIC GATE; FOR e WHILE mantêm o ritmo.',
    cards: [
      'variable',
      'operator',
      'boolean',
      'condition',
      'for',
      'while',
      'function',
      'parameter',
      'return',
      'list',
      'search',
      'unit-test',
    ],
  },
  {
    id: 'dados',
    name: 'Pacote Dados',
    tagline: 'LIST + FOR = ITERATOR; DICTIONARY + FOR = COUNTER; SET + LIST = DEDUPE.',
    cards: [
      'variable',
      'operator',
      'condition',
      'for',
      'list',
      'dictionary',
      'set',
      'function',
      'return',
      'boolean',
      'search',
      'breakpoint',
    ],
  },
  {
    id: 'funcoes',
    name: 'Pacote Funções',
    tagline: 'FUNCTION, PARAMETER e RETURN: o esqueleto de todo código que você escreve.',
    cards: [
      'variable',
      'operator',
      'function',
      'parameter',
      'return',
      'condition',
      'for',
      'list',
      'boolean',
      'recursion',
      'while',
      'unit-test',
    ],
  },
];

/** Baralho da Tutorial Run: único que garante o combo do primeiro desafio (PURE FUNCTION). */
export const TUTORIAL_PACK_ID = 'funcoes';

/* ------------------------------------------------------------------ estado */

export type RunStatus =
  | 'blind' // tela da blind: meta, regra do boss, botão de começar
  | 'round' // escolhendo cartas
  | 'coding' // resolvendo o exercício da mão jogada
  | 'scored' // pontuação da mão na tela
  | 'cleared' // blind vencida: resumo da recompensa
  | 'shop'
  | 'won'
  | 'lost';

export interface Play {
  /** Cartas jogadas, na ordem em que foram escolhidas (a primeira lidera o exercício). */
  uids: string[];
  exerciseId: string;
  failedRuns: number;
  failedSubmissions: number;
  hintLevel: number;
  solutionViewed: boolean;
  runsUsed: number;
  draft: string | null;
}

export interface HandResult {
  uids: string[];
  exerciseId: string;
  score: HandScore;
  /** O jogador desistiu da mão: pontuação zero. */
  forfeit: boolean;
  /** Código entregue, para mostrar o que pontuou. */
  code: string;
}

export interface Round {
  blindId: string;
  target: number;
  handsLeft: number;
  discardsLeft: number;
  roundScore: number;
  handsPlayed: number;
  drawPile: string[];
  discardPile: string[];
  hand: string[];
  play: Play | null;
  last: HandResult | null;
  /** Recompensa calculada quando a blind é vencida. */
  payout: Payout | null;
}

export interface Payout {
  blind: number;
  handsLeft: number;
  interest: number;
  total: number;
}

export type ShopItem =
  | { kind: 'joker'; id: string; price: number }
  | { kind: 'card'; cardId: CardId; price: number }
  | { kind: 'hand'; rank: HandRankId; price: number };

export interface ShopState {
  items: ShopItem[];
  rerolls: number;
}

export interface BlindHistory {
  blindId: string;
  name: string;
  target: number;
  score: number;
  cleared: boolean;
  hands: number;
}

export interface RunState {
  version: 3;
  id: string;
  seed: number;
  step: number;
  nextUid: number;
  unlockLevel: number;
  status: RunStatus;
  ante: number;
  blindIndex: 0 | 1;
  money: number;
  deck: DeckCard[];
  jokers: string[];
  handLevels: Partial<Record<HandRankId, number>>;
  usedExercises: string[];
  /** Maior pontuação de uma mão nesta run. */
  bestHand: number;
  score: number;
  xpEarned: number;
  round: Round | null;
  shop: ShopState | null;
  tutorial?: TutorialState | null;
  endReason?: 'abandoned';
  history: BlindHistory[];
}

export type Result<T> = { ok: true; state: T } | { ok: false; reason: string };
const ok = <T>(state: T): Result<T> => ({ ok: true, state });
const fail = (reason: string): Result<never> => ({ ok: false, reason });

function rngFor(state: RunState): Rng {
  return createRng((state.seed ^ Math.imul(state.step + 1, 0x9e3779b1)) >>> 0);
}

export function currentBlind(state: RunState): BlindDef {
  return blindDef(state.ante, state.blindIndex);
}

export function deckEntry(state: RunState, uid: string): DeckCard {
  const entry = state.deck.find((card) => card.uid === uid);
  if (!entry) throw new Error(`Carta fora do baralho: ${uid}`);
  return entry;
}

export function handCards(state: RunState): DeckCard[] {
  return state.round ? state.round.hand.map((uid) => deckEntry(state, uid)) : [];
}

export function playedCards(state: RunState): DeckCard[] {
  const play = state.round?.play;
  return play ? play.uids.map((uid) => deckEntry(state, uid)) : [];
}

/* -------------------------------------------------------------- regras de boss */

export function bossRule(state: RunState): BossRule | null {
  return currentBlind(state).boss ?? null;
}

export function maxPlayFor(state: RunState): number {
  return bossRule(state)?.maxPlay ?? MAX_PLAY;
}

export function isDebuffed(state: RunState, card: DeckCard): boolean {
  const rule = bossRule(state);
  if (!rule) return false;
  const def = getCard(card.cardId);
  return (
    (rule.debuffCategory !== undefined && def.category === rule.debuffCategory) ||
    (rule.debuffRarity !== undefined && def.rarity === rule.debuffRarity)
  );
}

export function handLevel(state: RunState, rank: HandRankId): number {
  return state.handLevels[rank] ?? 1;
}

/* ----------------------------------------------------------------- criação */

export function createRun(packId: string, seed: number, profile: Profile): Result<RunState> {
  const pack = STARTER_PACKS.find((p) => p.id === packId);
  if (!pack) return fail('Pacote inicial desconhecido.');
  const deck: DeckCard[] = [];
  for (let copy = 0; copy < DECK_COPIES; copy++) {
    for (const cardId of pack.cards) deck.push({ uid: `d${deck.length}`, cardId, upgrade: 0 });
  }
  return ok({
    version: 3,
    id: `run-${seed.toString(36)}`,
    seed: seed >>> 0,
    step: 0,
    nextUid: deck.length,
    unlockLevel: levelFromXp(profile.xp),
    status: 'blind',
    ante: 0,
    blindIndex: 0,
    money: START_MONEY,
    deck,
    jokers: [],
    handLevels: {},
    usedExercises: [],
    bestHand: 0,
    score: 0,
    xpEarned: 0,
    round: null,
    shop: null,
    tutorial: profile.tutorialCompleted ? null : initialTutorial(),
    history: [],
  });
}

/* ------------------------------------------------------------------- rodada */

/** Compra cartas do monte (reembaralhando o descarte quando acaba) até a mão ter `HAND_SIZE`. */
function drawUp(round: Round, rng: Rng): Round {
  let { drawPile, discardPile } = round;
  const hand = [...round.hand];
  while (hand.length < HAND_SIZE) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break;
      drawPile = shuffle(discardPile, rng);
      discardPile = [];
    }
    const next = drawPile[0];
    if (next === undefined) break;
    hand.push(next);
    drawPile = drawPile.slice(1);
  }
  return { ...round, hand, drawPile, discardPile };
}

export function startBlind(state: RunState): Result<RunState> {
  if (state.status !== 'blind') return fail('Não é hora de começar uma blind.');
  const def = currentBlind(state);
  const rng = rngFor(state);
  let pile = shuffle(
    state.deck.map((card) => card.uid),
    rng,
  );
  // Só na primeira blind da Tutorial Run: as duas cartas de um combo real (PURE FUNCTION) vêm na mão.
  if (state.tutorial && state.history.length === 0) {
    const combo = COMBOS.find((c) => c.id === 'pure-function');
    const needed = (combo?.requires ?? []).flatMap((id) => {
      const card = state.deck.find((entry) => entry.cardId === id);
      return card ? [card.uid] : [];
    });
    pile = [...needed, ...pile.filter((uid) => !needed.includes(uid))];
  }
  const round = drawUp(
    {
      blindId: def.id,
      target: def.target,
      handsLeft: BASE_HANDS + (def.boss?.handsDelta ?? 0),
      discardsLeft: def.boss?.noDiscards ? 0 : BASE_DISCARDS,
      roundScore: 0,
      handsPlayed: 0,
      drawPile: pile,
      discardPile: [],
      hand: [],
      play: null,
      last: null,
      payout: null,
    },
    rng,
  );
  return ok({ ...state, step: state.step + 1, status: 'round', round });
}

function inHand(round: Round, uids: readonly string[]): string | null {
  if (uids.length === 0) return 'Escolha ao menos uma carta.';
  if (new Set(uids).size !== uids.length) return 'Carta repetida na escolha.';
  if (!uids.every((uid) => round.hand.includes(uid))) return 'Essa carta não está na sua mão.';
  return null;
}

export function canDiscard(state: RunState, uids: readonly string[]): string | null {
  const round = state.round;
  if (state.status !== 'round' || !round) return 'Só dá para descartar durante a rodada.';
  if (bossRule(state)?.noDiscards) return 'Esta blind não permite descartes.';
  if (round.discardsLeft <= 0) return 'Seus descartes acabaram.';
  if (uids.length > MAX_PLAY) return `Descarte no máximo ${MAX_PLAY} cartas.`;
  return inHand(round, uids);
}

export function discard(state: RunState, uids: readonly string[]): Result<RunState> {
  const reason = canDiscard(state, uids);
  if (reason) return fail(reason);
  const round = state.round as Round;
  const rng = rngFor(state);
  const next = drawUp(
    {
      ...round,
      discardsLeft: round.discardsLeft - 1,
      hand: round.hand.filter((uid) => !uids.includes(uid)),
      discardPile: [...round.discardPile, ...uids],
    },
    rng,
  );
  return ok({ ...state, step: state.step + 1, round: next });
}

export function canPlay(state: RunState, uids: readonly string[]): string | null {
  const round = state.round;
  if (state.status !== 'round' || !round) return 'Só dá para jogar uma mão durante a rodada.';
  if (round.handsLeft <= 0) return 'Você não tem mais mãos.';
  if (uids.length > maxPlayFor(state)) {
    return `Nesta blind você joga no máximo ${maxPlayFor(state)} carta${maxPlayFor(state) === 1 ? '' : 's'}.`;
  }
  return inHand(round, uids);
}

/** Exercício da mão: o conceito da 1ª carta escolhida decide o tema; mãos grandes pedem desafios maiores. */
export function pickExercise(
  state: RunState,
  uids: readonly string[],
  rng: Rng,
): { id: string; forced: boolean } {
  const round = state.round as Round;
  const def = currentBlind(state);
  if (def.forcedFirst && round.handsPlayed === 0) return { id: def.forcedFirst, forced: true };
  const lead = deckEntry(state, uids[0] as string).cardId;
  const pool = exercisePool(lead, uids.length >= BIG_HAND);
  const fresh = pool.filter((exercise) => !state.usedExercises.includes(exercise.id));
  const choices = fresh.length > 0 ? fresh : pool;
  const exercise = choices[Math.floor(rng() * choices.length)];
  if (!exercise) throw new Error(`Sem exercício para ${lead}`);
  return { id: exercise.id, forced: false };
}

export function playHand(state: RunState, uids: readonly string[]): Result<RunState> {
  const reason = canPlay(state, uids);
  if (reason) return fail(reason);
  const round = state.round as Round;
  const picked = pickExercise(state, uids, rngFor(state));
  return ok({
    ...state,
    step: state.step + 1,
    status: 'coding',
    usedExercises: state.usedExercises.includes(picked.id)
      ? state.usedExercises
      : [...state.usedExercises, picked.id],
    round: {
      ...round,
      hand: round.hand.filter((uid) => !uids.includes(uid)),
      play: {
        uids: [...uids],
        exerciseId: picked.id,
        failedRuns: 0,
        failedSubmissions: 0,
        hintLevel: 0,
        solutionViewed: false,
        runsUsed: 0,
        draft: null,
      },
    },
  });
}

/* --------------------------------------------------- durante o exercício */

function patchPlay(state: RunState, patch: Partial<Play>): RunState {
  const round = state.round;
  if (!round?.play) return state;
  return { ...state, round: { ...round, play: { ...round.play, ...patch } } };
}

export function saveDraft(state: RunState, draft: string): RunState {
  return patchPlay(state, { draft });
}

export function registerRun(state: RunState): RunState {
  const play = state.round?.play;
  return play ? patchPlay(state, { runsUsed: play.runsUsed + 1 }) : state;
}

export function registerFailure(state: RunState, kind: 'run' | 'submit'): RunState {
  const play = state.round?.play;
  if (!play) return state;
  return patchPlay(state, {
    failedRuns: play.failedRuns + 1,
    failedSubmissions: play.failedSubmissions + (kind === 'submit' ? 1 : 0),
  });
}

export function requestHint(state: RunState): Result<RunState> {
  const play = state.round?.play;
  if (state.status !== 'coding' || !play) return fail('Nenhum exercício em andamento.');
  const exercise = getExercise(play.exerciseId);
  const blocked = hintBlockedReason(exercise, play.hintLevel, play.failedRuns);
  if (blocked) return fail(blocked);
  const level = nextHintLevel(exercise, play.hintLevel) as number;
  return ok(
    patchPlay(state, { hintLevel: level, solutionViewed: play.solutionViewed || level === 5 }),
  );
}

/** Conta a mão no placar e deixa a pontuação na tela. */
function settleHand(state: RunState, code: string, forfeit: boolean): RunState {
  const round = state.round as Round;
  const play = round.play as Play;
  const exercise = getExercise(play.exerciseId);
  const played = play.uids.map((uid) => deckEntry(state, uid));
  const level = (rank: HandRankId) => handLevel(state, rank);
  const preview = previewPlay(played, exercise.concepts);
  const score = scoreHand({
    played,
    concepts: exercise.concepts,
    jokers: state.jokers,
    code,
    firstTry: play.failedSubmissions === 0,
    failedSubmissions: play.failedSubmissions,
    hintsUsed: scoredHints(play.hintLevel),
    solutionViewed: play.solutionViewed,
    handLevel: level(preview.rank.id),
    debuffed: (card) => isDebuffed(state, card),
  });
  const total = forfeit ? 0 : score.total;
  const roundScore = round.roundScore + total;
  return {
    ...state,
    step: state.step + 1,
    status: 'scored',
    score: state.score + total,
    bestHand: Math.max(state.bestHand, total),
    xpEarned: state.xpEarned + (forfeit ? 0 : 10),
    round: {
      ...round,
      roundScore,
      handsLeft: round.handsLeft - 1,
      handsPlayed: round.handsPlayed + 1,
      play: null,
      discardPile: [...round.discardPile, ...play.uids],
      last: {
        uids: play.uids,
        exerciseId: play.exerciseId,
        score: forfeit ? { ...score, total: 0 } : score,
        forfeit,
        code,
      },
    },
  };
}

/** O código passou em todos os testes: a mão pontua. */
export function submitHand(state: RunState, code: string): Result<RunState> {
  if (state.status !== 'coding' || !state.round?.play)
    return fail('Nenhum exercício em andamento.');
  return ok(settleHand(state, code, false));
}

/** Desistir do exercício: a mão é gasta e não pontua. */
export function forfeitHand(state: RunState): Result<RunState> {
  if (state.status !== 'coding' || !state.round?.play)
    return fail('Nenhum exercício em andamento.');
  return ok(settleHand(state, state.round.play.draft ?? '', true));
}

/* ------------------------------------------------- depois da pontuação */

export function interestFor(money: number): number {
  return Math.min(5, Math.floor(money / 5));
}

function clearedHistory(state: RunState, cleared: boolean): BlindHistory[] {
  const round = state.round as Round;
  const def = currentBlind(state);
  return [
    ...state.history,
    {
      blindId: def.id,
      name: def.name,
      target: round.target,
      score: round.roundScore,
      cleared,
      hands: round.handsPlayed,
    },
  ];
}

/** Segue depois do placar: vitória da blind, derrota (sem mãos) ou nova rodada de escolha. */
export function continueAfterScore(state: RunState): Result<RunState> {
  const round = state.round;
  if (state.status !== 'scored' || !round) return fail('Nada a continuar.');
  if (round.roundScore >= round.target) {
    const def = currentBlind(state);
    const interest = interestFor(state.money);
    const payout: Payout = {
      blind: def.reward,
      handsLeft: round.handsLeft,
      interest,
      total: def.reward + round.handsLeft + interest,
    };
    return ok({
      ...state,
      step: state.step + 1,
      status: 'cleared',
      money: state.money + payout.total,
      xpEarned: state.xpEarned + 30,
      history: clearedHistory(state, true),
      round: { ...round, payout },
    });
  }
  if (round.handsLeft <= 0) {
    return ok({ ...state, status: 'lost', history: clearedHistory(state, false) });
  }
  const rng = rngFor(state);
  return ok({ ...state, step: state.step + 1, status: 'round', round: drawUp(round, rng) });
}

/* --------------------------------------------------------------------- loja */

export function jokerPrice(id: string): number {
  return getJoker(id).price;
}

export function cardPrice(cardId: CardId): number {
  return Math.max(2, Math.round(getCard(cardId).price / 6));
}

export function sellPrice(id: string): number {
  return Math.max(1, Math.floor(getJoker(id).price / 2));
}

export const rerollPrice = (shop: ShopState) => REROLL_BASE + shop.rerolls;

const SHOP_RANKS: HandRankId[] = ['pair', 'flush', 'straight', 'full-house'];

function shopItems(state: RunState, rng: Rng): ShopItem[] {
  const ownedJokers = new Set(state.jokers);
  const jokerPool = JOKERS.filter((joker) => !ownedJokers.has(joker.id));
  const jokers = weightedSample(jokerPool, 2, (j) => RARITY_JOKER_WEIGHT[j.rarity], rng).map(
    (joker): ShopItem => ({ kind: 'joker', id: joker.id, price: joker.price }),
  );
  const cardPool = CARDS.filter((card) => card.unlockLevel <= state.unlockLevel);
  const cards = weightedSample(cardPool, 2, (c) => RARITY_WEIGHT[c.rarity], rng).map(
    (card): ShopItem => ({ kind: 'card', cardId: card.id, price: cardPrice(card.id) }),
  );
  const rank = SHOP_RANKS[Math.floor(rng() * SHOP_RANKS.length)] as HandRankId;
  return [...jokers, ...cards, { kind: 'hand', rank, price: HAND_UPGRADE_PRICE }];
}

/** Sai da tela de blind vencida: vitória na última blind, ou loja. */
export function openShop(state: RunState): Result<RunState> {
  if (state.status !== 'cleared') return fail('A loja só abre depois de vencer uma blind.');
  const isLast = state.ante === ANTES.length - 1 && state.blindIndex === 1;
  if (isLast) return ok({ ...state, step: state.step + 1, status: 'won', round: null });
  const rng = rngFor(state);
  return ok({
    ...state,
    step: state.step + 1,
    status: 'shop',
    shop: { items: shopItems(state, rng), rerolls: 0 },
  });
}

export function buyItem(state: RunState, index: number): Result<RunState> {
  const shop = state.shop;
  if (state.status !== 'shop' || !shop) return fail('A loja está fechada.');
  const item = shop.items[index];
  if (!item) return fail('Esse item não está mais à venda.');
  if (item.price > state.money) {
    return fail(`Faltam ${item.price - state.money} fichas para comprar isso.`);
  }
  const items = shop.items.filter((_, i) => i !== index);
  const paid = { ...state, money: state.money - item.price, shop: { ...shop, items } };
  if (item.kind === 'joker') {
    if (state.jokers.length >= JOKER_SLOTS) {
      return fail(`Seus ${JOKER_SLOTS} espaços de joker estão cheios. Venda um para liberar.`);
    }
    return ok({ ...paid, jokers: [...state.jokers, item.id] });
  }
  if (item.kind === 'card') {
    if (state.deck.length >= MAX_DECK) return fail('Seu baralho já está no limite.');
    const entry: DeckCard = { uid: `d${state.nextUid}`, cardId: item.cardId, upgrade: 0 };
    return ok({ ...paid, deck: [...state.deck, entry], nextUid: state.nextUid + 1 });
  }
  return ok({
    ...paid,
    handLevels: { ...state.handLevels, [item.rank]: handLevel(state, item.rank) + 1 },
  });
}

export function rerollShop(state: RunState): Result<RunState> {
  const shop = state.shop;
  if (state.status !== 'shop' || !shop) return fail('A loja está fechada.');
  const price = rerollPrice(shop);
  if (price > state.money) return fail(`Rolar de novo custa ${price} fichas.`);
  const rng = rngFor(state);
  return ok({
    ...state,
    step: state.step + 1,
    money: state.money - price,
    shop: { items: shopItems(state, rng), rerolls: shop.rerolls + 1 },
  });
}

export function sellJoker(state: RunState, id: string): Result<RunState> {
  if (!state.jokers.includes(id)) return fail('Você não tem esse joker.');
  if (state.status !== 'shop' && state.status !== 'round' && state.status !== 'blind') {
    return fail('Só dá para vender jokers entre as mãos.');
  }
  const index = state.jokers.indexOf(id);
  return ok({
    ...state,
    money: state.money + sellPrice(id),
    jokers: state.jokers.filter((_, i) => i !== index),
  });
}

/** Troca a ordem de dois jokers: eles disparam da esquerda para a direita. */
export function moveJoker(state: RunState, from: number, to: number): Result<RunState> {
  const jokers = [...state.jokers];
  if (from < 0 || to < 0 || from >= jokers.length || to >= jokers.length) {
    return fail('Posição inválida.');
  }
  const [moved] = jokers.splice(from, 1);
  jokers.splice(to, 0, moved as string);
  return ok({ ...state, jokers });
}

export function leaveShop(state: RunState): Result<RunState> {
  if (state.status !== 'shop') return fail('Você não está na loja.');
  const nextIndex = state.blindIndex === 0 ? 1 : 0;
  const nextAnte = state.blindIndex === 1 ? state.ante + 1 : state.ante;
  return ok({
    ...state,
    step: state.step + 1,
    status: 'blind',
    ante: nextAnte,
    blindIndex: nextIndex as 0 | 1,
    shop: null,
    round: null,
  });
}

/* ------------------------------------------------------------------ fim */

export function finishRunProfile(profile: Profile, run: RunState): Profile {
  return {
    ...profile,
    xp: profile.xp + run.xpEarned,
    runsPlayed: profile.runsPlayed + 1,
    runsWon: profile.runsWon + (run.status === 'won' ? 1 : 0),
    tutorialCompleted: profile.tutorialCompleted || Boolean(run.tutorial),
    bestRunScore: Math.max(profile.bestRunScore, run.score),
    seenCards: [...new Set([...profile.seenCards, ...run.deck.map((card) => card.cardId)])],
  };
}
