import type { Challenge } from './challenge';
import { FAILURES_FOR_SOLUTION } from './scoring';

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
    return `A explicação completa só abre depois de ${FAILURES_FOR_SOLUTION} tentativas falhas. Tente de novo antes.`;
  }
  return null;
}

/** Dicas que contam na pontuação: a pergunta (nível 1) é gratuita. */
export function scoredHints(level: number): number {
  return Math.max(0, Math.min(level, 5) - 1);
}
