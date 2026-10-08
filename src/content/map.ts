import { BOSS_CHALLENGE, CHALLENGES } from './challenges';

export type MapLayer =
  | { kind: 'challenge'; areaId: string; options: string[] }
  | { kind: 'shop'; label: string }
  | { kind: 'boss'; areaId: string; options: string[] };

const areaOptions = (areaId: string) =>
  CHALLENGES.filter((challenge) => challenge.areaId === areaId).map((challenge) => challenge.id);

/**
 * Trilha de uma run: em cada mesa o jogador escolhe 1 entre 2 desafios.
 * Lojas ficam entre as áreas; o boss fecha a run.
 */
export const RUN_LAYERS: readonly MapLayer[] = [
  { kind: 'challenge', areaId: 'fundamentos', options: areaOptions('fundamentos') },
  { kind: 'challenge', areaId: 'logica', options: areaOptions('logica') },
  { kind: 'shop', label: 'Loja' },
  { kind: 'challenge', areaId: 'loops', options: areaOptions('loops') },
  { kind: 'challenge', areaId: 'estruturas', options: areaOptions('estruturas') },
  { kind: 'shop', label: 'Loja' },
  { kind: 'challenge', areaId: 'funcoes', options: areaOptions('funcoes') },
  { kind: 'shop', label: 'Última Chance' },
  { kind: 'boss', areaId: BOSS_CHALLENGE.areaId, options: [BOSS_CHALLENGE.id] },
];
