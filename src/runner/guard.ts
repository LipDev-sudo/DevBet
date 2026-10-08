import { RUN_LIMITS } from './types';

export type RunDenial = 'too-long' | 'empty' | 'too-many-runs' | 'cooldown';

export interface RunGuardInput {
  /** `run` = Executar (testar); `submit` = Entregar. Só Executar tem limite total de usos. */
  kind: 'run' | 'submit';
  code: string;
  runsUsed: number;
  lastRunAt: number | null;
  now: number;
}

/**
 * Valida limites de uso antes de rodar o código. Devolve o motivo da recusa ou null.
 * O limite de execuções vale só para Executar: Entregar nunca fica bloqueado em definitivo
 * (restam apenas recusas temporárias: código vazio, grande demais ou intervalo entre execuções).
 */
export function checkRunAllowed({
  kind,
  code,
  runsUsed,
  lastRunAt,
  now,
}: RunGuardInput): RunDenial | null {
  if (code.trim().length === 0) return 'empty';
  if (code.length > RUN_LIMITS.maxCodeLength) return 'too-long';
  if (kind === 'run' && runsUsed >= RUN_LIMITS.maxRunsPerChallenge) return 'too-many-runs';
  if (lastRunAt !== null && now - lastRunAt < RUN_LIMITS.cooldownMs) return 'cooldown';
  return null;
}

export const DENIAL_MESSAGE: Record<RunDenial, string> = {
  empty: 'Escreva algum código antes de executar.',
  'too-long': `Seu código passou de ${RUN_LIMITS.maxCodeLength} caracteres. Simplifique.`,
  'too-many-runs':
    'Suas execuções de teste acabaram. Você ainda pode Entregar a solução ou Desistir do desafio.',
  cooldown: 'Calma, jogador. Aguarde um instante antes de executar de novo.',
};
