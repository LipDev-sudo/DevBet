import { RUN_LIMITS } from './types';

export type RunDenial = 'too-long' | 'empty' | 'too-many-runs' | 'cooldown';

export interface RunGuardInput {
  code: string;
  runsUsed: number;
  lastRunAt: number | null;
  now: number;
}

/** Valida limites de uso antes de gastar uma execução. Devolve o motivo da recusa ou null. */
export function checkRunAllowed({
  code,
  runsUsed,
  lastRunAt,
  now,
}: RunGuardInput): RunDenial | null {
  if (code.trim().length === 0) return 'empty';
  if (code.length > RUN_LIMITS.maxCodeLength) return 'too-long';
  if (runsUsed >= RUN_LIMITS.maxRunsPerChallenge) return 'too-many-runs';
  if (lastRunAt !== null && now - lastRunAt < RUN_LIMITS.cooldownMs) return 'cooldown';
  return null;
}

export const DENIAL_MESSAGE: Record<RunDenial, string> = {
  empty: 'Escreva algum código antes de executar.',
  'too-long': `Seu código passou de ${RUN_LIMITS.maxCodeLength} caracteres. Simplifique.`,
  'too-many-runs': 'A casa fechou a mesa: você usou todas as execuções deste desafio.',
  cooldown: 'Calma, jogador. Aguarde um instante antes de executar de novo.',
};
