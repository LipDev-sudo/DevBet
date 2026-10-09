import type { CardId, CategoryId, Rarity } from './types';

/**
 * Jokers do DEVBet são IDIOMAS de Python: cada um explica um jeito de escrever código bom e dispara quando a
 * sua mão tem as cartas daquele assunto. Como no pôquer, o jogador monta a mão (e a ordem dos jokers) para
 * fazer tudo disparar junto.
 */
export type JokerEffect =
  | { kind: 'chips'; value: number }
  | { kind: 'mult'; value: number }
  | { kind: 'xmult'; value: number };

export interface JokerContext {
  /** Acertou a pergunta da mão de primeira. */
  firstTry: boolean;
  handRankId: string;
  comboCount: number;
  playedCount: number;
  /** Conceitos das cartas jogadas que pontuam (as anuladas pelo boss ficam de fora). */
  cardIds: readonly CardId[];
  categories: readonly CategoryId[];
}

export interface JokerDef {
  id: string;
  name: string;
  /** Rótulo curto exibido no cartão (o idioma). */
  tag: string;
  rarity: Rarity;
  price: number;
  effect: JokerEffect;
  /** Quando dispara, em uma frase. */
  when: string;
  /** O que o idioma é e por que ele é bom. */
  lesson: string;
  /** Exemplo de código real do idioma. */
  snippet: string;
  /** Quantas vezes dispara (0 = não dispara). Sempre determinístico a partir da mão. */
  triggers: (ctx: JokerContext) => number;
}

const has = (ctx: JokerContext, ...ids: CardId[]) => ids.every((id) => ctx.cardIds.includes(id));

