import type { CardId } from '@/engine/types';

/**
 * Pergunta rápida que acompanha cada mão. A primeira carta jogada decide o conceito; mãos grandes (4–5 cartas)
 * puxam as perguntas mais difíceis. Errar não trava nada: cada resposta errada só tira precisão da mão.
 */
export interface Question {
  id: string;
  /** Conceito da pergunta: a carta desse conceito vale o dobro na mão. */
  card: CardId;
  hard: boolean;
  /** Use `código` entre crases para destacar trechos. */
  prompt: string;
  /** Trecho de Python mostrado junto da pergunta. */
  code?: string;
  options: string[];
  /** Posição da resposta certa em `options`. */
  answer: number;
  /** Mostrada depois de acertar: é aqui que o jogador aprende. */
  explanation: string;
}

const q = (
  id: string,
  card: CardId,
  hard: boolean,
  prompt: string,
  options: string[],
  answer: number,
  explanation: string,
  code?: string,
): Question => ({ id, card, hard, prompt, code, options, answer, explanation });

export const QUESTIONS: readonly Question[] = [
  // ------------------------------------------------------------ variable
  q(
    'q-variable-1',
    'variable',
    false,
    'Qual linha guarda o valor 10 numa variável chamada `pontos`?',
    ['pontos = 10', '10 = pontos', 'pontos == 10', 'guardar pontos 10'],
    0,
    'O `=` atribui o valor ao nome da variável. O `==` compara dois valores.',
  ),
  q(
    'q-variable-2',
    'variable',
    false,
    'O que aparece na tela?',
    ['3', '4', 'x', 'Erro'],
    1,
    '`x` começou valendo 3 e depois recebeu 3 + 1. A variável guarda sempre o valor mais recente.',
    'x = 3\nx = x + 1\nprint(x)',
  ),
  q(
    'q-variable-3',
    'variable',
    true,
    'Qual destes é um nome de variável válido em Python?',
    ['2fichas', 'total-fichas', 'total_fichas', 'total fichas'],
    2,
    'Nomes não começam com número e não têm espaço nem hífen. O sublinhado resolve: `total_fichas`.',
  ),

  // ------------------------------------------------------------ operator
  q(
    'q-operator-1',
    'operator',
    false,
    'Quanto vale `7 // 2`?',
    ['3.5', '3', '4', '1'],
    1,
    '`//` é a divisão inteira: descarta a parte decimal. Já `7 / 2` daria 3.5.',
  ),
  q(
    'q-operator-2',
    'operator',
    false,
    'Qual operador devolve o RESTO de uma divisão?',
    ['/', '//', '%', '**'],
    2,
    '`%` é o módulo: `7 % 2` vale 1. É a forma clássica de testar se um número é par (`n % 2 == 0`).',
  ),
  q(
    'q-operator-3',
    'operator',
    true,
    'O que aparece na tela?',
    ['20', '14', '50', '64'],
    1,
    'A potência vem primeiro (2 ** 2 = 4), depois a multiplicação (3 * 4 = 12) e por fim a soma: 2 + 12 = 14.',
    'print(2 + 3 * 2 ** 2)',
  ),

  // ------------------------------------------------------------ boolean
  q(
    'q-boolean-1',
    'boolean',
    false,
    'Quanto vale `True and False`?',
    ['True', 'False', 'None', 'Erro'],
    1,
    'O `and` só dá True quando os DOIS lados são verdadeiros.',
  ),
  q(
    'q-boolean-2',
    'boolean',
    false,
    'Quanto vale `not False`?',
    ['False', 'True', '0', 'None'],
    1,
    'O `not` inverte o valor: o contrário de False é True.',
  ),
  q(
    'q-boolean-3',
    'boolean',
    true,
    'O que aparece na tela?',
    ['False', 'True', 'None', 'Erro'],
    1,
    'O `and` é avaliado antes do `or`: (False and False) vira False, e então True or False dá True.',
    'print(True or False and False)',
  ),

  // ------------------------------------------------------------ condition
  q(
    'q-condition-1',
    'condition',
    false,
    'Em um `if / elif / else`, quando o `else` roda?',
    [
      'Sempre, depois do if',
      'Quando nenhuma condição anterior foi verdadeira',
      'Só se o if for verdadeiro',
      'Quando há um erro',
    ],
    1,
    'O `else` é o plano B: só roda se o `if` e todos os `elif` acima dele forem falsos.',
  ),
  q(
    'q-condition-2',
    'condition',
    false,
    'O que aparece na tela?',
    ['passou', 'reprovou', '7', 'Nada'],
    0,
    'A condição `nota >= 7` é verdadeira (7 é maior ou igual a 7), então roda o bloco do `if`.',
    'nota = 7\nif nota >= 7:\n    print("passou")\nelse:\n    print("reprovou")',
  ),
  q(
    'q-condition-3',
    'condition',
    true,
    'O que aparece na tela?',
    ['A', 'B', 'A e B', 'C'],
    0,
    'O `elif` só é testado se o `if` for falso. Como `n > 3` é verdadeiro, só o "A" aparece.',
    'n = 5\nif n > 3:\n    print("A")\nelif n > 4:\n    print("B")\nelse:\n    print("C")',
  ),

  // ------------------------------------------------------------ for
  q(
    'q-for-1',
    'for',
    false,
    'Quais valores o `for` percorre em `range(3)`?',
    ['1, 2, 3', '0, 1, 2', '0, 1, 2, 3', 'Só o 3'],
    1,
    '`range(3)` começa no 0 e vai até o 2: o 3 fica de fora. São três valores.',
  ),
  q(
    'q-for-2',
    'for',
    false,
    'Quantas vezes "DEV" aparece na tela?',
    ['1', '2', '3', '4'],
    2,
    'O `for` repete o bloco uma vez para cada valor de `range(3)`: três vezes.',
    'for i in range(3):\n    print("DEV")',
  ),
  q(
    'q-for-3',
    'for',
    true,
    'O que aparece na tela?',
    ['3', '6', '123', '0'],
    1,
    'A cada volta, `total` acumula o item: 0 + 1 + 2 + 3 = 6. Esse padrão se chama acumulador.',
    'total = 0\nfor n in [1, 2, 3]:\n    total += n\nprint(total)',
  ),

  // ------------------------------------------------------------ while
  q(
    'q-while-1',
    'while',
    false,
    'Quando um `while` para de repetir?',
    ['Quando a condição fica falsa', 'Depois de 10 voltas', 'Nunca para', 'Na primeira volta'],
    0,
    'O `while` testa a condição antes de cada volta e para quando ela deixa de ser verdadeira.',
  ),
  q(
    'q-while-2',
    'while',
    false,
    'O que aparece na tela?',
    ['2', '3', '4', '0'],
    1,
    '`n` sobe de 0 até 3. Quando chega em 3, `n < 3` fica falso e o loop acaba com n valendo 3.',
    'n = 0\nwhile n < 3:\n    n += 1\nprint(n)',
  ),
  q(
    'q-while-3',
    'while',
    true,
    'O que há de errado com esse código?',
    [
      'Nada: imprime 10 uma vez',
      '`n` nunca muda, então é um loop infinito',
      '`while` precisa de `range`',
      'O `print` não pode ficar dentro do loop',
    ],
    1,
    'Nada dentro do loop altera `n`, então `n > 0` é verdadeiro para sempre. Faltou algo como `n -= 1`.',
    'n = 10\nwhile n > 0:\n    print(n)',
  ),

  // ------------------------------------------------------------ list
  q(
    'q-list-1',
    'list',
    false,
    'O que aparece na tela?',
    ['0', '5', '10', '15'],
    1,
    'A contagem de posições começa no 0: `fichas[0]` é o primeiro item, o 5.',
    'fichas = [5, 10, 15]\nprint(fichas[0])',
  ),
  q(
    'q-list-2',
    'list',
    false,
    'Qual método adiciona um item ao FINAL de uma lista?',
    ['add()', 'append()', 'push()', 'insert_end()'],
    1,
    '`lista.append(x)` coloca `x` no fim. (`add` é dos conjuntos e `push` não existe em Python.)',
  ),
  q(
    'q-list-3',
    'list',
    true,
    'O que aparece na tela?',
    ['4 4', '1 4', '3 4', '4 3'],
    0,
    'O índice -1 é o último item (4) e `len` conta os itens: são 4.',
    'l = [1, 2, 3, 4]\nprint(l[-1], len(l))',
  ),

  // ------------------------------------------------------------ dictionary
  q(
    'q-dictionary-1',
    'dictionary',
    false,
    'O que aparece na tela?',
    ['ana', '3', "{'ana': 3}", 'Erro'],
    1,
    'Um dicionário guarda pares chave: valor. Pedir `d["ana"]` devolve o valor da chave, 3.',
    'd = {"ana": 3}\nprint(d["ana"])',
  ),
  q(
    'q-dictionary-2',
    'dictionary',
    false,
    'O que um dicionário guarda?',
    ['Só números', 'Pares chave: valor', 'Só textos', 'Só itens em fila'],
    1,
    'Cada item tem uma chave (para procurar) e um valor (o que foi guardado).',
  ),
  q(
    'q-dictionary-3',
    'dictionary',
    true,
    'O que aparece na tela?',
    ['1', '2', '3', 'Erro'],
    1,
    'Atribuir a uma chave nova adiciona um par ao dicionário. Agora ele tem "a" e "b": 2 itens.',
    'd = {"a": 1}\nd["b"] = 2\nprint(len(d))',
  ),

  // ------------------------------------------------------------ set
  q(
    'q-set-1',
    'set',
    false,
    'Qual é a principal característica de um `set`?',
    [
      'Não aceita números',
      'Não guarda itens repetidos',
      'Guarda pares chave: valor',
      'É sempre ordenado',
    ],
    1,
    'Um conjunto ignora repetidos. Por isso `set(lista)` é um jeito rápido de tirar duplicatas.',
  ),
  q(
    'q-set-2',
    'set',
    false,
    'O que aparece na tela?',
    ['4', '3', '2', 'Erro'],
    1,
    'O 2 aparece duas vezes, mas o conjunto guarda um só: sobram 1, 2 e 3.',
    'print(len({1, 2, 2, 3}))',
  ),
  q(
    'q-set-3',
    'set',
    true,
    'O que aparece na tela?',
    ['{1, 2, 3, 4}', '{2, 3}', '{1, 4}', '{}'],
    1,
    'O `&` é a interseção: só ficam os itens que estão nos DOIS conjuntos, o 2 e o 3.',
    'a = {1, 2, 3}\nb = {2, 3, 4}\nprint(a & b)',
  ),

  // ------------------------------------------------------------ function
  q(
    'q-function-1',
    'function',
    false,
    'Qual palavra define uma função em Python?',
    ['func', 'function', 'def', 'fn'],
    2,
    '`def nome(parametros):` abre uma função. O corpo vem recuado logo abaixo.',
  ),
  q(
    'q-function-2',
    'function',
    false,
    'Para que serve uma função?',
    [
      'Só para enfeitar o código',
      'Agrupar um trecho de código para reutilizar',
      'Guardar dados',
      'Repetir sem parar',
    ],
    1,
    'Escreva uma vez, use quantas vezes quiser. Isso evita copiar e colar o mesmo código.',
  ),
  q(
    'q-function-3',
    'function',
    true,
    'O que aparece na tela?',
    ['4', '8', '2', 'Erro'],
    1,
    'Primeiro roda a função de dentro: dobro(2) = 4. Depois dobro(4) = 8.',
    'def dobro(n):\n    return n * 2\n\nprint(dobro(dobro(2)))',
  ),

  // ------------------------------------------------------------ parameter
  q(
    'q-parameter-1',
    'parameter',
    false,
    'Na função abaixo, o que é `nome`?',
    ['Um parâmetro', 'Uma classe', 'Um valor fixo', 'Um comentário'],
    0,
    'Parâmetro é o nome que a função usa para receber o valor que você passa na chamada.',
    'def ola(nome):\n    print("Olá,", nome)',
  ),
  q(
    'q-parameter-2',
    'parameter',
    false,
    'O que aparece na tela?',
    ['23', '5', 'a + b', 'Erro'],
    1,
    'Os valores 2 e 3 viram `a` e `b`. A função devolve a + b = 5.',
    'def soma(a, b):\n    return a + b\n\nprint(soma(2, 3))',
  ),
  q(
    'q-parameter-3',
    'parameter',
    true,
    'O que aparece na tela?',
    ['6', '9', '3', 'Erro'],
    1,
    'Quando você não passa `exp`, vale o valor padrão 2: 3 ** 2 = 9.',
    'def poder(base, exp=2):\n    return base ** exp\n\nprint(poder(3))',
  ),

  // ------------------------------------------------------------ return
  q(
    'q-return-1',
    'return',
    false,
    'O que o `return` faz?',
    [
      'Imprime na tela',
      'Devolve um valor e encerra a função',
      'Repete a função',
      'Cria uma variável',
    ],
    1,
    '`return` entrega o resultado a quem chamou a função e termina a execução dela.',
  ),
  q(
    'q-return-2',
    'return',
    false,
    'O `print("fim")` chega a rodar?',
    ['Sim, sempre', 'Não: a função acaba no return', 'Só na segunda chamada', 'Dá erro'],
    1,
    'Tudo que vem depois de um `return` é ignorado, porque a função já terminou.',
    'def f():\n    return 1\n    print("fim")\n\nf()',
  ),
  q(
    'q-return-3',
    'return',
    true,
    'O que aparece na tela?',
    ['6', '3', 'None', 'Erro'],
    2,
    'Sem `return`, a função devolve `None`. A conta `x * 2` foi feita, mas ninguém a devolveu.',
    'def f(x):\n    x * 2\n\nprint(f(3))',
  ),

  // ------------------------------------------------------------ recursion
  q(
    'q-recursion-1',
    'recursion',
    false,
    'O que é recursão?',
    [
      'Um loop com while',
      'Uma função que chama a si mesma',
      'Uma função sem parâmetros',
      'Um erro de sintaxe',
    ],
    1,
    'Na recursão a função resolve um pedaço do problema e chama a si mesma para o resto.',
  ),
  q(
    'q-recursion-2',
    'recursion',
    false,
    'Toda função recursiva precisa de…',
    ['Um caso base que pare as chamadas', 'Uma lista', 'Um dicionário', 'Um while'],
    0,
    'Sem um caso base, a função chamaria a si mesma para sempre até estourar a pilha.',
  ),
  q(
    'q-recursion-3',
    'recursion',
    true,
    'O que aparece na tela?',
    ['3', '6', '0', 'Erro'],
    1,
    'f(3) = 3 + f(2) = 3 + 2 + f(1) = 3 + 2 + 1 + f(0) = 6. O caso base f(0) devolve 0.',
    'def f(n):\n    if n == 0:\n        return 0\n    return n + f(n - 1)\n\nprint(f(3))',
  ),

  // ------------------------------------------------------------ search
  q(
    'q-search-1',
    'search',
    false,
    'Para achar um item numa lista DESORDENADA, o jeito mais simples é…',
    ['Busca linear: olhar item por item', 'Busca binária', 'Ordenar sempre antes', 'Não tem como'],
    0,
    'A busca linear funciona em qualquer lista. A binária só funciona se ela estiver ordenada.',
  ),
  q(
    'q-search-2',
    'search',
    false,
    'A busca binária exige que a lista esteja…',
    ['Vazia', 'Ordenada', 'Só com números pares', 'Sem repetidos'],
    1,
    'Ela olha o item do meio e descarta metade da lista. Isso só faz sentido se a lista estiver em ordem.',
  ),
  q(
    'q-search-3',
    'search',
    true,
    'Quantas comparações, no máximo, a busca binária faz numa lista ordenada de 8 itens?',
    ['8', '4', '2', '1'],
    1,
    'A cada passo ela descarta metade: 8 → 4 → 2 → 1. No máximo 4 comparações, contra até 8 da busca linear.',
  ),

  // ------------------------------------------------------------ unit-test
  q(
    'q-unit-test-1',
    'unit-test',
    false,
    'O que é um teste unitário?',
    [
      'Um código que confere se uma função devolve o esperado',
      'Um tipo de loop',
      'Uma lista de erros',
      'Um comentário',
    ],
    0,
    'Você escreve o resultado que espera e deixa o código conferir. Se alguém quebrar a função, o teste avisa.',
  ),
  q(
    'q-unit-test-2',
    'unit-test',
    false,
    'Se `soma(2, 2)` devolver 5, o que acontece?',
    ['Nada', 'Dá erro (AssertionError)', 'Imprime 5', 'Corrige sozinho'],
    1,
    'O `assert` para o programa com um erro quando a condição é falsa. É assim que o teste "reclama".',
    'assert soma(2, 2) == 4',
  ),
  q(
    'q-unit-test-3',
    'unit-test',
    true,
    'Além do caso comum, o que também vale a pena testar?',
    [
      'Só o caso comum',
      'Casos limite, como lista vazia ou zero',
      'Nada: testes são opcionais',
      'Só números negativos',
    ],
    1,
    'Os bugs moram nas bordas: lista vazia, zero, um único item. É lá que um bom teste procura.',
  ),

  // ------------------------------------------------------------ breakpoint
  q(
    'q-breakpoint-1',
    'breakpoint',
    false,
    'Para que serve um breakpoint?',
    [
      'Pausar a execução numa linha para inspecionar o código',
      'Apagar a linha',
      'Deixar o programa mais rápido',
      'Comentar o código',
    ],
    0,
    'Com a execução pausada, você olha com calma o que cada variável guarda naquele momento.',
  ),
  q(
    'q-breakpoint-2',
    'breakpoint',
    false,
    'Parado num breakpoint, o que você pode fazer?',
    ['Ver os valores das variáveis', 'Só fechar o programa', 'Trocar de linguagem', 'Nada'],
    0,
    'Inspecionar variáveis e andar linha a linha é a forma mais direta de achar onde um bug nasce.',
  ),
  q(
    'q-breakpoint-3',
    'breakpoint',
    true,
    'O que acontece ao rodar este código?',
    [
      'Imprime a e b direto',
      'Imprime a e abre o depurador antes de imprimir b',
      'Erro de sintaxe',
      'Imprime só b',
    ],
    1,
    '`breakpoint()` abre o depurador (pdb). A execução fica pausada ali, esperando você, antes do `print("b")`.',
    'print("a")\nbreakpoint()\nprint("b")',
  ),
];

