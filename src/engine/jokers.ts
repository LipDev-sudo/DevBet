import type { Rarity } from './types';

/**
 * Jokers do DEVBet são IDIOMAS de Python: cada um premia um jeito de escrever código, só quando o código
 * ENVIADO realmente o usa. Assim a loja ensina (cada joker explica o idioma e mostra um exemplo) e o placar
 * recompensa quem escreve bem, não só quem acerta.
 */
export type JokerEffect =
  | { kind: 'chips'; value: number }
  | { kind: 'mult'; value: number }
  | { kind: 'xmult'; value: number };

export interface JokerContext {
  /** Código que o jogador entregou nesta mão. */
  code: string;
  /** Primeira entrega da mão passou nos testes. */
  firstTry: boolean;
  handRankId: string;
  comboCount: number;
  playedCount: number;
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
  /** Exemplo de código real que dispara o joker. */
  snippet: string;
  /** Quantas vezes dispara (0 = não dispara). Sempre determinístico a partir do código. */
  triggers: (ctx: JokerContext) => number;
}

/** Remove comentários e strings de uma linha para que `#` ou `for` dentro de texto não enganem os detectores. */
export function stripLine(line: string): string {
  let out = '';
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line.charAt(i);
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch + ch;
      continue;
    }
    if (ch === '#') break;
    out += ch;
  }
  return out;
}

/** Linhas de código sem comentários, strings e linhas vazias. */
export function codeLines(code: string): string[] {
  return code
    .split('\n')
    .map(stripLine)
    .filter((line) => line.trim() !== '');
}

const isCode = (code: string) => codeLines(code).join('\n');

/** `[x * 2 for x in lista]`, `{k: v for ...}` e geradores entre parênteses. */
export function hasComprehension(code: string): boolean {
  return /[[({][^\n]*\bfor\b[^\n]*\bin\b[^\n]*[\])}]/.test(isCode(code));
}

/** `a if cond else b` usado como expressão (não a instrução `if`). */
export function hasTernary(code: string): boolean {
  return codeLines(code).some((line) => {
    const trimmed = line.trim();
    if (/^(if|elif|else)\b/.test(trimmed) || trimmed.endsWith(':')) return false;
    return /\S\s+if\s+.+\s+else\s+\S/.test(trimmed);
  });
}

