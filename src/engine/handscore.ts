import { cardEffect, getCard } from './cards';
import { findActiveCombos, type ActiveCombo } from './combos';
import { evaluateHand } from './hands';
import { getJoker, type JokerContext } from './jokers';
import type { CardId, DeckCard, HandRank, HandRankId } from './types';

/** Fichas e multiplicador de partida de cada mão, como no pôquer: a mão certa já vale muito antes das cartas. */
export const RANK_BASE: Record<HandRankId, { chips: number; mult: number }> = {
  'high-card': { chips: 5, mult: 1 },
  pair: { chips: 10, mult: 2 },
  flush: { chips: 20, mult: 3 },
  straight: { chips: 25, mult: 4 },
  'full-house': { chips: 30, mult: 5 },
  'royal-flush': { chips: 50, mult: 8 },
};

/** Cada nível de mão (comprado na loja) soma isto à mão. */
export const LEVEL_CHIPS = 10;
export const LEVEL_MULT = 1;

/** O efeito das cartas é pequeno (0.1…0.5); aqui vira o multiplicador "inteiro" do placar. */
export const CARD_MULT_SCALE = 4;

export const FAIL_PENALTY = 0.1;
export const HINT_PENALTY = 0.1;
export const SOLUTION_FACTOR = 0.4;
export const MIN_PRECISION = 0.4;
/** Execuções ou entregas com falha necessárias para liberar a solução explicada. */
export const FAILURES_FOR_SOLUTION = 4;

export type StepKind = 'rank' | 'card' | 'combo' | 'joker' | 'precision';

export interface ScoreStep {
  kind: StepKind;
  label: string;
  /** Soma/produto aplicado neste passo (para mostrar "+12", "+3", "×1.5"). */
  addChips: number;
  addMult: number;
  xMult: number;
  /** Totais depois do passo: é o que o placar mostra enquanto anima. */
  chips: number;
  mult: number;
  uid?: string;
  jokerId?: string;
  boosted?: boolean;
  debuffed?: boolean;
}

export interface HandScore {
  rank: HandRank;
  steps: ScoreStep[];
  combos: ActiveCombo[];
  chips: number;
  mult: number;
  precision: number;
  total: number;
}

export interface HandScoreInput {
  /** Cartas jogadas, na ordem em que foram escolhidas. */
  played: readonly DeckCard[];
  /** Conceitos que o exercício usa: as cartas desses conceitos valem o dobro. */
  concepts: readonly CardId[];
  jokers: readonly string[];
  code: string;
  firstTry: boolean;
  failedSubmissions: number;
  hintsUsed: number;
  solutionViewed: boolean;
  /** Nível da mão jogada (1 = padrão). */
  handLevel?: number;
  /** Cartas que a regra do boss anula. */
  debuffed?: (card: DeckCard) => boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function precisionFactor(
  failedSubmissions: number,
  hintsUsed: number,
  solutionViewed: boolean,
): number {
  const raw = 1 - FAIL_PENALTY * failedSubmissions - HINT_PENALTY * hintsUsed;
  const clamped = Math.max(MIN_PRECISION, raw);
  return Math.round((solutionViewed ? clamped * SOLUTION_FACTOR : clamped) * 100) / 100;
}

/** Mão que vai ser jogada, ainda sem código: o que o jogador vê ao escolher as cartas. */
export function previewPlay(
  played: readonly DeckCard[],
  concepts: readonly CardId[],
  handLevel = 1,
  debuffed?: (card: DeckCard) => boolean,
) {
  const ids = played.map((card) => card.cardId);
  const rank = evaluateHand(ids);
  const base = RANK_BASE[rank.id];
  let chips = base.chips + (handLevel - 1) * LEVEL_CHIPS;
  let mult = base.mult + (handLevel - 1) * LEVEL_MULT;
  for (const card of played) {
    if (debuffed?.(card)) continue;
    const effect = cardEffect(getCard(card.cardId), card.upgrade, concepts.includes(card.cardId));
    chips += effect.chips;
    mult += effect.mult * CARD_MULT_SCALE;
  }
  const combos = findActiveCombos(ids, ids);
  for (const active of combos) mult += active.bonus * CARD_MULT_SCALE;
  return { rank, chips, mult: round1(mult), combos };
}

export function scoreHand(input: HandScoreInput): HandScore {
  const ids = input.played.map((card) => card.cardId);
  const rank = evaluateHand(ids);
  const base = RANK_BASE[rank.id];
  const level = input.handLevel ?? 1;
  const steps: ScoreStep[] = [];
  let chips = base.chips + (level - 1) * LEVEL_CHIPS;
  let mult = base.mult + (level - 1) * LEVEL_MULT;

  const push = (
    step: Omit<ScoreStep, 'chips' | 'mult' | 'addChips' | 'addMult' | 'xMult'> &
      Partial<Pick<ScoreStep, 'addChips' | 'addMult' | 'xMult'>>,
  ) => {
    const addChips = step.addChips ?? 0;
    const addMult = step.addMult ?? 0;
    const xMult = step.xMult ?? 1;
    chips += addChips;
    mult = round1((mult + addMult) * xMult);
    steps.push({ ...step, addChips, addMult, xMult, chips, mult });
  };

  steps.push({
    kind: 'rank',
    label: level > 1 ? `${rank.name} nv.${level}` : rank.name,
    addChips: chips,
    addMult: mult,
    xMult: 1,
    chips,
    mult,
  });

  for (const card of input.played) {
    const def = getCard(card.cardId);
    if (input.debuffed?.(card)) {
      push({ kind: 'card', label: def.name, uid: card.uid, debuffed: true });
      continue;
    }
    const boosted = input.concepts.includes(card.cardId);
    const effect = cardEffect(def, card.upgrade, boosted);
    push({
      kind: 'card',
      label: def.name,
      uid: card.uid,
      boosted,
      addChips: effect.chips,
      addMult: round1(effect.mult * CARD_MULT_SCALE),
    });
  }

  const combos = findActiveCombos(ids, ids);
  for (const active of combos) {
    push({
      kind: 'combo',
      label: active.combo.name,
      addMult: round1(active.bonus * CARD_MULT_SCALE),
    });
  }

  const ctx: JokerContext = {
    code: input.code,
    firstTry: input.firstTry,
    handRankId: rank.id,
    comboCount: combos.length,
    playedCount: input.played.length,
  };
  for (const id of input.jokers) {
    const joker = getJoker(id);
    const times = joker.triggers(ctx);
    for (let i = 0; i < times; i++) {
      const effect = joker.effect;
      push({
        kind: 'joker',
        label: joker.name,
        jokerId: id,
        addChips: effect.kind === 'chips' ? effect.value : 0,
        addMult: effect.kind === 'mult' ? effect.value : 0,
        xMult: effect.kind === 'xmult' ? effect.value : 1,
      });
    }
  }

  const precision = precisionFactor(input.failedSubmissions, input.hintsUsed, input.solutionViewed);
  if (precision < 1) {
    steps.push({
      kind: 'precision',
      label: 'PRECISÃO',
      addChips: 0,
      addMult: 0,
      xMult: precision,
      chips,
      mult,
    });
  }
  return {
    rank,
    steps,
    combos,
    chips,
    mult,
    precision,
    total: Math.round(chips * mult * precision),
  };
}
