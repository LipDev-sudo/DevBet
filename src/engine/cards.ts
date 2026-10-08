import type { CardDef, CardId, Rarity } from './types';

/**
 * Cada carta é um conceito real de Python. O efeito é sempre conceitual:
 * a carta nunca escreve nem corrige código; ela só recompensa o uso do conceito.
 * Quando o desafio USA o conceito da carta, o efeito dela dobra.
 */
export const CARDS: readonly CardDef[] = [
  {
    id: 'variable',
    name: 'VARIABLE',
    tag: 'NAME = VALUE',
    category: 'fundamentos',
    rarity: 'common',
    level: 1,
    topics: ['basics'],
    chips: 10,
    mult: 0.1,
    price: 15,
    unlockLevel: 1,
    concept:
      'Um nome que guarda um valor. Em Python, `ficha = 25` cria a variável; o tipo vem do valor.',
    snippet: 'ficha = 25\ntotal = ficha * 2',
  },
  {
    id: 'operator',
    name: 'OPERATOR',
    tag: '+ - * / // %',
    category: 'fundamentos',
    rarity: 'common',
    level: 1,
    topics: ['basics'],
    chips: 8,
    mult: 0.15,
    price: 20,
    unlockLevel: 1,
    concept: 'Símbolos que operam valores. `//` é divisão inteira e `%` é o resto da divisão.',
    snippet: '7 // 2   # 3\n7 % 2    # 1',
  },
  {
    id: 'boolean',
    name: 'BOOLEAN',
    tag: 'TRUE / FALSE',
    category: 'controle',
    rarity: 'common',
    level: 2,
    topics: ['logic'],
    chips: 8,
    mult: 0.15,
    price: 20,
    unlockLevel: 1,
    concept: 'Só dois valores: `True` ou `False`. Comparações como `x > 3` produzem booleanos.',
    snippet: 'maior = idade >= 18   # True ou False',
  },
  {
    id: 'condition',
    name: 'CONDITION',
    tag: 'IF / ELIF / ELSE',
    category: 'controle',
    rarity: 'common',
    level: 2,
    topics: ['logic'],
    chips: 10,
    mult: 0.2,
    price: 25,
    unlockLevel: 1,
    concept:
      'Executa um bloco só se a condição for verdadeira. `elif` e `else` cobrem os outros caminhos.',
    snippet: 'if nota >= 7:\n    resultado = "aprovado"\nelse:\n    resultado = "recuperação"',
  },
  {
    id: 'for',
    name: 'FOR',
    tag: 'REPEAT',
    category: 'controle',
    rarity: 'common',
    level: 3,
    topics: ['loops'],
    chips: 12,
    mult: 0.2,
    price: 25,
    unlockLevel: 1,
    concept:
      'Repete o bloco para cada item de uma sequência: `for i in range(5)` ou `for ficha in lista`.',
    snippet: 'for i in range(1, 4):\n    soma += i',
  },
  {
    id: 'while',
    name: 'WHILE',
    tag: 'REPEAT WHILE',
    category: 'controle',
    rarity: 'common',
    level: 3,
    topics: ['loops'],
    chips: 12,
    mult: 0.25,
    price: 30,
    unlockLevel: 2,
    concept:
      'Repete enquanto a condição for verdadeira. Se nada na condição muda, o loop nunca termina.',
    snippet: 'while n > 0:\n    n -= 1',
  },
  {
    id: 'list',
    name: 'LIST',
    tag: 'ORDERED ITEMS',
    category: 'estruturas',
    rarity: 'common',
    level: 4,
    topics: ['data'],
    chips: 12,
    mult: 0.2,
    price: 25,
    unlockLevel: 1,
    concept:
      'Sequência ordenada e mutável, acessada por índice a partir de 0: `lista[0]`, `len(lista)`.',
    snippet: 'fichas = [10, 50, 25]\nfichas[0]   # 10',
  },
  {
    id: 'dictionary',
    name: 'DICTIONARY',
    tag: 'KEY → VALUE',
    category: 'estruturas',
    rarity: 'common',
    level: 4,
    topics: ['data'],
    chips: 12,
    mult: 0.25,
    price: 30,
    unlockLevel: 2,
    concept: 'Pares chave → valor. `d.get(chave, 0)` devolve 0 quando a chave ainda não existe.',
    snippet: 'carta = {"nome": "IF", "raro": False}\ncarta["nome"]',
  },
  {
    id: 'set',
    name: 'SET',
    tag: 'UNIQUE ITEMS',
    category: 'estruturas',
    rarity: 'common',
    level: 4,
    topics: ['data'],
    chips: 10,
    mult: 0.2,
    price: 28,
    unlockLevel: 3,
    concept: 'Coleção sem repetidos e sem ordem garantida: `set([1, 1, 2])` vira `{1, 2}`.',
    snippet: 'unicos = set([3, 1, 3])   # {1, 3}',
  },
  {
    id: 'function',
    name: 'FUNCTION',
    tag: 'DEF',
    category: 'funcoes',
    rarity: 'common',
    level: 5,
    topics: ['functions'],
    chips: 14,
    mult: 0.25,
    price: 30,
    unlockLevel: 1,
    concept: '`def` cria um bloco reutilizável com nome. Chamar a função executa o bloco.',
    snippet: 'def dobro(n):\n    return n * 2',
  },
  {
    id: 'parameter',
    name: 'PARAMETER',
    tag: 'INPUT',
    category: 'funcoes',
    rarity: 'common',
    level: 5,
    topics: ['functions'],
    chips: 10,
    mult: 0.2,
    price: 25,
    unlockLevel: 2,
    concept:
      'O que a função recebe entre parênteses. Dentro dela, o parâmetro é uma variável local.',
    snippet: 'def saudacao(nome):\n    ...',
  },
  {
    id: 'return',
    name: 'RETURN',
    tag: 'OUTPUT',
    category: 'funcoes',
    rarity: 'common',
    level: 5,
    topics: ['functions'],
    chips: 12,
    mult: 0.25,
    price: 28,
    unlockLevel: 2,
    concept: '`return` devolve um resultado a quem chamou. Sem `return`, a função devolve `None`.',
    snippet: 'def soma(a, b):\n    return a + b',
  },
  {
    id: 'recursion',
    name: 'RECURSION',
    tag: 'SELF-CALL',
    category: 'algoritmos',
    rarity: 'rare',
    level: 6,
    topics: ['functions', 'algorithms'],
    chips: 20,
    mult: 0.35,
    price: 50,
    unlockLevel: 3,
    concept:
      'Uma função que chama a si mesma. Precisa de um caso base; sem ele, ocorre `RecursionError`.',
    snippet: 'def fat(n):\n    if n <= 1:\n        return 1\n    return n * fat(n - 1)',
  },
  {
    id: 'search',
    name: 'SEARCH',
    tag: 'LINEAR O(n)',
    category: 'algoritmos',
    rarity: 'rare',
    level: 6,
    topics: ['algorithms', 'data'],
    chips: 18,
    mult: 0.3,
    price: 45,
    unlockLevel: 3,
    concept:
      'Busca linear: percorre a lista item a item até achar. No pior caso, olha todos: O(n).',
    snippet: 'for i, x in enumerate(lista):\n    if x == alvo:\n        return i',
  },
  {
    id: 'unit-test',
    name: 'UNIT TEST',
    tag: 'ASSERT',
    category: 'debug',
    rarity: 'rare',
    level: 7,
    topics: ['debug', 'functions'],
    chips: 18,
    mult: 0.3,
    price: 45,
    unlockLevel: 3,
    concept: 'Verifica automaticamente se uma função devolve o esperado: `assert soma(2, 3) == 5`.',
    snippet: 'assert soma(2, 3) == 5',
  },
  {
    id: 'breakpoint',
    name: 'BREAKPOINT',
    tag: 'PAUSE',
    category: 'debug',
    rarity: 'rare',
    level: 7,
    topics: ['debug', 'loops'],
    chips: 18,
    mult: 0.3,
    price: 45,
    unlockLevel: 4,
    concept: '`breakpoint()` pausa o programa para inspecionar variáveis passo a passo.',
    snippet: 'breakpoint()   # pausa aqui',
  },
];

const BY_ID = new Map<CardId, CardDef>(CARDS.map((card) => [card.id, card]));

export function getCard(id: CardId): CardDef {
  const card = BY_ID.get(id);
  if (!card) throw new Error(`Carta desconhecida: ${id}`);
  return card;
}

export const RARITY_WEIGHT: Record<Rarity, number> = { common: 10, rare: 4, legendary: 1 };

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Comum',
  rare: 'Rara',
  legendary: 'Lendária',
};

/** Valor efetivo de fichas de uma carta, considerando melhorias. */
export function cardChips(card: CardDef, upgrade: number): number {
  return card.chips + upgrade * 4;
}

/** Bônus de multiplicador efetivo de uma carta, considerando melhorias. */
export function cardMult(card: CardDef, upgrade: number): number {
  return Math.round((card.mult + upgrade * 0.05) * 100) / 100;
}

/** Nomes antigos (JavaScript) → conceitos atuais (Python), para migrar saves. */
export const LEGACY_CARD_IDS: Record<string, CardId> = {
  var: 'variable',
  if: 'condition',
  array: 'list',
  object: 'dictionary',
  'binary-search': 'search',
};
