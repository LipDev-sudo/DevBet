import type { Area } from '@/engine/challenge';

export const AREAS: readonly Area[] = [
  {
    id: 'fundamentos',
    name: 'Fundamentos',
    subtitle: 'Variáveis, operadores e funções simples',
    order: 0,
  },
  { id: 'logica', name: 'Lógica', subtitle: 'Booleanos, if, elif e else', order: 1 },
  { id: 'loops', name: 'Loops', subtitle: 'for, while e controle de repetição', order: 2 },
  { id: 'estruturas', name: 'Dados', subtitle: 'Listas, dicionários e conjuntos', order: 3 },
  { id: 'funcoes', name: 'Algoritmos', subtitle: 'Recursão e busca', order: 4 },
  { id: 'engenharia', name: 'Engenharia', subtitle: 'Debugging e testes', order: 5 },
];
