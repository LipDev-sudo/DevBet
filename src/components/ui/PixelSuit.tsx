import type { CategoryId } from '@/engine/types';

/**
 * "Naipes" do DEVBet em pixel art. Cada categoria de conceito usa um símbolo de baralho convencional
 * (copas, ouros, paus, espadas) ou de código (chaves e colchetes angulares), como num baralho de verdade.
 */
type Bitmap = readonly string[];

const HEART: Bitmap = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];

const DIAMOND: Bitmap = [
  '....#....',
  '...###...',
  '..#####..',
  '.#######.',
  '#########',
  '.#######.',
  '..#####..',
  '...###...',
  '....#....',
];

const CLUB: Bitmap = [
  '..###..',
  '..###..',
  '.#####.',
  '###.###',
  '#######',
  '.#.#.#.',
  '...#...',
  '..###..',
];

const SPADE: Bitmap = [
  '...#...',
  '..###..',
  '.#####.',
  '#######',
  '#######',
  '.##.##.',
  '...#...',
  '..###..',
];

/** Chaves `{ }`: o símbolo de função/bloco. */
const BRACES: Bitmap = [
  '.##.##.',
  '.#...#.',
  '.#...#.',
  '##...##',
  '.#...#.',
  '.#...#.',
  '.##.##.',
];

/** Colchetes angulares `< >`: o símbolo de marcação/depuração. */
const ANGLES: Bitmap = ['..#.....#..', '.#.......#.', '#....#....#', '.#...#...#.', '..#..#..#..'];

export type SuitId = 'heart' | 'diamond' | 'club' | 'spade' | 'braces' | 'angles';

const BITMAPS: Record<SuitId, Bitmap> = {
  heart: HEART,
  diamond: DIAMOND,
  club: CLUB,
  spade: SPADE,
  braces: BRACES,
  angles: ANGLES,
};

/** Cor de cada naipe: vermelhos e azul-marinho como no baralho, e verde-água/violeta para os de código. */
export const SUIT_COLOR: Record<SuitId, string> = {
  heart: '#d83a52',
  diamond: '#d83a52',
  club: '#262b5c',
  spade: '#262b5c',
  braces: '#16898a',
  angles: '#7a3fc4',
};

export const SUIT_BY_CATEGORY: Record<CategoryId, SuitId> = {
  fundamentos: 'heart',
  controle: 'diamond',
  estruturas: 'club',
  funcoes: 'braces',
  algoritmos: 'spade',
  debug: 'angles',
};

function pathOf(bitmap: Bitmap): string {
  const cells: string[] = [];
  bitmap.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '#') cells.push(`M${x} ${y}h1v1h-1z`);
    });
  });
  return cells.join('');
}

export function PixelSuit({ suit, className = '' }: { suit: SuitId; className?: string }) {
  const bitmap = BITMAPS[suit];
  const width = Math.max(...bitmap.map((row) => row.length));
  return (
    <svg
      viewBox={`0 0 ${width} ${bitmap.length}`}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
      className={className}
      fill={SUIT_COLOR[suit]}
    >
      <path d={pathOf(bitmap)} />
    </svg>
  );
}

/** Estrela pixelada: marca de carta rara/lendária (como o detalhe dourado de um baralho especial). */
export function PixelStar({ className = '' }: { className?: string }) {
  const star: Bitmap = ['..#..', '.###.', '#####', '.###.', '.#.#.'];
  return (
    <svg
      viewBox="0 0 5 5"
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
      className={className}
      fill="currentColor"
    >
      <path d={pathOf(star)} />
    </svg>
  );
}
