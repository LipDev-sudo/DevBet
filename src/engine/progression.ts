import type { CardDef } from './types';

/** Progresso permanente do jogador, entre runs. */
export interface Profile {
  version: 1;
  xp: number;
  runsPlayed: number;
  runsWon: number;
  bestRunScore: number;
  /** Melhor pontuação e vezes resolvidas por desafio. */
  solved: Record<string, { best: number; times: number }>;
  /** Cartas já vistas: alimenta a coleção. */
  seenCards: string[];
}

export function createProfile(): Profile {
  return {
    version: 1,
    xp: 0,
    runsPlayed: 0,
    runsWon: 0,
    bestRunScore: 0,
    solved: {},
    seenCards: [],
  };
}

/** XP acumulado necessário para alcançar o nível `level` (nível 1 = 0 XP). */
export function xpForLevel(level: number): number {
  return 40 * level * (level - 1);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

export interface XpProgress {
  level: number;
  intoLevel: number;
  needed: number;
  ratio: number;
}

export function xpProgress(xp: number): XpProgress {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const needed = xpForLevel(level + 1) - floor;
  const intoLevel = xp - floor;
  return { level, intoLevel, needed, ratio: needed === 0 ? 1 : intoLevel / needed };
}

export function isUnlocked(card: CardDef, level: number): boolean {
  return card.unlockLevel <= level;
}
