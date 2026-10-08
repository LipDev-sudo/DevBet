import type { CardId, Topic } from './types';

/** Caso de teste executado no sandbox. `expr` é uma expressão Python avaliada depois do código do jogador. */
export interface TestCase {
  name: string;
  expr: string;
  /** Valor esperado, em formato serializável em JSON. */
  expected: unknown;
  /** Testes ocultos só rodam na entrega (a "carta virada" da casa). */
  hidden?: boolean;
}

export interface HintLadder {
  /** Nível 1 — pergunta que faz o jogador pensar. */
  question: string;
  /** Nível 2 — pista sem nomear a ferramenta. */
  clue: string;
  /** Nível 3 — o conceito que ajuda. */
  concept: string;
  /** Nível 4 — exemplo parcial de código. */
  example: string;
}

export interface Challenge {
  id: string;
  title: string;
  areaId: string;
  topic: Topic;
  difficulty: 1 | 2 | 3 | 4 | 5;
  boss?: boolean;
  /** Situação curta dentro do universo do DevBet. */
  context: string;
  /** O que o jogador precisa resolver. Use `código` entre crases para destacar trechos. */
  objective: string[];
  /** O que o jogador aprende neste desafio. */
  concept: string;
  /** Conceitos de Python que o desafio usa: as cartas desses conceitos valem o dobro e formam combos. */
  concepts: CardId[];
  /** Nome da função em Python (snake_case). */
  functionName: string;
  starterCode: string;
  tests: TestCase[];
  /** Escada de ajuda do Dealer (níveis 1–4). O nível 5 é a solução explicada. */
  ladder: HintLadder;
  /** Se o código enviado casar com o padrão, o Dealer reconhece uma solução mais eficiente. */
  efficient?: { pattern: string };
  solution: { code: string; explanation: string };
  basePoints: number;
  /** Pontuação mínima para "vencer a mesa". Abaixo disso é um Bust. */
  target: number;
  chipReward: number;
  xp: number;
}

export interface Area {
  id: string;
  name: string;
  subtitle: string;
  /** Posição na trilha (0 = primeira). */
  order: number;
}
