import type { Challenge } from '@/engine/challenge';
import type { CardId, Topic } from '@/engine/types';

/** [rótulo, expressão Python, valor esperado] */
type Row = readonly [string, string, unknown];

interface Spec {
  id: string;
  title: string;
  areaId: string;
  topic: Topic;
  difficulty: 1 | 2 | 3;
  context: string;
  objective: string[];
  concept: string;
  concepts: CardId[];
  functionName: string;
  params: string;
  /** Código inicial; por padrão, o esqueleto vazio. */
  starterCode?: string;
  visible: Row[];
  hidden: Row[];
  ladder: { question: string; clue: string; concept: string; example: string };
  solution: { code: string; explanation: string };
}

/**
 * Mini-desafios: um exercício minúsculo de Python por mão jogada.
 * Os campos de pontuação não são usados pelo novo loop.
 */
function mini(spec: Spec): Challenge {
  const { params, visible, hidden, starterCode, ...rest } = spec;
  return {
    ...rest,
    starterCode:
      starterCode ?? `def ${spec.functionName}(${params}):\n    # seu código aqui\n    pass\n`,
    tests: [
      ...visible.map(([label, expr, expected], i) => ({
        name: `Teste 0${i + 1} — ${label}`,
        expr,
        expected,
      })),
      ...hidden.map(([label, expr, expected]) => ({
        name: `Teste oculto — ${label}`,
        expr,
        expected,
        hidden: true,
      })),
    ],
    basePoints: 0,
    chipReward: 0,
    xp: 0,
    target: 0,
  };
}

