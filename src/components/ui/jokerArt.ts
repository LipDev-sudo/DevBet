/**
 * Arte pixelada de cada joker: um sprite 12×12 próprio, com as cores do joker.
 * Letras: a/b = cores do joker, w = branco-creme, y = amarelo, r = vermelho, g = verde, p = rosa, k = contorno.
 */
export interface JokerArt {
  rows: readonly string[];
  /** Cor principal, secundária e os dois tons do fundo xadrez da janela. */
  a: string;
  b: string;
  bg: [string, string];
}

export const JOKER_ART: Record<string, JokerArt> = {
  // [ ▪▪ ▪▪ ]: uma lista sendo percorrida
  comprehension: {
    a: '#5ad1ff',
    b: '#ffd54a',
    bg: ['#17254a', '#1c2d5a'],
    rows: [
      '............',
      '.kkk....kkk.',
      '.k........k.',
      '.k.aa.bb..k.',
      '.k.aa.bb..k.',
      '.k........k.',
      '.k.bb.aa..k.',
      '.k.bb.aa..k.',
      '.k........k.',
      '.k........k.',
      '.kkk....kkk.',
      '............',
    ],
  },
  // ? : escolher entre dois caminhos
  ternary: {
    a: '#ff8ad0',
    b: '#ffd54a',
    bg: ['#3a1a4a', '#46205a'],
    rows: [
      '............',
      '...aaaaaa...',
      '..aaaaaaaa..',
      '..aa....aa..',
      '.......aaa..',
      '......aaa...',
      '.....aaa....',
      '.....aa.....',
      '............',
      '.....bb.....',
      '.....bb.....',
      '............',
    ],
  },
  // {x}: texto com valor dentro
  fstring: {
    a: '#4de0a1',
    b: '#ffd54a',
    bg: ['#10382f', '#14443a'],
    rows: [
      '............',
      '..aa....aa..',
      '..a......a..',
      '..a..bb..a..',
      '.aa..bb..aa.',
      'aa...bb...aa',
      '.aa..bb..aa.',
      '..a..bb..a..',
      '..a......a..',
      '..aa....aa..',
      '............',
      '............',
    ],
  },
  // ✓: todos cumprem
  'any-all': {
    a: '#4de0a1',
    b: '#ffd54a',
    bg: ['#1a3a22', '#20462a'],
    rows: [
      '............',
      '..........aa',
      '.........aaa',
      '........aaa.',
      'aa.....aaa..',
      'aaa...aaa...',
      '.aaa.aaa....',
      '..aaaaa.....',
      '...aaa......',
      '....b.b.b...',
      '............',
      '............',
    ],
  },
  // pilha de livros: a biblioteca padrão
  stdlib: {
    a: '#ff7a59',
    b: '#5ad1ff',
    bg: ['#3a2216', '#46291a'],
    rows: [
      '............',
      '.aaaaaaaaaa.',
      '.ayyaaaaaaa.',
      '.aaaaaaaaaa.',
      '..bbbbbbbbbb',
      '..byybbbbbb.',
      '..bbbbbbbbbb',
      '.gggggggggg.',
      '.gyygggggggg',
      '.gggggggggg.',
      '............',
      '............',
    ],
  },
  // balão com #: o comentário
  comments: {
    a: '#ffd54a',
    b: '#ff8ad0',
    bg: ['#2a2a4a', '#32325a'],
    rows: [
      '............',
      '.wwwwwwwwww.',
      '.w........w.',
      '.w.a.a....w.',
      '.w.aaaaa..w.',
      '.w.a.a....w.',
      '.w.aaaaa..w.',
      '.w.a.a....w.',
      '.w........w.',
      '.wwwwwwwwww.',
      '..ww........',
      '...w........',
    ],
  },
  // folha com linhas: a documentação
  docstring: {
    a: '#a98bff',
    b: '#5ad1ff',
    bg: ['#251a4a', '#2d205a'],
    rows: [
      '............',
      '..wwwwwww...',
      '..wwwwwwww..',
      '..wbbbbbwww.',
      '..wwwwwwwww.',
      '..wbbbbbbbw.',
      '..wwwwwwwww.',
      '..wbbbbbwww.',
      '..wwwwwwwww.',
      '..wwwwwwwww.',
      '............',
      '............',
    ],
  },
  // um ponto no vazio: o mínimo
  minimalist: {
    a: '#7aa2ff',
    b: '#ffd54a',
    bg: ['#141c33', '#19233f'],
    rows: [
      '.a........a.',
      'aa........aa',
      '............',
      '............',
      '.....bb.....',
      '....bbbb....',
      '....bbbb....',
      '.....bb.....',
      '............',
      '............',
      'aa........aa',
      '.a........a.',
    ],
  },
  // luva branca: mão limpa
  'clean-hand': {
    a: '#ffffff',
    b: '#5ad1ff',
    bg: ['#18304a', '#1d3a58'],
    rows: [
      '..y.........',
      '.yyy..w.w.w.',
      '..y...w.w.w.',
      '......wwwww.',
      '.w....wwwwwy',
      '.ww..wwwwww.',
      '..wwwwwwwww.',
      '...wwwwwww..',
      '....wwwww...',
      '....bbbbb...',
      '....bbbbb...',
      '............',
    ],
  },
  // dois corações: o par
  'pair-master': {
    a: '#ff5a6e',
    b: '#ff8ad0',
    bg: ['#3a1a2a', '#46202f'],
    rows: [
      '............',
      '............',
      '............',
      '............',
      '.r.r....p.p.',
      'rrrrr..ppppp',
      '.rrr....ppp.',
      '..r.....p...',
      '............',
      '............',
      '............',
      '............',
    ],
  },
  // raio: combo em cadeia
  'combo-hunter': {
    a: '#ffd54a',
    b: '#ff8ad0',
    bg: ['#2a1a4a', '#33205a'],
    rows: [
      '.......yyyy.',
      '......yyyy..',
      '.....yyyy...',
      '....yyyyyy..',
      '...yyyyyy...',
      '......yyy...',
      '.....yyy....',
      '....yyy.....',
      '....yy......',
      '...yy.......',
      '...y........',
      '............',
    ],
  },
  // carta com o número 5: mão cheia
  'big-hand': {
    a: '#ff7a59',
    b: '#ffd54a',
    bg: ['#3a1e1a', '#46241f'],
    rows: [
      '............',
      '.wwwwwwwwww.',
      '.w........w.',
      '.w.rrrrrr.w.',
      '.w.rr.....w.',
      '.w.rrrrr..w.',
      '.w.....rr.w.',
      '.w.rr..rr.w.',
      '.w..rrrr..w.',
      '.w........w.',
      '.wwwwwwwwww.',
      '............',
    ],
  },
};

export const SPRITE_COLOR: Record<string, string> = {
  w: '#fff4dc',
  y: '#ffd54a',
  r: '#ff5a6e',
  g: '#4de0a1',
  p: '#ff8ad0',
  k: '#120a24',
};
