import type { Challenge } from '@/engine/challenge';
import type { CardId } from '@/engine/types';
import { ALL_CHALLENGES } from './challenges';
import { MINI_CHALLENGES } from './minis';

/** Todo exercício que uma mão pode pedir: os mini-desafios (1–3 cartas) e os desafios completos (4–5 cartas). */
export const ALL_EXERCISES: readonly Challenge[] = [...ALL_CHALLENGES, ...MINI_CHALLENGES];

const BY_ID = new Map(ALL_EXERCISES.map((exercise) => [exercise.id, exercise]));

export function getExercise(id: string): Challenge {
  const exercise = BY_ID.get(id);
  if (!exercise) throw new Error(`Exercício desconhecido: ${id}`);
  return exercise;
}

export function hasExercise(id: string): boolean {
  return BY_ID.has(id);
}

export const isMini = (exercise: Challenge) => exercise.id.startsWith('mini-');

/**
 * Exercícios candidatos para a carta que lidera a mão. Mãos grandes (4–5 cartas) pedem um desafio completo
 * que use o conceito; se não houver, cai para um mini-desafio do conceito.
 */
export function exercisePool(lead: CardId, big: boolean): Challenge[] {
  const minis = MINI_CHALLENGES.filter((exercise) => exercise.concepts[0] === lead);
  if (!big) return minis;
  const full = ALL_CHALLENGES.filter(
    (exercise) => !exercise.boss && exercise.concepts.includes(lead),
  );
  return full.length > 0 ? full : minis;
}