export const MINI_CHALLENGES: readonly Challenge[] = [
  // ───────────────────────── variable ─────────────────────────
  mini({
    id: 'mini-variable-1',
    title: 'Crachá de Cassino',
    areaId: 'fundamentos',
    topic: 'basics',
    difficulty: 1,
    context: 'A recepção do DEVBet cria um apelido único para cada jogador novo.',
    objective: [
      'Escreva `monta_apelido(nome, numero)`, que recebe um texto e um inteiro.',
      'Ela **devolve** o texto no formato `nome#numero`, sem espaços (o número aparece como dígitos).',
      'Exemplo: `monta_apelido("Ana", 7)` devolve `"Ana#7"`.',
    ],
    concept: 'Variáveis guardam valores; f-strings montam textos com elas.',
    concepts: ['variable', 'parameter', 'return'],
    functionName: 'monta_apelido',
    params: 'nome, numero',
    visible: [
      ['Bia', 'monta_apelido("Bia", 12)', 'Bia#12'],
      ['Zé zero', 'monta_apelido("Zé", 0)', 'Zé#0'],
      ['Rui', 'monta_apelido("Rui", 100)', 'Rui#100'],
    ],
    hidden: [['Lu', 'monta_apelido("Lu", 5)', 'Lu#5']],
    ladder: {
      question: 'Que partes do apelido vêm de fora e qual símbolo fica sempre igual?',
      clue: 'Guarde o texto montado em uma variável antes de devolver.',
      concept:
        'Uma variável é um nome para um valor: `apelido = ...`. Uma f-string usa `{}` para inserir valores.',
      example: 'apelido = f"{nome}..."  # e o resto?',
    },
    solution: {
      code: 'def monta_apelido(nome, numero):\n    apelido = f"{nome}#{numero}"\n    return apelido',
      explanation:
        'A variável `apelido` guarda o texto montado pela f-string, e o `return` o entrega a quem chamou a função.',
    },
  }),
  mini({
    id: 'mini-variable-2',
    title: 'Troca de Fichas',
    areaId: 'fundamentos',
    topic: 'basics',
    difficulty: 2,
    context: 'Dois jogadores trocam as fichas que seguram na mão.',
    objective: [
      'Escreva `troca_fichas(a, b)`, que recebe dois valores quaisquer.',
      'Ela **devolve** uma lista com os dois valores trocados de lugar: `[b, a]`.',
      'Exemplo: `troca_fichas(1, 2)` devolve `[2, 1]`.',
    ],
    concept: 'Atribuição múltipla permite trocar o conteúdo de duas variáveis.',
    concepts: ['variable', 'list'],
    functionName: 'troca_fichas',
    params: 'a, b',
    visible: [
      ['números', 'troca_fichas(10, 20)', [20, 10]],
      ['textos', 'troca_fichas("ouro", "prata")', ['prata', 'ouro']],
      ['iguais', 'troca_fichas(5, 5)', [5, 5]],
    ],
    hidden: [['negativo', 'troca_fichas(0, -3)', [-3, 0]]],
    ladder: {
      question: 'Se você escrever a = b, o que acontece com o valor antigo de a?',
      clue: 'Python deixa atribuir duas variáveis de uma vez só.',
      concept: 'Atribuição múltipla: `x, y = y, x` troca os dois valores sem variável extra.',
      example: 'a, b = b, ...  # complete a troca',
    },
    solution: {
      code: 'def troca_fichas(a, b):\n    a, b = b, a\n    return [a, b]',
      explanation:
        'Em `a, b = b, a` o lado direito é calculado inteiro antes de atribuir, então a troca acontece sem perder valores.',
    },
  }),

  // ───────────────────────── operator ─────────────────────────
  mini({
    id: 'mini-operator-1',
    title: 'Sobra na Mesa',
    areaId: 'fundamentos',
    topic: 'basics',
    difficulty: 1,
    context: 'O Dealer reparte as fichas igualmente e guarda as que sobram.',
    objective: [
      'Escreva `resto_mesa(fichas, jogadores)`, que recebe dois inteiros positivos.',
      'Ela **devolve** quantas fichas sobram ao dividir igualmente entre os jogadores (o resto da divisão).',
      'Exemplo: `resto_mesa(10, 3)` devolve `1`.',
    ],
    concept: 'O operador `%` devolve o resto de uma divisão.',
    concepts: ['operator', 'return'],
    functionName: 'resto_mesa',
    params: 'fichas, jogadores',
    visible: [
      ['sobram 2', 'resto_mesa(17, 5)', 2],
      ['divisão exata', 'resto_mesa(20, 4)', 0],
      ['menos fichas que jogadores', 'resto_mesa(3, 7)', 3],
    ],
    hidden: [['grande', 'resto_mesa(100, 9)', 1]],
    ladder: {
      question: 'Quando a divisão é exata, quantas fichas sobram?',
      clue: 'Existe um operador aritmético só para o resto da divisão.',
      concept: 'O operador `%` (módulo) dá o resto: `7 % 2` vale `1`.',
      example: 'return fichas ...  # qual operador entre as duas?',
    },
    solution: {
      code: 'def resto_mesa(fichas, jogadores):\n    return fichas % jogadores',
      explanation: 'O operador `%` calcula o resto da divisão inteira entre os dois números.',
    },
  }),
  mini({
    id: 'mini-operator-2',
    title: 'Rateio do Pote',
    areaId: 'fundamentos',
    topic: 'basics',
    difficulty: 2,
    context: 'O pote da rodada é dividido entre os jogadores e a casa fica com a sobra.',
    objective: [
      'Escreva `divide_pote(total, jogadores)`, que recebe dois inteiros positivos.',
      'Ela **devolve** uma lista `[parte, sobra]`: `parte` é quanto cada jogador leva (divisão inteira) e `sobra` é o que resta.',
      'Exemplo: `divide_pote(10, 3)` devolve `[3, 1]`.',
    ],
    concept: 'Os operadores `//` (divisão inteira) e `%` (resto) andam juntos.',
    concepts: ['operator', 'list', 'return'],
    functionName: 'divide_pote',
    params: 'total, jogadores',
    visible: [
      ['com sobra', 'divide_pote(17, 5)', [3, 2]],
      ['exata', 'divide_pote(20, 4)', [5, 0]],
      ['pote pequeno', 'divide_pote(2, 9)', [0, 2]],
    ],
    hidden: [['grande', 'divide_pote(100, 7)', [14, 2]]],
    ladder: {
      question: 'Quantas vezes o número de jogadores cabe no pote, e o que sobra depois?',
      clue: 'São duas contas diferentes sobre os mesmos números.',
      concept: '`//` devolve o quociente inteiro e `%` devolve o resto.',
      example: 'return [total // jogadores, ...]  # e a sobra?',
    },
    solution: {
      code: 'def divide_pote(total, jogadores):\n    return [total // jogadores, total % jogadores]',
      explanation:
        '`//` dá a parte inteira de cada jogador e `%` dá o que sobrou; as duas ficam numa lista.',
    },
  }),

  // ───────────────────────── boolean ─────────────────────────
  mini({
    id: 'mini-boolean-1',
    title: 'Porta do Salão',
    areaId: 'logica',
    topic: 'logic',
    difficulty: 1,
    context: 'O segurança só abre a porta do salão para quem tem fichas suficientes ou é VIP.',
    objective: [
      'Escreva `entra_no_salao(fichas, vip)`, que recebe um inteiro e um booleano.',
      'Ela **devolve** `True` se `fichas` for pelo menos `100` **ou** `vip` for `True`; caso contrário, `False`.',
      'Exemplo: `entra_no_salao(50, True)` devolve `True`.',
    ],
    concept: 'Booleanos e o operador `or`.',
    concepts: ['boolean', 'operator'],
    functionName: 'entra_no_salao',
    params: 'fichas, vip',
    visible: [
      ['fichas de sobra', 'entra_no_salao(150, False)', true],
      ['quase lá', 'entra_no_salao(99, False)', false],
      ['limite exato', 'entra_no_salao(100, False)', true],
    ],
    hidden: [
      ['sem nada', 'entra_no_salao(0, False)', false],
      ['VIP pobre', 'entra_no_salao(80, True)', true],
    ],
    ladder: {
      question:
        'Quantas formas existem de a porta se abrir? Elas precisam valer juntas ou separadas?',
      clue: 'Compare as fichas com 100 e combine o resultado com `vip`.',
      concept: '`a or b` é verdadeiro se pelo menos um dos lados for verdadeiro.',
      example: 'return fichas >= 100 ...  # combine com vip',
    },
    solution: {
      code: 'def entra_no_salao(fichas, vip):\n    return fichas >= 100 or vip',
      explanation:
        'A comparação `fichas >= 100` já é um booleano; `or` devolve verdadeiro se ela ou `vip` for verdadeira.',
    },
  }),
  mini({
    id: 'mini-boolean-2',
    title: 'Mesa dos Maiores',
    areaId: 'logica',
    topic: 'logic',
    difficulty: 2,
    context: 'A mesa comum aceita adultos que não sejam VIP; os VIPs têm sala própria.',
    objective: [
      'Escreva `mesa_comum(idade, vip)`, que recebe um inteiro e um booleano.',
      'Ela **devolve** `True` somente se `idade` for pelo menos `18` **e** `vip` for `False`; caso contrário, `False`.',
      'Exemplo: `mesa_comum(20, False)` devolve `True`.',
    ],
    concept: 'Booleanos com `and` e `not`.',
    concepts: ['boolean', 'condition', 'operator'],
    functionName: 'mesa_comum',
    params: 'idade, vip',
    visible: [
      ['menor de idade', 'mesa_comum(17, False)', false],
      ['VIP adulto', 'mesa_comum(30, True)', false],
      ['18 exatos', 'mesa_comum(18, False)', true],
    ],
    hidden: [
      ['menor e VIP', 'mesa_comum(5, True)', false],
      ['idoso comum', 'mesa_comum(70, False)', true],
    ],
    ladder: {
      question: 'As duas condições precisam ser verdadeiras ao mesmo tempo?',
      clue: 'Uma delas é sobre `vip` ser falso: existe um operador que inverte um booleano.',
      concept: '`and` exige os dois lados verdadeiros; `not` inverte `True` e `False`.',
      example: 'return idade >= 18 and ...  # e o vip?',
    },
    solution: {
      code: 'def mesa_comum(idade, vip):\n    return idade >= 18 and not vip',
      explanation:
        '`not vip` vale `True` quando `vip` é `False`, e `and` exige as duas condições juntas.',
    },
  }),

  // ───────────────────────── condition ─────────────────────────
  mini({
    id: 'mini-condition-1',
    title: 'Peso da Aposta',
    areaId: 'logica',
    topic: 'logic',
    difficulty: 1,
    context: 'O Dealer anuncia em voz alta se a aposta é alta, média ou baixa.',
    objective: [
      'Escreva `classifica_aposta(valor)`, que recebe um inteiro.',
      'Ela **devolve** o texto `"alta"` se `valor >= 100`, `"media"` se `valor >= 20` (e menor que 100), ou `"baixa"` nos demais casos. Os textos são minúsculos e sem acento.',
      'Exemplo: `classifica_aposta(150)` devolve `"alta"`.',
    ],
    concept: 'Condições `if` / `elif` / `else` escolhem um caminho.',
    concepts: ['condition', 'operator'],
    functionName: 'classifica_aposta',
    params: 'valor',
    visible: [
      ['média', 'classifica_aposta(30)', 'media'],
      ['baixa', 'classifica_aposta(5)', 'baixa'],
      ['limite alto', 'classifica_aposta(100)', 'alta'],
    ],
    hidden: [
      ['limite médio', 'classifica_aposta(20)', 'media'],
      ['quase médio', 'classifica_aposta(19)', 'baixa'],
    ],
    ladder: {
      question: 'Qual faixa você deve testar primeiro para não classificar 150 como média?',
      clue: 'Teste da faixa mais alta para a mais baixa e deixe a última como padrão.',
      concept: '`if`, `elif` e `else` testam em ordem e executam só o primeiro bloco verdadeiro.',
      example: 'if valor >= 100:\n    return "alta"\nelif ...',
    },
    solution: {
      code: 'def classifica_aposta(valor):\n    if valor >= 100:\n        return "alta"\n    if valor >= 20:\n        return "media"\n    return "baixa"',
      explanation:
        'Cada `if` com `return` encerra a função; testando da faixa maior para a menor, só sobra "baixa" no final.',
    },
  }),
  mini({
    id: 'mini-condition-2',
    title: 'Vinte e Um',
    areaId: 'logica',
    topic: 'logic',
    difficulty: 2,
    context: 'Na mesa de vinte e um, o veredito depende só dos pontos da mão.',
    objective: [
      'Escreva `veredito(pontos)`, que recebe um inteiro.',
      'Ela **devolve** `"estourou"` se `pontos > 21`, `"blackjack"` se `pontos == 21` ou `"segue"` se for menos que 21. Os textos são minúsculos.',
      'Exemplo: `veredito(25)` devolve `"estourou"`.',
    ],
    concept: 'Condições encadeadas e a diferença entre `>` e `==`.',
    concepts: ['condition', 'boolean'],
    functionName: 'veredito',
    params: 'pontos',
    visible: [
      ['vinte e um', 'veredito(21)', 'blackjack'],
      ['mão baixa', 'veredito(12)', 'segue'],
      ['por um ponto', 'veredito(22)', 'estourou'],
    ],
    hidden: [
      ['mão vazia', 'veredito(0)', 'segue'],
      ['muito alto', 'veredito(30)', 'estourou'],
    ],
    ladder: {
      question: 'O que distingue 21 de 22 na regra? Qual comparação separa cada caso?',
      clue: 'Há três respostas possíveis, então precisa de pelo menos duas decisões.',
      concept:
        '`==` compara igualdade e `>` compara maior que; cada `if` pode terminar com `return`.',
      example: 'if pontos > 21:\n    return "estourou"\n...',
    },
    solution: {
      code: 'def veredito(pontos):\n    if pontos > 21:\n        return "estourou"\n    return "blackjack" if pontos == 21 else "segue"',
      explanation:
        'Primeiro tratamos o estouro; no resto, a expressão condicional escolhe entre "blackjack" e "segue".',
    },
  }),

  // ───────────────────────── for ─────────────────────────
  mini({
    id: 'mini-for-1',
    title: 'Soma da Noite',
    areaId: 'loops',
    topic: 'loops',
    difficulty: 1,
    context: 'O caixa soma todas as apostas feitas ao longo da noite.',
    objective: [
      'Escreva `soma_apostas(apostas)`, que recebe uma lista de números.',
      'Ela **devolve** a soma de todos os valores da lista, usando um laço `for`. Lista vazia devolve `0`.',
      'Exemplo: `soma_apostas([1, 2, 3])` devolve `6`.',
    ],
    concept: 'O laço `for` percorre uma lista; um acumulador guarda o total.',
    concepts: ['for', 'list', 'variable'],
    functionName: 'soma_apostas',
    params: 'apostas',
    visible: [
      ['duas apostas', 'soma_apostas([10, 20])', 30],
      ['lista vazia', 'soma_apostas([])', 0],
      ['uma aposta', 'soma_apostas([5])', 5],
    ],
    hidden: [['repetidas', 'soma_apostas([7, 7, 7, 1])', 22]],
    ladder: {
      question: 'Que valor inicial o total deve ter antes de olhar a primeira aposta?',
      clue: 'Crie uma variável com o total e some cada item dentro do laço.',
      concept: '`for x in lista:` repete o bloco uma vez para cada item. `total += x` acumula.',
      example: 'total = 0\nfor a in apostas:\n    total += ...',
    },
    solution: {
      code: 'def soma_apostas(apostas):\n    total = 0\n    for a in apostas:\n        total += a\n    return total',
      explanation:
        'O acumulador começa em zero e cada volta do `for` soma uma aposta; no fim devolvemos o total.',
    },
  }),
  mini({
    id: 'mini-for-2',
    title: 'Placar Acima da Linha',
    areaId: 'loops',
    topic: 'loops',
    difficulty: 2,
    context: 'O telão mostra quantos jogadores passaram da pontuação mínima da mesa.',
    objective: [
      'Escreva `conta_maiores(pontos, limite)`, que recebe uma lista de números e um número.',
      'Ela **devolve** quantos valores da lista são **estritamente maiores** que `limite` (iguais não contam).',
      'Exemplo: `conta_maiores([1, 5, 9], 4)` devolve `2`.',
    ],
    concept: 'Um `for` com `if` dentro conta apenas os itens que atendem a uma condição.',
    concepts: ['for', 'condition', 'list'],
    functionName: 'conta_maiores',
    params: 'pontos, limite',
    visible: [
      ['dois acima', 'conta_maiores([10, 20, 30], 15)', 2],
      ['nenhum', 'conta_maiores([1, 2], 5)', 0],
      ['todos iguais', 'conta_maiores([5, 5, 5], 5)', 0],
    ],
    hidden: [
      ['três acima', 'conta_maiores([9, 9, 1, 10], 8)', 3],
      ['lista vazia', 'conta_maiores([], 1)', 0],
    ],
    ladder: {
      question: 'Para cada item, qual pergunta de sim ou não decide se ele conta?',
      clue: 'Use um contador que só aumenta quando a condição é verdadeira.',
      concept: 'Um `if` dentro do `for` filtra os itens; `>` exclui os iguais ao limite.',
      example: 'for p in pontos:\n    if p > limite:\n        ...',
    },
    solution: {
      code: 'def conta_maiores(pontos, limite):\n    quantos = 0\n    for p in pontos:\n        if p > limite:\n            quantos += 1\n    return quantos',
      explanation:
        'O contador só sobe quando o item é maior que o limite, e a comparação `>` deixa os iguais de fora.',
    },
  }),

  // ───────────────────────── while ─────────────────────────
  mini({
    id: 'mini-while-1',
    title: 'Até Zerar o Saldo',
    areaId: 'loops',
    topic: 'loops',
    difficulty: 1,
    context: 'Um apostador repete a mesma aposta até o saldo não cobrir mais uma rodada.',
    objective: [
      'Escreva `quantas_rodadas(saldo, aposta)`, que recebe dois inteiros positivos.',
      'Ela **devolve** quantas apostas completas cabem no saldo: enquanto `saldo >= aposta`, desconte a aposta e conte uma rodada.',
      'Exemplo: `quantas_rodadas(10, 3)` devolve `3`.',
    ],
    concept:
      '`while` repete enquanto a condição for verdadeira; o contador garante que ele termina.',
    concepts: ['while', 'variable', 'operator'],
    functionName: 'quantas_rodadas',
    params: 'saldo, aposta',
    visible: [
      ['quatro rodadas', 'quantas_rodadas(100, 25)', 4],
      ['saldo curto', 'quantas_rodadas(5, 10)', 0],
      ['uma só', 'quantas_rodadas(20, 20)', 1],
    ],
    hidden: [['sete rodadas', 'quantas_rodadas(50, 7)', 7]],
    ladder: {
      question: 'O que muda a cada volta para que o laço um dia pare?',
      clue: 'Diminua o saldo e aumente um contador dentro do laço.',
      concept:
        '`while condição:` repete o bloco; atualize as variáveis da condição para não travar.',
      example: 'rodadas = 0\nwhile saldo >= aposta:\n    ...',
    },
    solution: {
      code: 'def quantas_rodadas(saldo, aposta):\n    rodadas = 0\n    while saldo >= aposta:\n        saldo -= aposta\n        rodadas += 1\n    return rodadas',
      explanation:
        'Cada volta tira uma aposta do saldo e conta uma rodada; quando o saldo não cobre mais, a condição falha e o laço termina.',
    },
  }),
  mini({
    id: 'mini-while-2',
    title: 'Contador de Dígitos',
    areaId: 'loops',
    topic: 'loops',
    difficulty: 2,
    context: 'O display da roleta precisa saber quantos dígitos tem o prêmio acumulado.',
    objective: [
      'Escreva `conta_digitos(n)`, que recebe um inteiro `n >= 1`.',
      'Ela **devolve** quantos dígitos `n` tem, usando um `while` que divide `n` por `10` (divisão inteira) até zerar.',
      'Exemplo: `conta_digitos(123)` devolve `3`.',
    ],
    concept: 'Um `while` com divisão inteira consome o número dígito a dígito.',
    concepts: ['while', 'operator'],
    functionName: 'conta_digitos',
    params: 'n',
    visible: [
      ['um dígito', 'conta_digitos(7)', 1],
      ['mil', 'conta_digitos(1000)', 4],
      ['cinco dígitos', 'conta_digitos(98765)', 5],
    ],
    hidden: [
      ['dez', 'conta_digitos(10)', 2],
      ['nove', 'conta_digitos(9)', 1],
    ],
    ladder: {
      question:
        'O que acontece com um número se você dividi-lo por 10 e ficar só com a parte inteira?',
      clue: 'Cada divisão remove um dígito; conte quantas divisões até chegar a zero.',
      concept: '`n //= 10` remove o último dígito; o laço para quando `n` chega a `0`.',
      example: 'while n > 0:\n    n //= 10\n    ...',
    },
    solution: {
      code: 'def conta_digitos(n):\n    total = 0\n    while n > 0:\n        n //= 10\n        total += 1\n    return total',
      explanation:
        'Cada volta descarta o último dígito com `//= 10` e soma um ao contador, até `n` chegar a zero.',
    },
  }),

  // ───────────────────────── list ─────────────────────────
  mini({
    id: 'mini-list-1',
    title: 'Miolo da Fila',
    areaId: 'estruturas',
    topic: 'data',
    difficulty: 1,
    context: 'A fila da roleta perde o primeiro e o último jogador para a foto oficial.',
    objective: [
      'Escreva `miolo(fila)`, que recebe uma lista.',
      'Ela **devolve** uma nova lista sem o primeiro e sem o último elemento. Listas com 2 ou menos itens devolvem `[]`.',
      'Exemplo: `miolo([1, 2, 3, 4])` devolve `[2, 3]`.',
    ],
    concept: 'Fatiamento (`lista[a:b]`) e índices negativos em listas.',
    concepts: ['list', 'return'],
    functionName: 'miolo',
    params: 'fila',
    visible: [
      ['três itens', 'miolo([5, 6, 7])', [6]],
      ['dois itens', 'miolo([9, 8])', []],
      ['seis itens', 'miolo([1, 2, 3, 4, 5, 6])', [2, 3, 4, 5]],
    ],
    hidden: [
      ['um item', 'miolo([4])', []],
      ['textos', 'miolo(["a", "b", "c"])', ['b']],
    ],
    ladder: {
      question: 'Em que posição começa o miolo e onde ele termina?',
      clue: 'O índice `-1` aponta para o último elemento; fatias não incluem o fim.',
      concept: '`lista[1:-1]` pega do índice 1 até antes do último.',
      example: 'return fila[1:...]  # até onde?',
    },
    solution: {
      code: 'def miolo(fila):\n    return fila[1:-1]',
      explanation:
        'A fatia `[1:-1]` começa no segundo item e para antes do último; em listas curtas ela simplesmente fica vazia.',
    },
  }),
  mini({
    id: 'mini-list-2',
    title: 'Pódio do Torneio',
    areaId: 'estruturas',
    topic: 'data',
    difficulty: 2,
    context: 'O telão do torneio mostra as três maiores pontuações da noite.',
    objective: [
      'Escreva `podio(pontos)`, que recebe uma lista de inteiros.',
      'Ela **devolve** uma lista com as 3 maiores pontuações em ordem decrescente (repetidas contam). Se houver menos de 3, devolve todas.',
      'Exemplo: `podio([5, 1, 9, 7])` devolve `[9, 7, 5]`.',
    ],
    concept: 'Ordenar listas com `sorted` e cortar com fatias.',
    concepts: ['list', 'function'],
    functionName: 'podio',
    params: 'pontos',
    visible: [
      ['quatro valores', 'podio([10, 30, 20, 40])', [40, 30, 20]],
      ['só dois', 'podio([3, 1])', [3, 1]],
      ['repetidos', 'podio([2, 2, 8, 8, 1])', [8, 8, 2]],
    ],
    hidden: [
      ['vazia', 'podio([])', []],
      ['já ordenada', 'podio([1, 2, 3, 4, 5])', [5, 4, 3]],
    ],
    ladder: {
      question:
        'Se a lista estivesse em ordem do maior para o menor, como você pegaria só os três primeiros?',
      clue: 'Ordene de trás para frente e corte o começo da lista.',
      concept:
        '`sorted(lista, reverse=True)` devolve uma lista nova ordenada; `[:3]` pega até 3 itens.',
      example: 'return sorted(pontos, ...)[:3]',
    },
    solution: {
      code: 'def podio(pontos):\n    return sorted(pontos, reverse=True)[:3]',
      explanation:
        '`sorted(..., reverse=True)` ordena do maior para o menor e `[:3]` guarda no máximo os três primeiros.',
    },
  }),

  // ───────────────────────── dictionary ─────────────────────────
  mini({
    id: 'mini-dictionary-1',
    title: 'Saldo no Livro-Caixa',
    areaId: 'estruturas',
    topic: 'data',
    difficulty: 1,
    context: 'O livro-caixa guarda o saldo de cada jogador pelo nome.',
    objective: [
      'Escreva `saldo_de(contas, nome)`, que recebe um dicionário `{nome: saldo}` e um texto.',
      'Ela **devolve** o saldo de `nome`, ou `0` se o nome não estiver no dicionário.',
      'Exemplo: `saldo_de({"Ana": 50}, "Ana")` devolve `50`.',
    ],
    concept: 'Dicionários guardam pares chave-valor; `.get` aceita um valor padrão.',
    concepts: ['dictionary', 'return'],
    functionName: 'saldo_de',
    params: 'contas, nome',
    visible: [
      ['Rui', 'saldo_de({"Bia": 10, "Rui": 20}, "Rui")', 20],
      ['desconhecido', 'saldo_de({"Bia": 10}, "Zé")', 0],
      ['livro vazio', 'saldo_de({}, "Lu")', 0],
    ],
    hidden: [['Ed', 'saldo_de({"Lu": 0, "Ed": 7}, "Ed")', 7]],
    ladder: {
      question: 'O que acontece se você pedir uma chave que não existe no dicionário?',
      clue: 'Há um método que busca a chave e aceita um valor para quando ela não existir.',
      concept: '`d.get(chave, padrao)` devolve `d[chave]` se existir, ou `padrao`.',
      example: 'return contas.get(nome, ...)',
    },
    solution: {
      code: 'def saldo_de(contas, nome):\n    return contas.get(nome, 0)',
      explanation:
        '`.get(nome, 0)` busca a chave sem dar erro e devolve `0` quando ela não existe.',
    },
  }),
  mini({
    id: 'mini-dictionary-2',
    title: 'Contagem de Fichas',
    areaId: 'estruturas',
    topic: 'data',
    difficulty: 2,
    context: 'O Dealer conta quantas fichas de cada cor há na bandeja.',
    objective: [
      'Escreva `conta_fichas(cores)`, que recebe uma lista de textos.',
      'Ela **devolve** um dicionário que associa cada cor à quantidade de vezes que aparece. Lista vazia devolve `{}`.',
      'Exemplo: `conta_fichas(["a", "b", "a"])` devolve `{"a": 2, "b": 1}`.',
    ],
    concept: 'Dicionários como contadores: `d[chave] = d.get(chave, 0) + 1`.',
    concepts: ['dictionary', 'for', 'list'],
    functionName: 'conta_fichas',
    params: 'cores',
    visible: [
      ['uma cor', 'conta_fichas(["verde", "verde"])', { verde: 2 }],
      ['vazia', 'conta_fichas([])', {}],
      ['três cores', 'conta_fichas(["x", "y", "z", "x", "x"])', { x: 3, y: 1, z: 1 }],
    ],
    hidden: [
      ['mistura', 'conta_fichas(["azul", "preta", "azul", "preta"])', { azul: 2, preta: 2 }],
    ],
    ladder: {
      question:
        'Ao ver uma cor pela primeira vez, qual deve ser a contagem dela depois de contá-la?',
      clue: 'Crie um dicionário vazio e, para cada cor, some 1 ao valor atual (ou a zero, se ainda não houver).',
      concept: '`d.get(chave, 0) + 1` lê a contagem atual com padrão zero.',
      example: 'for cor in cores:\n    contagem[cor] = contagem.get(cor, 0) + ...',
    },
    solution: {
      code: 'def conta_fichas(cores):\n    contagem = {}\n    for cor in cores:\n        contagem[cor] = contagem.get(cor, 0) + 1\n    return contagem',
      explanation:
        'Para cada cor lemos a contagem atual (zero se ainda não existe), somamos um e guardamos de volta.',
    },
  }),

  // ───────────────────────── set ─────────────────────────
  mini({
    id: 'mini-set-1',
    title: 'Cartas Diferentes',
    areaId: 'estruturas',
    topic: 'data',
    difficulty: 1,
    context: 'O Dealer confere quantas cartas diferentes saíram do baralho.',
    objective: [
      'Escreva `cartas_distintas(cartas)`, que recebe uma lista de valores.',
      'Ela **devolve** quantos valores diferentes existem na lista (repetidos contam uma vez só). Lista vazia devolve `0`.',
      'Exemplo: `cartas_distintas(["A", "A", "K"])` devolve `2`.',
    ],
    concept: 'Conjuntos (`set`) guardam apenas valores únicos.',
    concepts: ['set', 'list'],
    functionName: 'cartas_distintas',
    params: 'cartas',
    visible: [
      ['repetidas', 'cartas_distintas(["Q", "J", "Q", "Q"])', 2],
      ['vazia', 'cartas_distintas([])', 0],
      ['todas diferentes', 'cartas_distintas([1, 2, 3])', 3],
    ],
    hidden: [['todas iguais', 'cartas_distintas([7, 7, 7, 7])', 1]],
    ladder: {
      question:
        'Se você jogasse as cartas num saco onde cada tipo cabe uma única vez, o que contaria?',
      clue: 'Existe uma estrutura do Python que descarta repetidos sozinha.',
      concept: '`set(lista)` remove duplicatas; `len` conta os elementos.',
      example: 'return len(set(...))',
    },
    solution: {
      code: 'def cartas_distintas(cartas):\n    return len(set(cartas))',
      explanation: 'O `set` mantém só uma cópia de cada valor e `len` conta quantos restaram.',
    },
  }),
  mini({
    id: 'mini-set-2',
    title: 'Fichas em Comum',
    areaId: 'estruturas',
    topic: 'data',
    difficulty: 2,
    context: 'Duas mesas comparam que fichas as duas têm em comum.',
    objective: [
      'Escreva `em_comum(a, b)`, que recebe duas listas.',
      'Ela **devolve** uma lista **ordenada** (crescente) com os valores presentes nas duas listas, sem repetições. Se não houver nenhum, devolve `[]`.',
      'Exemplo: `em_comum([1, 2, 3], [2, 3, 4])` devolve `[2, 3]`.',
    ],
    concept: 'Interseção de conjuntos com `&` e conversão de volta para lista ordenada.',
    concepts: ['set', 'list', 'function'],
    functionName: 'em_comum',
    params: 'a, b',
    visible: [
      ['um em comum', 'em_comum([5, 1, 5], [5, 9])', [5]],
      ['nenhum', 'em_comum([1], [2])', []],
      ['textos', 'em_comum(["b", "a"], ["a", "b", "c"])', ['a', 'b']],
    ],
    hidden: [['repetidos', 'em_comum([3, 3, 2, 2], [2, 3, 3])', [2, 3]]],
    ladder: {
      question: 'Que operação entre dois grupos devolve só o que está nos dois?',
      clue: 'Converta as listas em conjuntos, intersecte e depois ordene o resultado.',
      concept: '`set(a) & set(b)` é a interseção; `sorted(...)` devolve uma lista ordenada.',
      example: 'return sorted(set(a) ... set(b))',
    },
    solution: {
      code: 'def em_comum(a, b):\n    return sorted(set(a) & set(b))',
      explanation:
        'A interseção `&` guarda só o que está nos dois conjuntos e `sorted` transforma o resultado numa lista ordenada.',
    },
  }),

  // ───────────────────────── function ─────────────────────────
  mini({
    id: 'mini-function-1',
    title: 'Aposta em Dobro',
    areaId: 'funcoes',
    topic: 'functions',
    difficulty: 1,
    context: 'A casa oferece uma rodada em que toda aposta vale o dobro.',
    objective: [
      'Escreva a função `dobra_aposta(valor)`, que recebe um número.',
      'Ela **devolve** o dobro de `valor`. Funciona também com zero e números negativos.',
      'Exemplo: `dobra_aposta(4)` devolve `8`.',
    ],
    concept: 'Funções empacotam um cálculo reutilizável com `def`.',
    concepts: ['function', 'parameter', 'return'],
    functionName: 'dobra_aposta',
    params: 'valor',
    visible: [
      ['sete', 'dobra_aposta(7)', 14],
      ['zero', 'dobra_aposta(0)', 0],
      ['negativo', 'dobra_aposta(-3)', -6],
    ],
    hidden: [['cinquenta', 'dobra_aposta(50)', 100]],
    ladder: {
      question: 'Qual conta transforma o valor de entrada no valor de saída?',
      clue: 'A função recebe um valor e precisa devolver (não imprimir) o resultado.',
      concept: '`def nome(param):` define a função e `return` entrega o resultado.',
      example: 'return valor ...  # qual operador?',
    },
    solution: {
      code: 'def dobra_aposta(valor):\n    return valor * 2',
      explanation:
        'A função recebe `valor`, multiplica por dois e devolve o resultado com `return`.',
    },
  }),
  mini({
    id: 'mini-function-2',
    title: 'Maior da Rodada',
    areaId: 'funcoes',
    topic: 'functions',
    difficulty: 2,
    context: 'Três jogadores mostram suas cartas e a maior vence a rodada.',
    objective: [
      'Escreva a função `maior_de_tres(a, b, c)`, que recebe três números.',
      'Ela **devolve** o maior dos três. Em caso de empate, devolve o valor empatado.',
      'Exemplo: `maior_de_tres(2, 8, 5)` devolve `8`.',
    ],
    concept: 'Funções com vários parâmetros podem usar funções prontas como `max`.',
    concepts: ['function', 'parameter', 'return'],
    functionName: 'maior_de_tres',
    params: 'a, b, c',
    visible: [
      ['no meio', 'maior_de_tres(1, 9, 4)', 9],
      ['negativos', 'maior_de_tres(-1, -5, -3)', -1],
      ['empate', 'maior_de_tres(7, 7, 2)', 7],
    ],
    hidden: [
      ['zeros', 'maior_de_tres(0, 0, 0)', 0],
      ['no fim', 'maior_de_tres(3, 4, 10)', 10],
    ],
    ladder: {
      question: 'Como você compararia três valores usando só comparações de dois em dois?',
      clue: 'Python já tem uma função pronta que escolhe o maior de vários valores.',
      concept: '`max(a, b, c)` devolve o maior dos argumentos.',
      example: 'return max(...)',
    },
    solution: {
      code: 'def maior_de_tres(a, b, c):\n    return max(a, b, c)',
      explanation: 'A função embutida `max` já compara os três valores e devolve o maior.',
    },
  }),

  // ───────────────────────── parameter ─────────────────────────
  mini({
    id: 'mini-parameter-1',
    title: 'Título Padrão',
    areaId: 'funcoes',
    topic: 'functions',
    difficulty: 1,
    context: 'O Dealer chama cada jogador pelo título; se não houver, usa "Jogador".',
    objective: [
      'Escreva `cumprimenta(nome, titulo)`, em que `titulo` é **opcional** e vale `"Jogador"` quando não for passado.',
      'Ela **devolve** o texto `titulo` + um espaço + `nome`.',
      'Exemplo: `cumprimenta("Ana")` devolve `"Jogador Ana"`.',
    ],
    concept: 'Parâmetros com valor padrão tornam argumentos opcionais.',
    concepts: ['parameter', 'function'],
    functionName: 'cumprimenta',
    params: 'nome, titulo',
    visible: [
      ['sem título', 'cumprimenta("Rui")', 'Jogador Rui'],
      ['com título', 'cumprimenta("Bia", "Dama")', 'Dama Bia'],
      ['outro título', 'cumprimenta("Edu", "Mestre")', 'Mestre Edu'],
    ],
    hidden: [['acento', 'cumprimenta("Zé")', 'Jogador Zé']],
    ladder: {
      question: 'O que a função deve usar quando quem chama não informa o título?',
      clue: 'Na lista de parâmetros, você pode já definir um valor com `=`.',
      concept: '`def f(x, y="padrão"):` torna `y` opcional.',
      example: 'def cumprimenta(nome, titulo=...):',
    },
    solution: {
      code: 'def cumprimenta(nome, titulo="Jogador"):\n    return f"{titulo} {nome}"',
      explanation:
        'O valor padrão `"Jogador"` é usado quando o segundo argumento não é passado; senão, vale o que veio.',
    },
  }),
  mini({
    id: 'mini-parameter-2',
    title: 'Aposta com Bônus',
    areaId: 'funcoes',
    topic: 'functions',
    difficulty: 3,
    context: 'A casa calcula a aposta final com multiplicador e bônus opcionais.',
    objective: [
      'Escreva `aposta_total(base, vezes, bonus)`, em que `vezes` vale `1` e `bonus` vale `0` por padrão.',
      'Ela **devolve** `base * vezes + bonus`. Os argumentos opcionais podem vir por nome, como `aposta_total(5, bonus=3)`.',
      'Exemplo: `aposta_total(10, 2)` devolve `20`.',
    ],
    concept: 'Parâmetros padrão e argumentos nomeados (keyword arguments).',
    concepts: ['parameter', 'function', 'operator'],
    functionName: 'aposta_total',
    params: 'base, vezes, bonus',
    visible: [
      ['só base', 'aposta_total(5)', 5],
      ['com bônus', 'aposta_total(5, bonus=3)', 8],
      ['tudo nomeado', 'aposta_total(4, vezes=3, bonus=1)', 13],
    ],
    hidden: [
      ['posicional', 'aposta_total(2, 5)', 10],
      ['base zero', 'aposta_total(0, bonus=9)', 9],
    ],
    ladder: {
      question:
        'Que valor `vezes` e `bonus` devem ter para não mudar o resultado quando não forem passados?',
      clue: 'O elemento neutro da multiplicação é 1 e o da soma é 0.',
      concept: 'Parâmetros com padrão: `def f(a, b=1, c=0):`. Quem chama pode usar `c=3`.',
      example: 'def aposta_total(base, vezes=1, ...):',
    },
    solution: {
      code: 'def aposta_total(base, vezes=1, bonus=0):\n    return base * vezes + bonus',
      explanation:
        'Os padrões 1 e 0 são neutros, então `aposta_total(5)` devolve 5; argumentos nomeados escolhem qual padrão trocar.',
    },
  }),

  // ───────────────────────── return ─────────────────────────
  mini({
    id: 'mini-return-1',
    title: 'Menor e Maior',
    areaId: 'funcoes',
    topic: 'functions',
    difficulty: 1,
    context: 'O fiscal anota a menor e a maior aposta da noite.',
    objective: [
      'Escreva `faixa_apostas(apostas)`, que recebe uma lista não vazia de números.',
      'Ela **devolve** uma lista com dois valores: `[menor, maior]`.',
      'Exemplo: `faixa_apostas([3, 1, 2])` devolve `[1, 3]`.',
    ],
    concept:
      '`return` entrega o resultado a quem chamou; ele pode ser uma lista com vários valores.',
    concepts: ['return', 'list'],
    functionName: 'faixa_apostas',
    params: 'apostas',
    visible: [
      ['uma aposta', 'faixa_apostas([5])', [5, 5]],
      ['com negativo', 'faixa_apostas([9, -2, 4])', [-2, 9]],
      ['repetidas', 'faixa_apostas([7, 7, 8])', [7, 8]],
    ],
    hidden: [['zeros', 'faixa_apostas([0, 0])', [0, 0]]],
    ladder: {
      question: 'Quais são os dois valores que a função precisa entregar e em que ordem?',
      clue: 'Existem funções prontas para o menor e para o maior valor de uma lista.',
      concept:
        '`min(lista)` e `max(lista)` encontram os extremos; `return [x, y]` devolve os dois.',
      example: 'return [min(apostas), ...]',
    },
    solution: {
      code: 'def faixa_apostas(apostas):\n    return [min(apostas), max(apostas)]',
      explanation:
        'Calculamos o menor e o maior com `min` e `max` e devolvemos os dois numa lista.',
    },
  }),
  mini({
    id: 'mini-return-2',
    title: 'Primeira Perda',
    areaId: 'funcoes',
    topic: 'functions',
    difficulty: 2,
    context: 'O auditor procura a primeira rodada em que o jogador perdeu fichas.',
    objective: [
      'Escreva `primeira_perda(saldos)`, que recebe uma lista de inteiros (variações de saldo por rodada).',
      'Ela **devolve** o primeiro valor negativo da lista, parando assim que o encontra. Se não houver nenhum, devolve `None`.',
      'Exemplo: `primeira_perda([3, -1, -5])` devolve `-1`.',
    ],
    concept:
      '`return` dentro de um laço encerra a função na hora; sem `return`, ela devolve `None`.',
    concepts: ['return', 'for', 'condition'],
    functionName: 'primeira_perda',
    params: 'saldos',
    visible: [
      ['no meio', 'primeira_perda([4, -2, 6])', -2],
      ['sem perdas', 'primeira_perda([1, 2, 3])', null],
      ['lista vazia', 'primeira_perda([])', null],
    ],
    hidden: [
      ['só uma', 'primeira_perda([-7])', -7],
      ['zeros antes', 'primeira_perda([0, 0, -1, -2])', -1],
    ],
    ladder: {
      question: 'Assim que achar o primeiro valor negativo, ainda precisa olhar o resto da lista?',
      clue: 'Devolva de dentro do laço; só depois dele trate o caso "não achei".',
      concept: 'Um `return` dentro do `for` sai da função imediatamente; ao fim, `return None`.',
      example: 'for s in saldos:\n    if s < 0:\n        return ...',
    },
    solution: {
      code: 'def primeira_perda(saldos):\n    for s in saldos:\n        if s < 0:\n            return s\n    return None',
      explanation:
        'O `return` dentro do `if` encerra a função no primeiro negativo; se o laço acabar, devolvemos `None`.',
    },
  }),

  // ───────────────────────── recursion ─────────────────────────
  mini({
    id: 'mini-recursion-1',
    title: 'Pirâmide de Fichas',
    areaId: 'funcoes',
    topic: 'algorithms',
    difficulty: 1,
    context:
      'Uma pirâmide de fichas tem 1 ficha no topo, 2 na fileira seguinte, e assim por diante.',
    objective: [
      'Escreva `soma_ate(n)`, que recebe um inteiro `n >= 0` e é **recursiva** (chama a si mesma).',
      'Ela **devolve** a soma `1 + 2 + ... + n`. Para `n = 0`, devolve `0`.',
      'Exemplo: `soma_ate(4)` devolve `10`.',
    ],
    concept: 'Recursão: caso base + chamada com um problema menor.',
    concepts: ['recursion', 'function', 'return'],
    functionName: 'soma_ate',
    params: 'n',
    visible: [
      ['um', 'soma_ate(1)', 1],
      ['dez', 'soma_ate(10)', 55],
      ['zero', 'soma_ate(0)', 0],
    ],
    hidden: [['cem', 'soma_ate(100)', 5050]],
    ladder: {
      question: 'Quando n vale 0, qual é a resposta sem precisar de conta nenhuma?',
      clue: 'A soma até n é n mais a soma até um número menor.',
      concept: 'Toda recursão tem um caso base (para) e um caso recursivo (chama a si mesma).',
      example: 'if n == 0:\n    return 0\nreturn n + soma_ate(...)',
    },
    solution: {
      code: 'def soma_ate(n):\n    if n == 0:\n        return 0\n    return n + soma_ate(n - 1)',
      explanation:
        'O caso base `n == 0` devolve 0; senão somamos `n` ao resultado do mesmo problema com `n - 1`.',
    },
  }),
  mini({
    id: 'mini-recursion-2',
    title: 'Soma dos Dígitos',
    areaId: 'funcoes',
    topic: 'algorithms',
    difficulty: 2,
    context: 'O número da sorte do dia é a soma dos dígitos do bilhete.',
    objective: [
      'Escreva `soma_digitos(n)`, que recebe um inteiro `n >= 0` e é **recursiva**.',
      'Ela **devolve** a soma dos dígitos de `n`. Para um número de um dígito, devolve ele mesmo.',
      'Exemplo: `soma_digitos(123)` devolve `6`.',
    ],
    concept: 'Recursão sobre números: `n % 10` é o último dígito e `n // 10` é o resto.',
    concepts: ['recursion', 'operator', 'function'],
    functionName: 'soma_digitos',
    params: 'n',
    visible: [
      ['um dígito', 'soma_digitos(7)', 7],
      ['mil', 'soma_digitos(1000)', 1],
      ['quatro dígitos', 'soma_digitos(9875)', 29],
    ],
    hidden: [
      ['zero', 'soma_digitos(0)', 0],
      ['noventa e nove', 'soma_digitos(99)', 18],
    ],
    ladder: {
      question:
        'Quando o número tem um dígito só, qual é a soma? E como "encolher" um número maior?',
      clue: 'Separe o último dígito do resto do número e some com a chamada recursiva.',
      concept: '`n % 10` dá o último dígito; `n // 10` descarta ele.',
      example: 'if n < 10:\n    return n\nreturn n % 10 + soma_digitos(...)',
    },
    solution: {
      code: 'def soma_digitos(n):\n    if n < 10:\n        return n\n    return n % 10 + soma_digitos(n // 10)',
      explanation:
        'Com um dígito só, devolvemos `n`; senão somamos o último dígito ao resultado do número sem ele.',
    },
  }),

  // ───────────────────────── search ─────────────────────────
  mini({
    id: 'mini-search-1',
    title: 'Onde Está a Ficha?',
    areaId: 'funcoes',
    topic: 'algorithms',
    difficulty: 1,
    context: 'O Dealer procura em que posição da bandeja está uma ficha específica.',
    objective: [
      'Escreva `posicao_da_ficha(lista, alvo)`, que recebe uma lista e um valor.',
      'Ela **devolve** o índice (começando em 0) da **primeira** ocorrência de `alvo`, ou `-1` se ele não estiver na lista.',
      'Exemplo: `posicao_da_ficha([5, 6, 7], 6)` devolve `1`.',
    ],
    concept: 'Busca linear: olhar item por item até achar.',
    concepts: ['search', 'for', 'list'],
    functionName: 'posicao_da_ficha',
    params: 'lista, alvo',
    visible: [
      ['no fim', 'posicao_da_ficha([1, 2, 3], 3)', 2],
      ['repetido', 'posicao_da_ficha([4, 4, 4], 4)', 0],
      ['ausente', 'posicao_da_ficha([1, 2], 9)', -1],
    ],
    hidden: [
      ['lista vazia', 'posicao_da_ficha([], 1)', -1],
      ['textos', 'posicao_da_ficha(["a", "b", "c"], "b")', 1],
    ],
    ladder: {
      question: 'Se você olhar um item de cada vez, quando pode parar de procurar?',
      clue: 'Você precisa do índice de cada item, não só do valor.',
      concept:
        '`enumerate(lista)` entrega pares (índice, valor); `return` dentro do laço encerra a busca.',
      example: 'for i, v in enumerate(lista):\n    if v == alvo:\n        ...',
    },
    solution: {
      code: 'def posicao_da_ficha(lista, alvo):\n    for i, v in enumerate(lista):\n        if v == alvo:\n            return i\n    return -1',
      explanation:
        'Percorremos a lista com índice e devolvemos o primeiro que bate; se o laço acabar sem achar, devolvemos -1.',
    },
  }),
  mini({
    id: 'mini-search-2',
    title: 'Quantas Cartas Até Achar',
    areaId: 'funcoes',
    topic: 'algorithms',
    difficulty: 2,
    context: 'O Dealer vira cartas uma a uma até aparecer a que o jogador pediu.',
    objective: [
      'Escreva `cartas_viradas(lista, alvo)`, que recebe uma lista e um valor.',
      'Ela **devolve** quantas cartas foram viradas até achar `alvo` (contando a própria carta). Se `alvo` não existir, devolve o tamanho da lista.',
      'Exemplo: `cartas_viradas([4, 7, 9], 7)` devolve `2`.',
    ],
    concept: 'Busca linear que conta os passos até parar.',
    concepts: ['search', 'for', 'return'],
    functionName: 'cartas_viradas',
    params: 'lista, alvo',
    visible: [
      ['primeira', 'cartas_viradas([1, 2, 3], 1)', 1],
      ['ausente', 'cartas_viradas([5, 5, 5], 9)', 3],
      ['última', 'cartas_viradas([8, 6, 4, 2], 2)', 4],
    ],
    hidden: [
      ['lista vazia', 'cartas_viradas([], 3)', 0],
      ['repetida', 'cartas_viradas([3, 3], 3)', 1],
    ],
    ladder: {
      question:
        'Qual a relação entre a posição (começando em 0) de um item e quantas cartas foram viradas?',
      clue: 'A contagem começa em 1, e a lista toda é o resultado se nada for achado.',
      concept: '`enumerate(lista, 1)` numera a partir de 1; `len(lista)` é o tamanho.',
      example: 'for n, v in enumerate(lista, 1):\n    ...',
    },
    solution: {
      code: 'def cartas_viradas(lista, alvo):\n    for n, v in enumerate(lista, 1):\n        if v == alvo:\n            return n\n    return len(lista)',
      explanation:
        'Numeramos as cartas a partir de 1 e devolvemos o número da primeira que bate; sem achar, devolvemos o tamanho total.',
    },
  }),

  // ───────────────────────── unit-test ─────────────────────────
  mini({
    id: 'mini-unit-test-1',
    title: 'Confere o Resultado',
    areaId: 'engenharia',
    topic: 'debug',
    difficulty: 1,
    context: 'O auditor do DEVBet confere se o resultado de cada mesa é o esperado.',
    objective: [
      'Escreva `confere(resultado, esperado)`, uma verificação no estilo de um teste unitário.',
      'Ela **devolve** `True` se `resultado` for igual a `esperado` e `False` caso contrário. Vale para números, textos e listas.',
      'Exemplo: `confere(4, 4)` devolve `True`.',
    ],
    concept: 'Um teste compara o resultado obtido com o esperado e responde sim ou não.',
    concepts: ['unit-test', 'boolean'],
    functionName: 'confere',
    params: 'resultado, esperado',
    visible: [
      ['diferentes', 'confere(3, 4)', false],
      ['textos iguais', 'confere("a", "a")', true],
      ['listas iguais', 'confere([1, 2], [1, 2])', true],
    ],
    hidden: [
      ['tipos diferentes', 'confere("1", 1)', false],
      ['listas diferentes', 'confere([1, 2], [2, 1])', false],
    ],
    ladder: {
      question: 'O que um teste precisa comparar para dizer se o código está certo?',
      clue: 'A resposta é só sim ou não, isto é, um booleano.',
      concept: 'A comparação `==` já devolve `True` ou `False`.',
      example: 'return resultado ...  # compare com o esperado',
    },
    solution: {
      code: 'def confere(resultado, esperado):\n    return resultado == esperado',
      explanation:
        'O operador `==` compara os dois valores e já devolve o booleano que o teste precisa.',
    },
  }),
  mini({
    id: 'mini-unit-test-2',
    title: 'Relatório de Teste',
    areaId: 'engenharia',
    topic: 'debug',
    difficulty: 2,
    context: 'Cada teste da casa imprime "OK" ou diz o que deu errado.',
    objective: [
      'Escreva `relatorio_teste(resultado, esperado)`, que simula a mensagem de um teste unitário.',
      'Ela **devolve** `"OK"` se os valores forem iguais; senão devolve `"FALHOU: esperado X, veio Y"`, com `X` sendo `esperado` e `Y` sendo `resultado`.',
      'Exemplo: `relatorio_teste(3, 3)` devolve `"OK"`.',
    ],
    concept: 'Mensagens de falha mostram o valor esperado e o obtido para facilitar o debug.',
    concepts: ['unit-test', 'condition'],
    functionName: 'relatorio_teste',
    params: 'resultado, esperado',
    visible: [
      ['falha', 'relatorio_teste(5, 7)', 'FALHOU: esperado 7, veio 5'],
      ['textos iguais', 'relatorio_teste("a", "a")', 'OK'],
      ['falha de texto', 'relatorio_teste("x", "y")', 'FALHOU: esperado y, veio x'],
    ],
    hidden: [
      ['zeros', 'relatorio_teste(0, 0)', 'OK'],
      ['listas', 'relatorio_teste([1], [2])', 'FALHOU: esperado [2], veio [1]'],
    ],
    ladder: {
      question: 'Que informação ajuda mais quem lê uma falha de teste?',
      clue: 'Compare primeiro; se for diferente, monte a mensagem com os dois valores.',
      concept: 'Uma f-string insere variáveis no texto: `f"esperado {x}"`.',
      example: 'if resultado == esperado:\n    return "OK"\nreturn f"FALHOU: ..."',
    },
    solution: {
      code: 'def relatorio_teste(resultado, esperado):\n    if resultado == esperado:\n        return "OK"\n    return f"FALHOU: esperado {esperado}, veio {resultado}"',
      explanation:
        'Se os valores são iguais devolvemos "OK"; senão a f-string mostra o esperado e o obtido na mensagem.',
    },
  }),

  // ───────────────────────── breakpoint ─────────────────────────
  mini({
    id: 'mini-breakpoint-1',
    title: 'Soma que Perde um',
    areaId: 'engenharia',
    topic: 'debug',
    difficulty: 1,
    context: 'A contabilidade do DEVBet soma as fichas, mas o total sempre sai faltando.',
    objective: [
      'O código inicial de `soma_de_1_ate(n)` tem um **bug**: corrija-o (não precisa reescrever tudo).',
      'A função **devolve** a soma `1 + 2 + ... + n` para `n >= 0`; para `n = 0` devolve `0`.',
      'Exemplo: `soma_de_1_ate(3)` devolve `6`.',
    ],
    concept: 'Depurar é achar onde o valor real diverge do esperado; `range(a, b)` não inclui `b`.',
    concepts: ['breakpoint', 'for'],
    functionName: 'soma_de_1_ate',
    params: 'n',
    starterCode:
      'def soma_de_1_ate(n):\n    total = 0\n    for i in range(1, n):\n        total += i\n    return total\n',
    visible: [
      ['cinco', 'soma_de_1_ate(5)', 15],
      ['um', 'soma_de_1_ate(1)', 1],
      ['dez', 'soma_de_1_ate(10)', 55],
    ],
    hidden: [['zero', 'soma_de_1_ate(0)', 0]],
    ladder: {
      question:
        'Se você pausasse no último passo do laço, qual valor de `i` veria? Ele é o esperado?',
      clue: 'Teste um caso pequeno à mão: com `n = 1`, quantas voltas o laço dá?',
      concept: '`range(1, n)` vai de 1 até `n - 1`: o limite final fica de fora.',
      example: 'for i in range(1, n + ...):',
    },
    solution: {
      code: 'def soma_de_1_ate(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total',
      explanation:
        'O `range` exclui o limite final, então precisa ir até `n + 1` para incluir o próprio `n`.',
    },
  }),
  mini({
    id: 'mini-breakpoint-2',
    title: 'Maior que Zero?',
    areaId: 'engenharia',
    topic: 'debug',
    difficulty: 2,
    context: 'O placar mostra o maior saldo da noite, mas erra quando todos estão no vermelho.',
    objective: [
      'O código inicial de `maior_valor(lista)` tem um **bug**: corrija-o.',
      'A função recebe uma lista **não vazia** de números (podem ser negativos) e **devolve** o maior valor dela.',
      'Exemplo: `maior_valor([2, 7, 5])` devolve `7`.',
    ],
    concept:
      'Valor inicial errado é um bug clássico: observe a variável no primeiro passo do laço.',
    concepts: ['breakpoint', 'variable', 'condition'],
    functionName: 'maior_valor',
    params: 'lista',
    starterCode:
      'def maior_valor(lista):\n    maior = 0\n    for v in lista:\n        if v > maior:\n            maior = v\n    return maior\n',
    visible: [
      ['todos negativos', 'maior_valor([-5, -2, -9])', -2],
      ['positivos', 'maior_valor([4, 8, 1])', 8],
      ['um negativo só', 'maior_valor([-1])', -1],
    ],
    hidden: [
      ['negativos repetidos', 'maior_valor([-3, -3, -4])', -3],
      ['misto', 'maior_valor([-10, 5, 0])', 5],
    ],
    ladder: {
      question: 'Com uma lista só de negativos, qual valor `maior` ainda tem no final do laço?',
      clue: 'O ponto de partida de `maior` não pode ser um número qualquer: precisa vir da própria lista.',
      concept: 'Inicialize o candidato com um elemento real da lista, como `lista[0]`.',
      example: 'maior = lista[...]',
    },
    solution: {
      code: 'def maior_valor(lista):\n    maior = lista[0]\n    for v in lista:\n        if v > maior:\n            maior = v\n    return maior',
      explanation:
        'Começar em 0 faz listas só de negativos devolverem 0; começar em `lista[0]` usa um valor que realmente existe.',
    },
  }),
];
