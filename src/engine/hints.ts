import type { Challenge } from './challenge';
import { FAILURES_FOR_SOLUTION, HINT_PENALTY, SOLUTION_FACTOR } from './scoring';

export type HintLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const HINT_LABEL: Record<Exclude<HintLevel, 0>, string> = {
  1: 'Pergunta',
  2: 'Pista',
  3: 'Conceito',
  4: 'Exemplo parcial',
  5: 'Explicação',
};

/** Nos bosses o Dealer só oferece até o conceito; depois disso, apenas a explicação final. */
export const BOSS_MAX_LADDER = 3;

/** Próximo nível de ajuda, na ordem. `null` quando não há mais nada a pedir. */
export function nextHintLevel(challenge: Challenge, current: number): Exclude<HintLevel, 0> | null {
  if (current >= 5) return null;
  if (challenge.boss && current >= BOSS_MAX_LADDER) return 5;
  return (current + 1) as Exclude<HintLevel, 0>;
}

/** Motivo para o próximo nível ainda não estar disponível, ou `null` se já pode ser pedido. */
export function hintBlockedReason(
  challenge: Challenge,
  current: number,
  failedRuns: number,
): string | null {
  const next = nextHintLevel(challenge, current);
  if (next === null) return 'Não há mais ajuda para este desafio.';
  if (next === 5 && failedRuns < FAILURES_FOR_SOLUTION) {
    return `A explicação completa só abre depois de ${FAILURES_FOR_SOLUTION} execuções ou entregas com falha (você tem ${failedRuns}). Tente de novo antes.`;
  }
  return null;
}

/** Dicas que contam na pontuação: a pergunta (nível 1) é gratuita. */
export function scoredHints(level: number): number {
  return Math.max(0, Math.min(level, 5) - 1);
}

export interface HintCost {
  /** Perda de precisão por esta dica, em pontos percentuais (0 = grátis). */
  precisionPercent: number;
  /** Ver a solução também multiplica a pontuação por `SOLUTION_FACTOR`. */
  solution: boolean;
  /** Texto curto, mostrado antes de o jogador pedir a dica. */
  label: string;
}

/** Custo, em pontuação, de pedir o próximo nível de ajuda. Vem das mesmas constantes do cálculo. */
export function hintCost(challenge: Challenge, current: number): HintCost | null {
  const next = nextHintLevel(challenge, current);
  if (next === null) return null;
  const precisionPercent = Math.round(
    HINT_PENALTY * (scoredHints(next) - scoredHints(current)) * 100,
  );
  const solution = next === 5;
  const solutionPercent = Math.round((1 - SOLUTION_FACTOR) * 100);
  const label = solution
    ? `${precisionPercent > 0 ? `−${precisionPercent}% e ` : ''}solução: −${solutionPercent}% da pontuação`
    : precisionPercent === 0
      ? 'grátis'
      : `−${precisionPercent}% de precisão`;
  return { precisionPercent, solution, label };
}
