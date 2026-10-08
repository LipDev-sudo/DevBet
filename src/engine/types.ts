/** Tipos centrais do motor do jogo. Nada aqui depende de React ou do navegador. */

export type CategoryId =
  'fundamentos' | 'controle' | 'estruturas' | 'funcoes' | 'algoritmos' | 'debug';

/** Assunto de um desafio. Cartas com o mesmo assunto formam PAIR. */
export type Topic = 'basics' | 'logic' | 'loops' | 'data' | 'functions' | 'algorithms' | 'debug';

export type Rarity = 'common' | 'rare' | 'legendary';

/** Cada carta é um conceito real de Python. */
export type CardId =
  | 'variable'
  | 'operator'
  | 'boolean'
  | 'condition'
  | 'for'
  | 'while'
  | 'list'
  | 'dictionary'
  | 'set'
  | 'function'
  | 'parameter'
  | 'return'
  | 'recursion'
  | 'search'
  | 'unit-test'
  | 'breakpoint';

export interface CardDef {
  id: CardId;
  name: string;
  category: CategoryId;
  rarity: Rarity;
  /** Nível conceitual (1 = fundamentos … 7 = engenharia). Base das sequências. */
  level: number;
  topics: Topic[];
  /** Fichas de pontuação base, somadas antes do multiplicador. */
  chips: number;
  /** Bônus aditivo ao multiplicador (0.2 = +20%). */
  mult: number;
  price: number;
  /** Nível de perfil necessário para a carta aparecer em lojas e recompensas. */
  unlockLevel: number;
  /** Rótulo curto do conceito, exibido na carta (ex.: CONDITIONAL). */
  tag: string;
  /** Explicação curta do conceito, em Python. */
  concept: string;
  /** Exemplo de código Python exibido na coleção. */
  snippet: string;
}

/** Carta que o jogador possui na run (com nível de melhoria). */
export interface DeckCard {
  uid: string;
  cardId: CardId;
  /** 0 = original; cada melhoria soma fichas e multiplicador. */
  upgrade: number;
}

export type HandRankId = 'high-card' | 'pair' | 'flush' | 'straight' | 'full-house' | 'royal-flush';

export interface HandRank {
  id: HandRankId;
  name: string;
  description: string;
  mult: number;
}

export interface ComboDef {
  id: string;
  name: string;
  /** Os dois conceitos. O combo só vale quando ambos estão na mão E o desafio usa ambos. */
  requires: [CardId, CardId];
  /** Bônus aditivo de multiplicador. */
  bonus: number;
  /** Por que esses dois conceitos formam isto (relação real entre eles). */
  description: string;
}

export const TOPIC_LABEL: Record<Topic, string> = {
  basics: 'BÁSICO',
  logic: 'LÓGICA',
  loops: 'LOOPS',
  data: 'DADOS',
  functions: 'FUNÇÕES',
  algorithms: 'ALGORITMOS',
  debug: 'DEBUG',
};

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  fundamentos: 'Fundamentos',
  controle: 'Controle',
  estruturas: 'Estruturas',
  funcoes: 'Funções',
  algoritmos: 'Algoritmos',
  debug: 'Debug',
};
