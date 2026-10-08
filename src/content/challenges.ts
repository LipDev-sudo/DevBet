import type { Challenge } from '@/engine/challenge';

/** Recompensas por dificuldade (1–5). Metas (`target`) são calibradas por teste de simulação. */
const TIER = {
  1: { basePoints: 100, chipReward: 12, xp: 25 },
  2: { basePoints: 130, chipReward: 16, xp: 35 },
  3: { basePoints: 170, chipReward: 20, xp: 45 },
  4: { basePoints: 220, chipReward: 24, xp: 55 },
  5: { basePoints: 280, chipReward: 28, xp: 65 },
} as const;

type Draft = Omit<Challenge, 'basePoints' | 'chipReward' | 'xp'>;

function make(draft: Draft): Challenge {
  return { ...draft, ...TIER[draft.difficulty] };
}

/** Desafios em Python. Ordem = ordem de aparição na mesa. */
export const CHALLENGES: readonly Challenge[] = [
  make({
    id: 'calcular-total',
    title: 'O Troco da Mesa',
    areaId: 'fundamentos',
    topic: 'basics',
    difficulty: 1,
    target: 360,
    context: 'O caixa fecha a conta de uma mesa: cada ficha tem um preço e a casa dá um desconto.',
    objective: [
      'Escreva `calcular_total(preco, quantidade, desconto)`, que recebe três números (podem ser decimais).',
      'Ela **devolve** (com `return`, não `print`) preço × quantidade − desconto.',
      'Exemplo: `calcular_total(10, 3, 5)` devolve `25`.',
    ],
    concept: 'Variáveis, operadores aritméticos, parâmetros e return.',
    concepts: ['variable', 'operator', 'function', 'parameter', 'return'],
    functionName: 'calcular_total',
    starterCode:
      'def calcular_total(preco, quantidade, desconto):\n    # seu código aqui\n    pass\n',
    tests: [
      { name: 'Teste 01 — conta simples', expr: 'calcular_total(12, 2, 4)', expected: 20 },
      { name: 'Teste 02 — nenhuma ficha', expr: 'calcular_total(7, 0, 0)', expected: 0 },
      { name: 'Teste 03 — números decimais', expr: 'calcular_total(2.5, 4, 1)', expected: 9 },
      {
        name: 'Teste oculto — conta grande',
        expr: 'calcular_total(20, 5, 0)',
        expected: 100,
        hidden: true,
      },
    ],
    ladder: {
      question:
        'Antes de digitar: quais valores entram na conta e em que ordem as operações acontecem?',
      clue: 'São duas operações: uma multiplicação e uma subtração. Qual das duas vem primeiro?',
      concept:
        'Operadores aritméticos `*` e `-`. Uma função precisa devolver o resultado com `return`.',
      example: 'return preco * quantidade  # e o desconto?',
    },
    solution: {
      code: 'def calcular_total(preco, quantidade, desconto):\n    return preco * quantidade - desconto',
      explanation:
        'A multiplicação acontece antes da subtração (precedência de operadores). O `return` entrega o resultado a quem chamou a função; sem ele, a função devolveria `None`.',
    },
  } as Draft),

  make({
    id: 'saudacao',
    title: 'Boas-vindas',
    areaId: 'fundamentos',
    topic: 'basics',
    difficulty: 1,
    target: 330,
    context: 'O Dealer cumprimenta cada jogador pelo nome.',
    objective: [
      'Escreva `saudacao(nome)`, que recebe um texto qualquer e **devolve** exatamente `Olá, ` + nome + `!`.',
      'O formato é fixo: "O" maiúsculo, acento no "á", vírgula, um espaço, o nome como veio e ponto de exclamação. Vale para qualquer nome, não só o do exemplo.',
      'Exemplo: `saudacao("Ana")` devolve `"Olá, Ana!"`.',
    ],
    concept: 'Strings, f-strings e return.',
    concepts: ['variable', 'function', 'parameter', 'return'],
    functionName: 'saudacao',
    starterCode: 'def saudacao(nome):\n    # seu código aqui\n    pass\n',
    tests: [
      { name: 'Teste 01 — Marina', expr: 'saudacao("Marina")', expected: 'Olá, Marina!' },
      { name: 'Teste 02 — Dev', expr: 'saudacao("Dev")', expected: 'Olá, Dev!' },
      { name: 'Teste oculto — acento', expr: 'saudacao("Zé")', expected: 'Olá, Zé!', hidden: true },
    ],
    ladder: {
      question: 'O resultado é um texto. Que partes dele são sempre iguais e qual parte muda?',
      clue: 'Uma parte é fixa e a outra vem do parâmetro `nome`. Como juntar texto com variável em Python?',
      concept: 'Strings podem ser unidas com `+` ou montadas com f-strings: `f"Olá, {nome}!"`.',
      example: 'return "Olá, " + ...  # o que vem depois?',
    },
    solution: {
      code: 'def saudacao(nome):\n    return f"Olá, {nome}!"',
      explanation:
        'Uma f-string (aspas com `f` na frente) insere variáveis dentro das chaves `{}`. Também funcionaria `"Olá, " + nome + "!"`.',
    },
  } as Draft),

  make({
    id: 'eh-bissexto',
    title: 'O Ano da Sorte',
    areaId: 'logica',
    topic: 'logic',
    difficulty: 2,
    target: 480,
    context: 'O Grande Torneio só abre em anos bissextos.',
    objective: [
      'Escreva `eh_bissexto(ano)`, que recebe um ano inteiro e devolve o booleano `True` ou `False` (não texto).',
      'Um ano é bissexto se for divisível por 4, exceto os divisíveis por 100 — a não ser que também sejam divisíveis por 400.',
      'Exemplo: `eh_bissexto(2024)` devolve `True`.',
    ],
    concept: 'Booleanos, operadores lógicos (and, or) e resto da divisão (%).',
    concepts: ['boolean', 'condition', 'operator'],
    functionName: 'eh_bissexto',
    starterCode: 'def eh_bissexto(ano):\n    # seu código aqui\n    pass\n',
    tests: [
      { name: 'Teste 01 — 2016', expr: 'eh_bissexto(2016)', expected: true },
      { name: 'Teste 02 — 2023', expr: 'eh_bissexto(2023)', expected: false },
      { name: 'Teste 03 — 2000', expr: 'eh_bissexto(2000)', expected: true },
      { name: 'Teste oculto — 1900', expr: 'eh_bissexto(1900)', expected: false, hidden: true },
      { name: 'Teste oculto — 2100', expr: 'eh_bissexto(2100)', expected: false, hidden: true },
    ],
    ladder: {
      question: 'Escreva as regras do ano bissexto em português. Quais são exceções de quais?',
      clue: 'São três condições. Quais delas se combinam com `and` e quais com `or`?',
      concept:
        'Booleanos e operadores `and` / `or`. O operador `%` dá o resto: resto 0 significa divisível.',
      example: 'ano % 4 == 0 and ano % 100 != 0   # esta é só uma das metades',
    },
    solution: {
      code: 'def eh_bissexto(ano):\n    return (ano % 4 == 0 and ano % 100 != 0) or ano % 400 == 0',
      explanation:
        'A expressão já é um booleano, então dá para devolvê-la direto. Ou o ano é múltiplo de 4 e não de 100, ou é múltiplo de 400.',
    },
  } as Draft),

  make({
    id: 'classificar-idade',
    title: 'Fila da Entrada',
    areaId: 'logica',
    topic: 'logic',
    difficulty: 2,
    target: 430,
    context: 'O segurança do cassino separa os visitantes em faixas.',
    objective: [
      'Escreva `classificar_idade(idade)`, que recebe uma idade inteira.',
      'Ela **devolve** exatamente um destes textos, em minúsculas e sem acento: `"crianca"` (menos de 12), `"adolescente"` (12 a 17), `"adulto"` (18 a 59) ou `"idoso"` (60 ou mais).',
      'Exemplo: `classificar_idade(8)` devolve `"crianca"`.',
    ],
    concept: 'if / elif / else e comparações.',
    concepts: ['condition', 'boolean'],
    functionName: 'classificar_idade',
    starterCode: 'def classificar_idade(idade):\n    # seu código aqui\n    pass\n',
    tests: [
      { name: 'Teste 01 — 5 anos', expr: 'classificar_idade(5)', expected: 'crianca' },
      { name: 'Teste 02 — 15 anos', expr: 'classificar_idade(15)', expected: 'adolescente' },
      { name: 'Teste 03 — 30 anos', expr: 'classificar_idade(30)', expected: 'adulto' },
      { name: 'Teste 04 — 70 anos', expr: 'classificar_idade(70)', expected: 'idoso' },
      {
        name: 'Teste oculto — limite 12',
        expr: 'classificar_idade(12)',
        expected: 'adolescente',
        hidden: true,
      },
      {
        name: 'Teste oculto — limite 18',
        expr: 'classificar_idade(18)',
        expected: 'adulto',
        hidden: true,
      },
      {
        name: 'Teste oculto — limite 60',
        expr: 'classificar_idade(60)',
        expected: 'idoso',
        hidden: true,
      },
    ],
    ladder: {
      question:
        'Em que ordem você precisa perguntar as faixas para que a primeira resposta verdadeira já seja a certa?',
      clue: 'Comece pelo menor limite. Se a idade não é menor que 12, ela segue para a próxima pergunta.',
      concept: '`if` / `elif` / `else`: só o primeiro bloco verdadeiro executa.',
      example: 'if idade < 12:\n    return "crianca"\n# e as outras faixas?',
    },
    solution: {
      code: 'def classificar_idade(idade):\n    if idade < 12:\n        return "crianca"\n    elif idade < 18:\n        return "adolescente"\n    elif idade < 60:\n        return "adulto"\n    return "idoso"',
      explanation:
        'Cada `elif` só é avaliado se os anteriores falharam, então basta comparar com o limite superior de cada faixa. O último `return` cobre todo o resto.',
    },
  } as Draft),

  make({
    id: 'somar-ate',
    title: 'A Pilha de Fichas',
    areaId: 'loops',
    topic: 'loops',
    difficulty: 3,
    target: 560,
    context: 'O croupier empilha fichas: 1 na primeira rodada, 2 na segunda, 3 na terceira…',
    objective: [
      'Escreva `somar_ate(n)`, que recebe um inteiro `n` (0 ou mais) e devolve a soma de todos os inteiros de 1 até `n`, incluindo o próprio `n`.',
      'Para `n = 0`, devolve 0.',
      'Exemplo: `somar_ate(3)` devolve `6` (1 + 2 + 3).',
    ],
    concept: 'Loop for com range, acumulador e condição de parada.',
    concepts: ['for', 'variable', 'operator'],
    functionName: 'somar_ate',
    starterCode: 'def somar_ate(n):\n    soma = 0\n    # seu código aqui\n    return soma\n',
    tests: [
      { name: 'Teste 01 — até 4', expr: 'somar_ate(4)', expected: 10 },
      { name: 'Teste 02 — até 10', expr: 'somar_ate(10)', expected: 55 },
      { name: 'Teste 03 — zero', expr: 'somar_ate(0)', expected: 0 },
      { name: 'Teste oculto — até 100', expr: 'somar_ate(100)', expected: 5050, hidden: true },
    ],
    ladder: {
      question: 'Antes de escrever o código: o que você precisa repetir?',
      clue: 'Existe uma estrutura que permite repetir um bloco de código para cada valor de uma sequência.',
      concept:
        'Talvez um loop `for` com `range` seja útil aqui, com uma variável acumuladora guardando a soma.',
      example: 'for i in range(1, n + 1):\n    # o que fazer com i?',
    },
    efficient: {
      pattern: 'n\\s*\\*\\s*\\(\\s*n\\s*\\+\\s*1\\s*\\)|\\(\\s*n\\s*\\+\\s*1\\s*\\)\\s*\\*\\s*n',
    },
    solution: {
      code: 'def somar_ate(n):\n    soma = 0\n    for i in range(1, n + 1):\n        soma += i\n    return soma',
      explanation:
        'O acumulador `soma` começa em 0 e recebe cada `i`. `range(1, n + 1)` vai de 1 até n (o fim não é incluído). Com `n = 0` o loop nem entra. Existe também a fórmula `n * (n + 1) // 2`.',
    },
  } as Draft),

  make({
    id: 'contar-vogais',
    title: 'A Roleta de Letras',
    areaId: 'loops',
    topic: 'loops',
    difficulty: 3,
    target: 570,
    context: 'A roleta de letras paga um bônus por vogal.',
    objective: [
      'Escreva `contar_vogais(texto)`, que recebe um texto.',
      'Ela **devolve** um número inteiro: quantas vezes aparecem as letras a, e, i, o, u, maiúsculas ou minúsculas. Qualquer outro caractere não conta.',
      'Exemplo: `contar_vogais("banana")` devolve `3`.',
    ],
    concept: 'Percorrer uma string, condições dentro de loops e maiúsculas/minúsculas.',
    concepts: ['for', 'condition', 'variable'],
    functionName: 'contar_vogais',
    starterCode:
      'def contar_vogais(texto):\n    total = 0\n    # seu código aqui\n    return total\n',
    tests: [
      { name: 'Teste 01 — roleta', expr: 'contar_vogais("roleta")', expected: 3 },
      { name: 'Teste 02 — maiúsculas', expr: 'contar_vogais("DEALER")', expected: 3 },
      { name: 'Teste 03 — sem vogais', expr: 'contar_vogais("xyz")', expected: 0 },
      { name: 'Teste oculto — todas', expr: 'contar_vogais("Aeiou")', expected: 5, hidden: true },
      { name: 'Teste oculto — vazio', expr: 'contar_vogais("")', expected: 0, hidden: true },
    ],
    ladder: {
      question: 'Como você olha uma letra por vez dentro de um texto? E as maiúsculas?',
      clue: 'Uma string pode ser percorrida letra a letra com `for`. Padronize o caso antes de comparar.',
      concept: '`for letra in texto`, `.lower()` para padronizar e o teste `letra in "aeiou"`.',
      example: 'for letra in texto:\n    if letra.lower() in "aeiou":\n        # conte aqui',
    },
    solution: {
      code: 'def contar_vogais(texto):\n    total = 0\n    for letra in texto:\n        if letra.lower() in "aeiou":\n            total += 1\n    return total',
      explanation:
        'O `for` visita cada caractere; `.lower()` evita listar vogais maiúsculas; `in "aeiou"` pergunta se a letra está naquele texto.',
    },
  } as Draft),

  make({
    id: 'maior-da-lista',
    title: 'A Maior Aposta',
    areaId: 'estruturas',
    topic: 'data',
    difficulty: 4,
    target: 770,
    context: 'Entre as apostas da rodada, a casa precisa achar a maior.',
    objective: [
      'Escreva `maior_da_lista(lista)`, que recebe uma lista de números e devolve o maior deles.',
      'Se a lista estiver vazia, devolve `None`. A lista pode ter números negativos.',
      'Exemplo: `maior_da_lista([3, 9, 2])` devolve `9`.',
    ],
    concept: 'Listas, índices, comparação e o caso de lista vazia.',
    concepts: ['list', 'for', 'condition', 'variable'],
    functionName: 'maior_da_lista',
    starterCode: 'def maior_da_lista(lista):\n    # seu código aqui\n    pass\n',
    tests: [
      { name: 'Teste 01 — lista comum', expr: 'maior_da_lista([4, 12, 7])', expected: 12 },
      { name: 'Teste 02 — um item', expr: 'maior_da_lista([7])', expected: 7 },
      { name: 'Teste 03 — lista vazia', expr: 'maior_da_lista([])', expected: null },
      {
        name: 'Teste oculto — negativos',
        expr: 'maior_da_lista([-5, -2, -9])',
        expected: -2,
        hidden: true,
      },
      {
        name: 'Teste oculto — maior no fim',
        expr: 'maior_da_lista([1, 2, 3, 40])',
        expected: 40,
        hidden: true,
      },
    ],
    ladder: {
      question: 'Se você só pudesse olhar um número por vez, o que precisaria lembrar?',
      clue: 'Guarde o maior valor visto até agora e compare cada item novo com ele. Com qual valor começar?',
      concept:
        'Lista + loop + variável de comparação. Começar em 0 falha com negativos; lista vazia é um caso à parte.',
      example: 'if not lista:\n    return None\nmaior = lista[0]\n# percorra o resto da lista',
    },
    solution: {
      code: 'def maior_da_lista(lista):\n    if not lista:\n        return None\n    maior = lista[0]\n    for numero in lista[1:]:\n        if numero > maior:\n            maior = numero\n    return maior',
      explanation:
        'Partir do primeiro elemento (e não de 0) faz o algoritmo funcionar com negativos. `if not lista` é verdadeiro para lista vazia. (Em código real, `max(lista)` faz isso — aqui o objetivo é entender o loop.)',
    },
  } as Draft),

  make({
    id: 'contar-frequencia',
    title: 'O Livro de Registros',
    areaId: 'estruturas',
    topic: 'data',
    difficulty: 4,
    target: 690,
    context: 'O livro de registros anota quantas vezes cada palavra apareceu numa mão.',
    objective: [
      'Escreva `contar_frequencia(palavras)`, que recebe uma lista de strings e devolve um dicionário: cada palavra (exatamente como veio, maiúsculas e acentos contam como diferentes) é uma chave, e o valor é quantas vezes ela apareceu.',
      'Exemplo: `["a", "b", "a"]` vira `{"a": 2, "b": 1}`.',
    ],
    concept: 'Dicionários como contadores e loops.',
    concepts: ['dictionary', 'for', 'variable'],
    functionName: 'contar_frequencia',
    starterCode:
      'def contar_frequencia(palavras):\n    contagem = {}\n    # seu código aqui\n    return contagem\n',
    tests: [
      {
        name: 'Teste 01 — repetidas',
        expr: 'contar_frequencia(["rei", "dama", "rei"])',
        expected: { rei: 2, dama: 1 },
      },
      { name: 'Teste 02 — lista vazia', expr: 'contar_frequencia([])', expected: {} },
      {
        name: 'Teste 03 — palavras',
        expr: 'contar_frequencia(["ás", "rei", "ás", "dama", "rei", "ás"])',
        expected: { ás: 3, rei: 2, dama: 1 },
      },
      {
        name: 'Teste oculto — uma só',
        expr: 'contar_frequencia(["x", "x", "x"])',
        expected: { x: 3 },
        hidden: true,
      },
    ],
    ladder: {
      question:
        'Quando uma palavra aparece pela primeira vez, qual é a contagem dela antes de você somar?',
      clue: 'Um dicionário usa a própria palavra como chave. Na primeira vez, essa chave ainda não existe.',
      concept:
        'Dicionários: `d[chave]` dá erro se a chave não existe; `d.get(chave, 0)` devolve 0 nesse caso.',
      example: 'for palavra in palavras:\n    # contagem[palavra] = ???',
    },
    solution: {
      code: 'def contar_frequencia(palavras):\n    contagem = {}\n    for palavra in palavras:\n        contagem[palavra] = contagem.get(palavra, 0) + 1\n    return contagem',
      explanation:
        '`contagem.get(palavra, 0)` troca a chave inexistente da primeira ocorrência por 0, e então somamos 1. É o padrão clássico de contagem com dicionário.',
    },
  } as Draft),

  make({
    id: 'fichas-unicas',
    title: 'Fichas Únicas',
    areaId: 'estruturas',
    topic: 'data',
    difficulty: 4,
    target: 640,
    context: 'O Dealer recebeu uma lista de fichas com valores repetidos.',
    objective: [
      'Escreva `fichas_unicas(valores)`, que recebe uma lista de números e devolve uma **lista** com os mesmos valores, sem repetição, em ordem crescente.',
      'Exemplo: `[3, 1, 3, 2, 1]` vira `[1, 2, 3]`.',
    ],
    concept: 'Conjuntos (set) para eliminar repetidos e sorted().',
    concepts: ['set', 'list'],
    functionName: 'fichas_unicas',
    starterCode: 'def fichas_unicas(valores):\n    # seu código aqui\n    pass\n',
    tests: [
      { name: 'Teste 01 — repetidos', expr: 'fichas_unicas([6, 2, 6, 4, 2])', expected: [2, 4, 6] },
      { name: 'Teste 02 — um valor', expr: 'fichas_unicas([5])', expected: [5] },
      { name: 'Teste 03 — lista vazia', expr: 'fichas_unicas([])', expected: [] },
      {
        name: 'Teste oculto — todos iguais',
        expr: 'fichas_unicas([9, 9, 9, 8])',
        expected: [8, 9],
        hidden: true,
      },
      {
        name: 'Teste oculto — negativo',
        expr: 'fichas_unicas([10, -1, 10])',
        expected: [-1, 10],
        hidden: true,
      },
    ],
    ladder: {
      question: 'Qual estrutura do Python não aceita valores repetidos?',
      clue: 'Existe uma coleção que descarta duplicatas sozinha, mas ela não garante ordem.',
      concept:
        '`set` elimina repetidos; `sorted()` devolve uma lista ordenada a partir de qualquer coleção.',
      example: 'unicos = set(valores)\n# e a ordem crescente?',
    },
    solution: {
      code: 'def fichas_unicas(valores):\n    return sorted(set(valores))',
      explanation:
        '`set(valores)` remove os repetidos, mas não tem ordem garantida; `sorted(...)` devolve uma lista em ordem crescente. O resultado é uma lista, como pedido.',
    },
  } as Draft),

  make({
    id: 'fatorial',
    title: 'A Pirâmide de Cartas',
    areaId: 'funcoes',
    topic: 'algorithms',
    difficulty: 5,
    target: 1090,
    context: 'De quantas maneiras dá para ordenar n cartas na mesa? A resposta é n! (fatorial).',
    objective: [
      'Escreva `fatorial(n)`, que recebe um inteiro `n` (0 ou mais) e devolve n × (n−1) × … × 1. `fatorial(0)` e `fatorial(1)` valem 1.',
      'Resolva com **recursão**: uma função que chama a si mesma.',
      'Exemplo: `fatorial(4)` devolve `24`.',
    ],
    concept: 'Recursão, caso base e caso recursivo.',
    concepts: ['recursion', 'function', 'return', 'condition'],
    functionName: 'fatorial',
    starterCode:
      'def fatorial(n):\n    # 1) qual é o caso base, onde a recursão para?\n    # 2) como reduzir o problema para fatorial(n - 1)?\n    pass\n',
    tests: [
      { name: 'Teste 01 — fatorial de 5', expr: 'fatorial(5)', expected: 120 },
      { name: 'Teste 02 — fatorial de 1', expr: 'fatorial(1)', expected: 1 },
      { name: 'Teste 03 — fatorial de 0', expr: 'fatorial(0)', expected: 1 },
      {
        name: 'Teste oculto — fatorial de 10',
        expr: 'fatorial(10)',
        expected: 3628800,
        hidden: true,
      },
    ],
    ladder: {
      question:
        'Se você já soubesse o fatorial de n−1, como calcularia o de n? E quando pode parar de descer?',
      clue: 'O problema pode ser descrito por uma versão menor de si mesmo. Falta saber onde parar.',
      concept: 'Recursão: um caso base que encerra e um caso recursivo que reduz o problema.',
      example: 'if n <= 1:\n    return 1\n# e o caso recursivo?',
    },
    solution: {
      code: 'def fatorial(n):\n    if n <= 1:\n        return 1\n    return n * fatorial(n - 1)',
      explanation:
        'fatorial(3) = 3 * fatorial(2) = 3 * 2 * fatorial(1) = 3 * 2 * 1. O caso base interrompe a descida; sem ele, o Python levanta `RecursionError`.',
    },
  } as Draft),

  make({
    id: 'busca-linear',
    title: 'A Ficha Perdida',
    areaId: 'funcoes',
    topic: 'algorithms',
    difficulty: 4,
    target: 750,
    context: 'O Dealer precisa saber em que posição da fileira está uma ficha.',
    objective: [
      'Escreva `busca_linear(lista, alvo)`, que devolve o índice (começando em 0) da primeira ocorrência de `alvo` na lista.',
      'Se o alvo não estiver na lista, devolve `-1`.',
      'Exemplo: `busca_linear([4, 8, 15, 16], 15)` devolve `2`.',
    ],
    concept: 'Busca linear: percorrer a lista até achar, ou concluir que não existe.',
    concepts: ['search', 'list', 'for', 'condition', 'return'],
    functionName: 'busca_linear',
    starterCode: 'def busca_linear(lista, alvo):\n    # seu código aqui\n    pass\n',
    tests: [
      { name: 'Teste 01 — no meio', expr: 'busca_linear([20, 30, 40], 30)', expected: 1 },
      { name: 'Teste 02 — ausente', expr: 'busca_linear([4, 8], 9)', expected: -1 },
      { name: 'Teste 03 — lista vazia', expr: 'busca_linear([], 1)', expected: -1 },
      {
        name: 'Teste oculto — primeira ocorrência',
        expr: 'busca_linear([7, 7, 7], 7)',
        expected: 0,
        hidden: true,
      },
      {
        name: 'Teste oculto — no fim',
        expr: 'busca_linear([1, 2, 3], 3)',
        expected: 2,
        hidden: true,
      },
    ],
    ladder: {
      question:
        'Como procurar uma ficha numa fileira sem pular nenhuma posição? E se ela não estiver lá?',
      clue: 'Percorra a lista guardando a posição de cada item. Quando achar, pare e devolva a posição.',
      concept:
        "`enumerate(lista)` entrega índice e valor; `return` dentro do loop encerra a busca. O caso 'não achei' fica depois do loop.",
      example: 'for i, valor in enumerate(lista):\n    # é o alvo?\n# depois do loop: não achou',
    },
    solution: {
      code: 'def busca_linear(lista, alvo):\n    for i, valor in enumerate(lista):\n        if valor == alvo:\n            return i\n    return -1',
      explanation:
        'O `return i` dentro do loop encerra a função assim que acha. Se o loop termina sem achar, o `return -1` cobre o caso ausente. No pior caso olha todos os itens: O(n).',
    },
  } as Draft),
];

