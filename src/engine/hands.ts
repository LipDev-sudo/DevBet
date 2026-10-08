import { getCard } from './cards';
import type { CardId, HandRank, HandRankId } from './types';

export const HAND_RANKS: Record<HandRankId, HandRank> = {
  'high-card': {
    id: 'high-card',
    name: 'HIGH CARD',
    description: 'Nenhuma combinação. Cada carta vale por si.',
    mult: 0,
  },
  pair: {
    id: 'pair',
    name: 'PAIR',
    description: 'Duas cartas que tratam do mesmo assunto.',
    mult: 0.5,
  },
  flush: {
    id: 'flush',
    name: 'FLUSH',
    description: 'Três ou mais cartas da mesma categoria.',
    mult: 1,
  },
  straight: {
    id: 'straight',
    name: 'STRAIGHT',
    description:
      'Três conceitos em sequência na trilha de aprendizado (ex.: CONDITION → FOR → LIST).',
    mult: 1.5,
  },
  'full-house': {
    id: 'full-house',
    name: 'FULL HOUSE',
    description: 'Controle + Estruturas + Funções na mesma mão: lógica, dados e abstração.',
    mult: 2,
  },
  'royal-flush': {
    id: 'royal-flush',
    name: 'ROYAL HAND',
    description:
      'Quatro ou mais conceitos avançados (recursão, busca, testes, depuração) numa só mão.',
    mult: 4,
  },
};

export const ROYAL_MIN_LEVEL = 6;

function hasPair(cardIds: readonly CardId[]): boolean {
  const counts = new Map<string, number>();
  for (const id of cardIds) {
    for (const topic of getCard(id).topics) counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }
  return [...counts.values()].some((n) => n >= 2);
}

function hasFlush(cardIds: readonly CardId[]): boolean {
  const counts = new Map<string, number>();
  for (const id of cardIds) {
    const category = getCard(id).category;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.values()].some((n) => n >= 3);
}

function hasStraight(cardIds: readonly CardId[]): boolean {
  const levels = [...new Set(cardIds.map((id) => getCard(id).level))].sort((a, b) => a - b);
  let run = 1;
  for (let i = 1; i < levels.length; i++) {
    run = levels[i] === (levels[i - 1] as number) + 1 ? run + 1 : 1;
    if (run >= 3) return true;
  }
  return false;
}

function hasFullHouse(cardIds: readonly CardId[]): boolean {
  const categories = new Set(cardIds.map((id) => getCard(id).category));
  return categories.has('controle') && categories.has('estruturas') && categories.has('funcoes');
}

function isRoyal(cardIds: readonly CardId[]): boolean {
  if (cardIds.length < 4) return false;
  const advanced = cardIds.filter((id) => getCard(id).level >= ROYAL_MIN_LEVEL).length;
  return advanced >= 4;
}

/** Avalia a mão e devolve a melhor combinação encontrada. */
export function evaluateHand(cardIds: readonly CardId[]): HandRank {
  if (isRoyal(cardIds)) return HAND_RANKS['royal-flush'];
  if (hasFullHouse(cardIds)) return HAND_RANKS['full-house'];
  if (hasStraight(cardIds)) return HAND_RANKS.straight;
  if (hasFlush(cardIds)) return HAND_RANKS.flush;
  if (hasPair(cardIds)) return HAND_RANKS.pair;
  return HAND_RANKS['high-card'];
}
