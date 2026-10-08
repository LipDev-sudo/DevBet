import { cardEffect, getCard } from './cards';
import { findActiveCombos, type ActiveCombo } from './combos';
import { evaluateHand } from './hands';
import type { CardId, DeckCard, HandRank } from './types';

export const STREAK_STEP = 0.15;
export const STREAK_CAP = 6;
export const FAIL_PENALTY = 0.08;
export const HINT_PENALTY = 0.1;
export const SOLUTION_FACTOR = 0.4;
export const MIN_PRECISION = 0.4;
/** Execuções ou entregas com falha necessárias para liberar a solução explicada. */
export const FAILURES_FOR_SOLUTION = 4;

export interface ScoreInput {
  basePoints: number;
  /** Conceitos de Python que o desafio realmente usa. */
  concepts: readonly CardId[];
  hand: readonly DeckCard[];
  /** Vitórias consecutivas antes deste desafio. */
  streak: number;
  failedSubmissions: number;
  voluntaryHints: number;
  solutionViewed: boolean;
}

export interface CardScoreLine {
  uid: string;
  name: string;
  chips: number;
  mult: number;
  /** O desafio usa o conceito desta carta: efeito dobrado. */
  boosted: boolean;
}

export interface ScoreBreakdown {
  basePoints: number;
  cards: CardScoreLine[];
  cardChips: number;
  cardMult: number;
  rank: HandRank;
  combos: ActiveCombo[];
  comboMult: number;
  /** Multiplicador final da mão (1 + cartas + combinação + combos). */
  mult: number;
  streakMult: number;
  precision: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function streakMultiplier(streak: number): number {
  return round2(1 + STREAK_STEP * Math.min(Math.max(streak, 0), STREAK_CAP));
}

export function precisionFactor(
  failedSubmissions: number,
  voluntaryHints: number,
  solutionViewed: boolean,
): number {
  const raw = 1 - FAIL_PENALTY * failedSubmissions - HINT_PENALTY * voluntaryHints;
  const clamped = Math.max(MIN_PRECISION, raw);
  return round2(solutionViewed ? clamped * SOLUTION_FACTOR : clamped);
}

/** Prévia da força da mão antes de escrever uma linha de código. */
export function previewHand(hand: readonly DeckCard[], concepts: readonly CardId[]) {
  const lines: CardScoreLine[] = hand.map((entry) => {
    const def = getCard(entry.cardId);
    const boosted = concepts.includes(def.id);
    const effect = cardEffect(def, entry.upgrade, boosted);
    return { uid: entry.uid, name: def.name, chips: effect.chips, mult: effect.mult, boosted };
  });
  const ids = hand.map((entry) => entry.cardId);
  const rank = evaluateHand(ids);
  const combos = findActiveCombos(ids, concepts);
  const sumChips = lines.reduce((sum, line) => sum + line.chips, 0);
  const sumMult = round2(lines.reduce((sum, line) => sum + line.mult, 0));
  const comboMult = round2(combos.reduce((sum, active) => sum + active.bonus, 0));
  const mult = round2(1 + sumMult + rank.mult + comboMult);
  return { lines, sumChips, sumMult, rank, combos, comboMult, mult };
}

export function computeScore(input: ScoreInput): ScoreBreakdown {
  const preview = previewHand(input.hand, input.concepts);
  const streakMult = streakMultiplier(input.streak);
  const precision = precisionFactor(
    input.failedSubmissions,
    input.voluntaryHints,
    input.solutionViewed,
  );
  const total = Math.round(
    (input.basePoints + preview.sumChips) * preview.mult * streakMult * precision,
  );
  return {
    basePoints: input.basePoints,
    cards: preview.lines,
    cardChips: preview.sumChips,
    cardMult: preview.sumMult,
    rank: preview.rank,
    combos: preview.combos,
    comboMult: preview.comboMult,
    mult: preview.mult,
    streakMult,
    precision,
    total,
  };
}
