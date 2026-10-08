import { getCard } from './cards';
import type { CardId, ComboDef } from './types';

/**
 * Combos são raros de propósito: exigem os DOIS conceitos na mão e que o desafio use os dois.
 * A relação entre eles é real (um conceito é usado junto do outro), não arbitrária.
 */
export const COMBOS: readonly ComboDef[] = [
  {
    id: 'iterator',
    name: 'ITERATOR',
    requires: ['list', 'for'],
    bonus: 0.8,
    description: 'for percorre uma lista item a item: é a iteração sobre uma coleção',
  },
  {
    id: 'filter-loop',
    name: 'FILTER LOOP',
    requires: ['for', 'condition'],
    bonus: 0.7,
    description: 'o loop visita cada item e a condição escolhe quais contam',
  },
  {
    id: 'logic-gate',
    name: 'LOGIC GATE',
    requires: ['boolean', 'condition'],
    bonus: 0.7,
    description: 'a condição decide o caminho a partir de um valor booleano',
  },
  {
    id: 'counter',
    name: 'COUNTER',
    requires: ['dictionary', 'for'],
    bonus: 0.8,
    description: 'o loop lê cada item e o dicionário guarda quantas vezes ele apareceu',
  },
  {
    id: 'dedupe',
    name: 'DEDUPE',
    requires: ['set', 'list'],
    bonus: 0.8,
    description: 'o set remove repetidos de uma lista',
  },
  {
    id: 'pure-function',
    name: 'PURE FUNCTION',
    requires: ['parameter', 'return'],
    bonus: 0.6,
    description: 'o resultado depende só dos parâmetros e é entregue por return',
  },
  {
    id: 'recursive-engine',
    name: 'RECURSIVE ENGINE',
    requires: ['function', 'recursion'],
    bonus: 0.9,
    description: 'uma função que chama a si mesma, reduzindo o problema a cada chamada',
  },
  {
    id: 'linear-scan',
    name: 'LINEAR SCAN',
    requires: ['search', 'for'],
    bonus: 0.8,
    description: 'a busca linear é um for que olha cada posição até achar',
  },
  {
    id: 'safe-loop',
    name: 'SAFE LOOP',
    requires: ['while', 'breakpoint'],
    bonus: 0.8,
    description: 'o breakpoint deixa inspecionar a variável que controla o while',
  },
  {
    id: 'tdd',
    name: 'TDD',
    requires: ['unit-test', 'function'],
    bonus: 0.7,
    description: 'o teste confirma o que a função devolve',
  },
];

export interface ActiveCombo {
  combo: ComboDef;
  /** Bônus de multiplicador aplicado neste desafio. */
  bonus: number;
}

/** Combos ativos: os dois conceitos na mão e usados pelo desafio. */
export function findActiveCombos(
  handIds: readonly CardId[],
  challengeConcepts: readonly CardId[],
): ActiveCombo[] {
  const inHand = new Set(handIds);
  const used = new Set(challengeConcepts);
  return COMBOS.filter((combo) => combo.requires.every((id) => inHand.has(id) && used.has(id))).map(
    (combo) => ({ combo, bonus: combo.bonus }),
  );
}

/** Combos que ainda não estão completos, mas que o conjunto já começou. Útil para dicas na loja. */
export function nearCombos(cardIds: readonly CardId[]): { combo: ComboDef; missing: CardId }[] {
  const owned = new Set(cardIds);
  return COMBOS.flatMap((combo) => {
    const missing = combo.requires.filter((id) => !owned.has(id));
    const first = missing[0];
    return missing.length === 1 && first ? [{ combo, missing: first }] : [];
  });
}

export function comboLabel(combo: ComboDef): string {
  return combo.requires.map((id) => getCard(id).name).join(' + ');
}
