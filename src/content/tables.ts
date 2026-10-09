/** Como o Dealer se comporta e como o ambiente se apresenta. Evolui junto com o jogador. */
export type DealerTone = 'warm' | 'focused' | 'severe';

export interface TableDef {
  id: string;
  /** Número exibido ("TABLE 01"). 0 = High Table. */
  number: number;
  name: string;
  /** Área de conteúdo que esta mesa serve (ver areas.ts). */
  areaId: string;
  topics: string;
  tone: DealerTone;
  /** Ambiente: luz e moldura. Mais forte e mais escuro a cada mesa. */
  ambient: { glow: string; glowOpacity: number; vignette: number; rail: string };
  /** Materiais e decoração da mesa. Cada uma precisa parecer um lugar diferente. */
  scene: TableScene;
  /** Fala do Dealer ao apresentar a mesa. */
  intro: string;
}

export type InlayKind = 'none' | 'fork' | 'rings' | 'lattice' | 'tree' | 'crest';

export interface TableScene {
  /** Parede/fundo atrás da mesa. */
  wall: string;
  /** Feltro/couro do tampo e a borda mais escura. */
  felt: string;
  feltEdge: string;
  /** Acabamento da moldura (madeira, aço, ouro). */
  trim: string;
  /** Lâmpada: cor "r g b" e intensidade do cone de luz. */
  lamp: string;
  lampStrength: number;
  /** Marcação gravada no tampo, sutil e ligada ao conteúdo. */
  inlay: InlayKind;
  inlayColor: string;
}

export const TABLES: readonly TableDef[] = [
  {
    id: 'fundamentals',
    number: 1,
    name: 'FUNDAMENTALS',
    areaId: 'fundamentos',
    topics: 'Variáveis, operadores, def e return',
    tone: 'warm',
    ambient: {
      glow: '236 230 216',
      glowOpacity: 0.1,
      vignette: 0.25,
      rail: 'rgb(255 255 255 / 0.1)',
    },
    scene: {
      wall: '#0d0a08',
      felt: '#16392c',
      feltEdge: '#0d2219',
      trim: '#6b4a2b',
      lamp: '255 214 150',
      lampStrength: 0.2,
      inlay: 'none',
      inlayColor: 'transparent',
    },
    intro: 'Bem-vindo. A gente começa pelo básico: valores, tipos e operadores.',
  },
  {
    id: 'logic',
    number: 2,
    name: 'LOGIC',
    areaId: 'logica',
    topics: 'Booleanos, if, elif e else',
    tone: 'warm',
    ambient: {
      glow: '236 230 216',
      glowOpacity: 0.12,
      vignette: 0.3,
      rail: 'rgb(255 255 255 / 0.12)',
    },
    scene: {
      wall: '#080b0c',
      felt: '#133a35',
      feltEdge: '#0a2421',
      trim: '#4f3b28',
      lamp: '255 230 190',
      lampStrength: 0.26,
      inlay: 'fork',
      inlayColor: 'rgb(236 230 216 / 0.2)',
    },
    intro: 'Mesa 02. Agora o código toma decisões. Preste atenção nas condições.',
  },
  {
    id: 'loops',
    number: 3,
    name: 'LOOPS',
    areaId: 'loops',
    topics: 'for, while e iteração',
    tone: 'focused',
    ambient: {
      glow: '110 140 220',
      glowOpacity: 0.14,
      vignette: 0.38,
      rail: 'rgb(110 140 220 / 0.3)',
    },
    scene: {
      wall: '#070a10',
      felt: '#1a2e4a',
      feltEdge: '#0f1b2d',
      trim: '#34425c',
      lamp: '170 190 255',
      lampStrength: 0.24,
      inlay: 'rings',
      inlayColor: 'rgb(236 230 216 / 0.16)',
    },
    intro: 'Mesa 03. Repetição. Quem domina o loop aprende a não repetir código.',
  },
  {
    id: 'data',
    number: 4,
    name: 'DATA',
    areaId: 'estruturas',
    topics: 'Listas, dicionários e conjuntos',
    tone: 'focused',
    ambient: {
      glow: '110 140 220',
      glowOpacity: 0.16,
      vignette: 0.45,
      rail: 'rgb(110 140 220 / 0.38)',
    },
    scene: {
      wall: '#06090e',
      felt: '#172a3c',
      feltEdge: '#0c1824',
      trim: '#3d5068',
      lamp: '150 190 230',
      lampStrength: 0.22,
      inlay: 'lattice',
      inlayColor: 'rgb(236 230 216 / 0.18)',
    },
    intro:
      'Mesa 04. Dados. Listas, dicionários e conjuntos guardam o que o seu código precisa lembrar.',
  },
  {
    id: 'algorithms',
    number: 5,
    name: 'ALGORITHMS',
    areaId: 'funcoes',
    topics: 'Recursão e busca',
    tone: 'severe',
    ambient: { glow: '217 72 90', glowOpacity: 0.2, vignette: 0.55, rail: 'rgb(217 72 90 / 0.4)' },
    scene: {
      wall: '#07050a',
      felt: '#261019',
      feltEdge: '#12080d',
      trim: '#5d2a35',
      lamp: '255 130 150',
      lampStrength: 0.2,
      inlay: 'tree',
      inlayColor: 'rgb(201 162 74 / 0.28)',
    },
    intro: 'Mesa 05. Algoritmos: recursão e busca. Aqui os erros custam mais caro.',
  },
  {
    id: 'high-table',
    number: 0,
    name: 'HIGH TABLE',
    areaId: 'engenharia',
    topics: 'Depuração',
    tone: 'severe',
    ambient: { glow: '217 72 90', glowOpacity: 0.26, vignette: 0.65, rail: 'rgb(217 72 90 / 0.6)' },
    scene: {
      wall: '#050507',
      felt: '#0e0e12',
      feltEdge: '#060608',
      trim: '#c9a24a',
      lamp: '255 228 170',
      lampStrength: 0.34,
      inlay: 'crest',
      inlayColor: 'rgb(201 162 74 / 0.5)',
    },
    intro: 'High Table. Dois bugs, e um deles trava tudo. Leia antes de mexer.',
  },
];

export function getTableByArea(areaId: string): TableDef {
  const table = TABLES.find((t) => t.areaId === areaId);
  if (!table) throw new Error(`Nenhuma mesa para a área ${areaId}`);
  return table;
}

export function tableLabel(table: TableDef): string {
  return table.number === 0
    ? table.name
    : `TABLE ${String(table.number).padStart(2, '0')} — ${table.name}`;
}