export function hasFString(code: string): boolean {
  return /(^|[^\w])[fF]["']/.test(isCode(code));
}

export function hasAnyAll(code: string): boolean {
  return /\b(any|all)\(/.test(isCode(code));
}

const BUILTINS = [
  'sum',
  'len',
  'max',
  'min',
  'sorted',
  'enumerate',
  'zip',
  'range',
  'abs',
  'round',
];

/** Quantos builtins úteis DIFERENTES o código usa. */
export function builtinCount(code: string): number {
  const text = isCode(code);
  return BUILTINS.filter((name) => new RegExp(`\\b${name}\\(`).test(text)).length;
}

export function commentCount(code: string): number {
  return code.split('\n').filter((line) => /^\s*#\s*\S/.test(line) || /\S\s+#\s*\S/.test(line))
    .length;
}

export function hasDocstring(code: string): boolean {
  return /("""|''')[\s\S]*?\1/.test(code);
}

/** Linhas de lógica (sem comentários nem a linha `def`). */
export function bodyLineCount(code: string): number {
  return codeLines(code).filter((line) => !/^\s*def\s/.test(line)).length;
}

export const JOKERS: readonly JokerDef[] = [
  {
    id: 'comprehension',
    name: 'LIST COMPREHENSION',
    tag: '[x for x in ...]',
    rarity: 'rare',
    price: 8,
    effect: { kind: 'mult', value: 6 },
    when: 'Seu código usa uma list comprehension.',
    lesson:
      'Uma comprehension cria uma lista a partir de outra em uma linha: percorrer, filtrar e transformar sem um loop longo.',
    snippet: 'dobros = [n * 2 for n in lista if n > 0]',
    triggers: (ctx) => (hasComprehension(ctx.code) ? 1 : 0),
  },
  {
    id: 'ternary',
    name: 'TERNÁRIO',
    tag: 'A if cond else B',
    rarity: 'common',
    price: 5,
    effect: { kind: 'mult', value: 4 },
    when: 'Seu código usa o operador ternário.',
    lesson:
      'O ternário escolhe entre dois valores numa expressão só. Bom para decisões curtas dentro de um return.',
    snippet: 'return "par" if n % 2 == 0 else "impar"',
    triggers: (ctx) => (hasTernary(ctx.code) ? 1 : 0),
  },
  {
    id: 'fstring',
    name: 'F-STRING',
    tag: 'f"...{x}..."',
    rarity: 'common',
    price: 4,
    effect: { kind: 'chips', value: 40 },
    when: 'Seu código usa uma f-string.',
    lesson: 'f-strings montam texto com variáveis dentro de chaves: mais claro que juntar com `+`.',
    snippet: 'return f"Olá, {nome}!"',
    triggers: (ctx) => (hasFString(ctx.code) ? 1 : 0),
  },
  {
    id: 'any-all',
    name: 'ANY & ALL',
    tag: 'any() / all()',
    rarity: 'common',
    price: 6,
    effect: { kind: 'mult', value: 5 },
    when: 'Seu código usa any() ou all().',
    lesson: '`any` diz se ALGUM item cumpre a condição e `all` se TODOS cumprem, sem loop manual.',
    snippet: 'return all(n > 0 for n in lista)',
    triggers: (ctx) => (hasAnyAll(ctx.code) ? 1 : 0),
  },
  {
    id: 'stdlib',
    name: 'BIBLIOTECA PADRÃO',
    tag: 'sum len max min',
    rarity: 'common',
    price: 5,
    effect: { kind: 'chips', value: 25 },
    when: 'Dispara 1× por builtin diferente que seu código usa (sum, len, max, min, sorted…).',
    lesson:
      'O Python já traz ferramentas prontas. Usar `sum` ou `max` é mais curto e menos sujeito a erro.',
    snippet: 'return max(lista)',
    triggers: (ctx) => builtinCount(ctx.code),
  },
  {
    id: 'comments',
    name: 'COMENTARISTA',
    tag: '# comentário',
    rarity: 'common',
    price: 4,
    effect: { kind: 'chips', value: 15 },
    when: 'Dispara 1× por comentário (até 3).',
    lesson: 'Comentários explicam o PORQUÊ do código. Quem lê depois (você, inclusive) agradece.',
    snippet: '# soma de 1 até n\nsoma = 0',
    triggers: (ctx) => Math.min(3, commentCount(ctx.code)),
  },
  {
    id: 'docstring',
    name: 'DOCSTRING',
    tag: '"""doc"""',
    rarity: 'rare',
    price: 6,
    effect: { kind: 'mult', value: 4 },
    when: 'Seu código tem uma docstring.',
    lesson:
      'A docstring descreve o que a função faz, bem no começo dela. Ferramentas e pessoas a leem.',
    snippet: 'def soma(a, b):\n    """Devolve a soma."""',
    triggers: (ctx) => (hasDocstring(ctx.code) ? 1 : 0),
  },
  {
    id: 'minimalist',
    name: 'MINIMALISTA',
    tag: '≤ 3 linhas',
    rarity: 'rare',
    price: 9,
    effect: { kind: 'xmult', value: 1.5 },
    when: 'O corpo da sua função tem no máximo 3 linhas de código.',
    lesson: 'Código curto tem menos lugares para errar. Mas só vale se continuar legível!',
    snippet: 'def dobro(n):\n    return n * 2',
    triggers: (ctx) => (bodyLineCount(ctx.code) > 0 && bodyLineCount(ctx.code) <= 3 ? 1 : 0),
  },
  {
    id: 'clean-hand',
    name: 'MÃO LIMPA',
    tag: '1ª tentativa',
    rarity: 'rare',
    price: 9,
    effect: { kind: 'xmult', value: 1.5 },
    when: 'A primeira entrega da mão passou em todos os testes.',
    lesson: 'Rodar o código com Executar antes de entregar é de graça. Teste cedo, entregue certo.',
    snippet: '# Executar (de graça) até os testes ficarem verdes',
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
    lesson: 'Mais cartas, exercício maior: um problema grande se resolve em passos pequenos.',
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