/** Pergunta do boss final: fixa na 1ª mão da THE INFINITE LOOP. */
export const BOSS_QUESTION: Question = q(
  'q-boss-infinite-loop',
  'while',
  true,
  'THE INFINITE LOOP travou a mesa. Por que este loop nunca termina?',
  [
    '`print` consome as vidas',
    '`vidas` nunca diminui, então `vidas > 0` é sempre verdadeiro',
    '`while` não aceita números',
    'Falta um `return`',
  ],
  1,
  'Nada dentro do loop altera `vidas`. Faltou `vidas -= 1`: sem isso a condição nunca fica falsa.',
  'vidas = 3\nwhile vidas > 0:\n    print("jogando")',
);

export const ALL_QUESTIONS: readonly Question[] = [...QUESTIONS, BOSS_QUESTION];

const BY_ID = new Map(ALL_QUESTIONS.map((question) => [question.id, question]));

export function getQuestion(id: string): Question {
  const question = BY_ID.get(id);
  if (!question) throw new Error(`Pergunta desconhecida: ${id}`);
  return question;
}

export function hasQuestion(id: string): boolean {
  return BY_ID.has(id);
}

/**
 * Perguntas candidatas para a carta que lidera a mão. Mãos grandes puxam as difíceis; se não houver,
 * cai para qualquer pergunta do conceito.
 */
export function questionPool(lead: CardId, big: boolean): Question[] {
  const all = QUESTIONS.filter((question) => question.card === lead);
  const level = all.filter((question) => question.hard === big);
  return level.length > 0 ? level : all;
}
