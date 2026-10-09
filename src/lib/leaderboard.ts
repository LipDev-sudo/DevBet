import type { RunState } from '@/engine/blind';

/** Regras do placar. As mesmas constantes valem no cliente e em `firestore.rules`. */
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 16;
/** Pontuação máxima aceita pelas regras do banco (acima disso é tratada como forjada). */
export const MAX_SCORE = 200_000;
export const LEADERBOARD_SIZE = 20;
export const NICKNAME_STORAGE_KEY = 'devbet:nickname:v1';

/** Palavras (inteiras) que não aparecem no placar, que é público e usado em escolas. Lista curta; modere pelo console. */
const BLOCKED = [
  'porra',
  'caralho',
  'puta',
  'merda',
  'bosta',
  'cu',
  'fdp',
  'viado',
  'buceta',
  'foda',
  'nazi',
  'hitler',
];

const ALLOWED = /^[\p{L}\p{N} _.-]+$/u;

export type NicknameResult = { ok: true; nickname: string } | { ok: false; reason: string };

/** Normaliza e valida o apelido público. Nunca use e-mail ou nome completo no placar. */
export function sanitizeNickname(raw: string): NicknameResult {
  const nickname = raw.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (nickname.length < NICKNAME_MIN) {
    return { ok: false, reason: `O apelido precisa de pelo menos ${NICKNAME_MIN} caracteres.` };
  }
  if (nickname.length > NICKNAME_MAX) {
    return { ok: false, reason: `O apelido pode ter no máximo ${NICKNAME_MAX} caracteres.` };
  }
  if (!ALLOWED.test(nickname)) {
    return { ok: false, reason: 'Use só letras, números, espaço, ponto, hífen e sublinhado.' };
  }
  if (nickname.includes('@')) {
    return { ok: false, reason: 'Não use e-mail como apelido.' };
  }
  const flat = nickname.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const words = flat.split(/[\s_.-]+/);
  if (BLOCKED.some((bad) => words.includes(bad))) {
    return { ok: false, reason: 'Esse apelido não é permitido. Escolha outro.' };
  }
  return { ok: true, nickname };
}

/** O que vai para o banco: só dados do jogo e o apelido. Nada pessoal. */
export interface LeaderboardEntry {
  nickname: string;
  score: number;
  bestHand: number;
  blindsCleared: number;
  won: boolean;
}

/**
 * Entrada do placar a partir da run (em andamento ou encerrada), ou `null` se ela ainda não deve pontuar.
 * O placar acompanha a run em tempo real: cada mão que soma pontos pode atualizar o registro do jogador.
 */
export function entryFromRun(run: RunState, nickname: string): LeaderboardEntry | null {
  if (run.score <= 0) return null;
  const clean = sanitizeNickname(nickname);
  if (!clean.ok) return null;
  return {
    nickname: clean.nickname,
    score: Math.min(MAX_SCORE, Math.max(0, Math.round(run.score))),
    bestHand: Math.min(MAX_SCORE, Math.max(0, Math.round(run.bestHand))),
    blindsCleared: run.history.filter((blind) => blind.cleared).length,
    won: run.status === 'won',
  };
}

/** O registro do jogador acompanha a run atual: qualquer pontuação diferente da gravada o substitui (um registro por jogador). */
export function shouldReplace(current: { score: number } | null, next: { score: number }): boolean {
  return current === null || next.score !== current.score;
}