export const JOKERS: readonly JokerDef[] = [
  {
    id: 'comprehension',
    name: 'LIST COMPREHENSION',
    tag: '[x for x in ...]',
    rarity: 'rare',
    price: 8,
    effect: { kind: 'mult', value: 6 },
    when: 'Você jogou LIST e FOR juntas.',
    lesson:
      'Uma comprehension cria uma lista a partir de outra em uma linha: percorrer, filtrar e transformar sem um loop longo.',
    snippet: 'dobros = [n * 2 for n in lista if n > 0]',
    triggers: (ctx) => (has(ctx, 'list', 'for') ? 1 : 0),
  },
  {
    id: 'ternary',
    name: 'TERNÁRIO',
    tag: 'A if cond else B',
    rarity: 'common',
    price: 5,
    effect: { kind: 'mult', value: 4 },
    when: 'Você jogou uma carta CONDITION.',
    lesson:
      'O ternário escolhe entre dois valores numa expressão só. Bom para decisões curtas dentro de um return.',
    snippet: 'return "par" if n % 2 == 0 else "impar"',
    triggers: (ctx) => (has(ctx, 'condition') ? 1 : 0),
  },
  {
    id: 'fstring',
    name: 'F-STRING',
    tag: 'f"...{x}..."',
    rarity: 'common',
    price: 4,
    effect: { kind: 'chips', value: 40 },
    when: 'Você jogou uma carta VARIABLE.',
    lesson: 'f-strings montam texto com variáveis dentro de chaves: mais claro que juntar com `+`.',
    snippet: 'return f"Olá, {nome}!"',
    triggers: (ctx) => (has(ctx, 'variable') ? 1 : 0),
  },
  {
    id: 'any-all',
    name: 'ANY & ALL',
    tag: 'any() / all()',
    rarity: 'common',
    price: 6,
    effect: { kind: 'mult', value: 5 },
    when: 'Você jogou uma carta BOOLEAN.',
    lesson: '`any` diz se ALGUM item cumpre a condição e `all` se TODOS cumprem, sem loop manual.',
    snippet: 'return all(n > 0 for n in lista)',
    triggers: (ctx) => (has(ctx, 'boolean') ? 1 : 0),
  },
  {
    id: 'stdlib',
    name: 'BIBLIOTECA PADRÃO',
    tag: 'sum len max min',
    rarity: 'common',
    price: 5,
    effect: { kind: 'chips', value: 25 },
    when: 'Dispara 1× por categoria diferente na sua mão.',
    lesson:
      'O Python já traz ferramentas prontas. Usar `sum` ou `max` é mais curto e menos sujeito a erro.',
    snippet: 'return max(lista)',
    triggers: (ctx) => ctx.categories.length,
  },
  {
    id: 'comments',
    name: 'COMENTARISTA',
    tag: '# comentário',
    rarity: 'common',
    price: 4,
    effect: { kind: 'chips', value: 15 },
    when: 'Dispara 1× por carta jogada (até 3).',
    lesson: 'Comentários explicam o PORQUÊ do código. Quem lê depois (você, inclusive) agradece.',
    snippet: '# soma de 1 até n\nsoma = 0',
    triggers: (ctx) => Math.min(3, ctx.playedCount),
  },
  {
    id: 'docstring',
    name: 'DOCSTRING',
    tag: '"""doc"""',
    rarity: 'rare',
    price: 6,
    effect: { kind: 'mult', value: 4 },
    when: 'Você jogou uma carta FUNCTION.',
    lesson:
      'A docstring descreve o que a função faz, bem no começo dela. Ferramentas e pessoas a leem.',
    snippet: 'def soma(a, b):\n    """Devolve a soma."""',
    triggers: (ctx) => (has(ctx, 'function') ? 1 : 0),
  },
  {
    id: 'minimalist',
    name: 'MINIMALISTA',
    tag: '≤ 2 cartas',
    rarity: 'rare',
    price: 9,
    effect: { kind: 'xmult', value: 1.5 },
    when: 'Você jogou no máximo 2 cartas.',
    lesson: 'Código curto tem menos lugares para errar. Mas só vale se continuar legível!',
    snippet: 'def dobro(n):\n    return n * 2',
    triggers: (ctx) => (ctx.playedCount > 0 && ctx.playedCount <= 2 ? 1 : 0),
  },
  {
    id: 'clean-hand',
    name: 'MÃO LIMPA',
    tag: '1ª tentativa',
    rarity: 'rare',
    price: 9,
    effect: { kind: 'xmult', value: 1.5 },
    when: 'Você acertou a pergunta da mão de primeira.',
    lesson: 'Pensar antes de agir poupa retrabalho. Teste a ideia na cabeça e acerte de primeira.',
    snippet: '# pense, depois escreva',
    triggers: (ctx) => (ctx.firstTry ? 1 : 0),
  },
  {
    id: 'pair-master',
    name: 'MESTRE DO PAR',
    tag: 'PAIR',
    rarity: 'common',
    price: 5,
    effect: { kind: 'mult', value: 6 },
    when: 'Você jogou um PAIR (duas cartas do mesmo assunto).',
    lesson:
      'Cartas do mesmo assunto formam PAIR: agrupar o que é parecido também é uma boa prática.',
    snippet: 'LIST + FOR → mesmo assunto de coleções',
    triggers: (ctx) => (ctx.handRankId === 'pair' ? 1 : 0),
  },
  {
    id: 'combo-hunter',
    name: 'CAÇADOR DE COMBOS',
    tag: 'COMBO',
    rarity: 'rare',
    price: 8,
    effect: { kind: 'mult', value: 5 },
    when: 'Dispara 1× por combo de conceitos ativo na mão.',
    lesson:
      'Alguns conceitos funcionam juntos (LIST + FOR = ITERATOR). Combos mostram essas parcerias.',
    snippet: 'for item in lista: ...   # LIST + FOR',
    triggers: (ctx) => ctx.comboCount,
  },
  {
    id: 'big-hand',
    name: 'MÃO CHEIA',
    tag: '5 cartas',
    rarity: 'common',
    price: 4,
    effect: { kind: 'mult', value: 3 },
    when: 'Você jogou 5 cartas.',
    lesson: 'Mais cartas, pergunta mais difícil: um problema grande se resolve em passos pequenos.',
    snippet: '# divida o problema em funções menores',
    triggers: (ctx) => (ctx.playedCount >= 5 ? 1 : 0),
  },
];

const BY_ID = new Map(JOKERS.map((joker) => [joker.id, joker]));

export function getJoker(id: string): JokerDef {
  const joker = BY_ID.get(id);
  if (!joker) throw new Error(`Joker desconhecido: ${id}`);
  return joker;
}

export function isJokerId(id: unknown): id is string {
  return typeof id === 'string' && BY_ID.has(id);
}

export const RARITY_JOKER_WEIGHT: Record<Rarity, number> = { common: 10, rare: 4, legendary: 1 };

/** Texto curto do efeito: `+6 MULT`, `+40 FICHAS`, `×1.5 MULT`. */
export function effectLabel(effect: JokerEffect): string {
  if (effect.kind === 'chips') return `+${effect.value} FICHAS`;
  if (effect.kind === 'mult') return `+${effect.value} MULT`;
  return `×${effect.value} MULT`;
}