export const BOSS_CHALLENGE: Challenge = {
  id: 'boss-infinite-loop',
  title: 'THE INFINITE LOOP',
  areaId: 'engenharia',
  topic: 'debug',
  difficulty: 5,
  boss: true,
  target: 1470,
  basePoints: 400,
  chipReward: 60,
  xp: 200,
  context: 'High Table. A casa escondeu dois bugs nesta função; um deles trava a mesa para sempre.',
  objective: [
    '`contagem_regressiva(n)` deveria devolver a contagem de `n` até 1, sem o zero: `contagem_regressiva(3)` devolve `[3, 2, 1]`.',
    'Encontre e corrija os bugs. Se a execução travar, o jogo encerra o código sozinho — e isso é uma pista.',
  ],
  concept: 'Depuração: condição de parada, atualização da variável de controle e off-by-one.',
  concepts: ['while', 'condition', 'function', 'breakpoint', 'unit-test'],
  functionName: 'contagem_regressiva',
  starterCode:
    '# A casa escondeu DOIS bugs aqui.\n# A função deveria devolver a contagem de n até 1 (sem o zero).\ndef contagem_regressiva(n):\n    resultado = []\n    i = n\n    while i >= 0:\n        resultado.append(i)\n    return resultado\n',
  tests: [
    { name: 'Teste 01 — de 4 até 1', expr: 'contagem_regressiva(4)', expected: [4, 3, 2, 1] },
    { name: 'Teste 02 — só o 1', expr: 'contagem_regressiva(1)', expected: [1] },
    { name: 'Teste 03 — zero não conta', expr: 'contagem_regressiva(0)', expected: [] },
    {
      name: 'Teste oculto — de 5 até 1',
      expr: 'contagem_regressiva(5)',
      expected: [5, 4, 3, 2, 1],
      hidden: true,
    },
  ],
  ladder: {
    question: 'O teste travou. Um loop só termina se algo muda a cada volta. O que muda aqui?',
    clue: 'Olhe a condição do `while` e o que acontece com `i` dentro do bloco. Depois, o limite: o zero deveria entrar?',
    concept:
      'Loop infinito: a variável de controle nunca é atualizada. Off-by-one: `>=` onde deveria ser `>`.',
  },
  solution: {
    code: 'def contagem_regressiva(n):\n    resultado = []\n    i = n\n    while i > 0:\n        resultado.append(i)\n        i -= 1\n    return resultado',
    explanation:
      'Sem `i -= 1`, a variável de controle nunca muda e a condição fica verdadeira para sempre: loop infinito. Já `i >= 0` era um erro de limite (off-by-one) que incluiria o 0 na lista.',
  },
} as Challenge;

export const ALL_CHALLENGES: readonly Challenge[] = [...CHALLENGES, BOSS_CHALLENGE];

export function getChallenge(id: string): Challenge {
  const challenge = ALL_CHALLENGES.find((c) => c.id === id);
  if (!challenge) throw new Error(`Desafio desconhecido: ${id}`);
  return challenge;
}
