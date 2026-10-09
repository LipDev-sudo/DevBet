import type { CardId } from '@/engine/types';

/**
 * Perguntas do jogo, baseadas na apresentação "Fábrica de software" (introdução ao desenvolvimento de soluções
 * tecnológicas para o ensino médio): software, programação, linguagens (Python, Java, PHP), frameworks, bibliotecas,
 * sites no-code, jogos e filmes sobre programação.
 *
 * Cada carta puxa um tema da apresentação (`TOPIC_BY_CARD`). A primeira carta jogada decide a pergunta; mãos grandes
 * (4–5 cartas) puxam as mais difíceis. Errar não trava nada: cada resposta errada só tira precisão da mão.
 */
export interface Question {
  id: string;
  /** Carta que puxa a pergunta: ela vale o dobro quando lidera a mão. */
  card: CardId;
  /** Tema da apresentação, mostrado ao jogador. */
  topic: string;
  hard: boolean;
  /** Use `código` entre crases para destacar trechos. */
  prompt: string;
  /** Trecho opcional mostrado junto da pergunta. */
  code?: string;
  options: string[];
  /** Posição da resposta certa em `options`. */
  answer: number;
  /** Mostrada depois de acertar: é aqui que o jogador aprende. */
  explanation: string;
}

export const TOPIC_BY_CARD: Record<CardId, string> = {
  variable: 'O que é software',
  operator: 'Tipos de software',
  boolean: 'O que é programação',
  condition: 'Para que serve programar',
  for: 'Programação no dia a dia',
  while: 'Python',
  list: 'Java',
  dictionary: 'PHP',
  set: 'Escolhendo a linguagem',
  function: 'Bibliotecas',
  parameter: 'Como usar bibliotecas',
  return: 'Frameworks',
  recursion: 'Sites no-code',
  search: 'Programação e jogos',
  'unit-test': 'O Jogo da Imitação',
  breakpoint: 'Estrelas Além do Tempo',
};

/**
 * Gira as alternativas para que a certa não fique sempre na mesma posição. É determinístico (depende só do id),
 * então a pergunta é a mesma em qualquer navegador e nos saves.
 */
function spread(question: Question): Question {
  const n = question.options.length;
  const target = [...question.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % n;
  const shift = (target - question.answer + n) % n;
  const options = question.options.map((_, i, all) => all[(i - shift + n) % n] as string);
  return { ...question, options, answer: target };
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
): Question =>
  spread({
    id,
    card,
    topic: TOPIC_BY_CARD[card],
    hard,
    prompt,
    code,
    options,
    answer,
    explanation,
  });

export const QUESTIONS: readonly Question[] = [
  // ------------------------------------------------------------ O que é software
  q(
    'q-variable-1',
    'variable',
    false,
    'O que é um software?',
    [
      'A parte física do computador, como a tela e o teclado',
      'A parte lógica: programas e instruções que orientam o hardware',
      'Um tipo de cabo de internet',
      'Somente os jogos instalados no celular',
    ],
    1,
    'Software é a parte lógica dos dispositivos: programas e instruções que dizem ao hardware o que fazer.',
  ),
  q(
    'q-variable-2',
    'variable',
    false,
    'O que o software orienta o hardware a fazer?',
    [
      'Nada: o hardware funciona sozinho',
      'Tarefas, como rodar aplicativos, abrir sites e gerenciar dados',
      'Só ligar e desligar a tomada',
      'Somente imprimir documentos',
    ],
    1,
    'É o software que manda o hardware rodar aplicativos, abrir sites e gerenciar dados.',
  ),
  q(
    'q-variable-3',
    'variable',
    true,
    'Um celular tem tela, bateria, câmera, Android e o aplicativo do WhatsApp. Quais destes itens são software?',
    ['Tela, bateria e câmera', 'Android e WhatsApp', 'Bateria e Android', 'Todos os cinco'],
    1,
    'Tela, bateria e câmera são hardware (físicos). O Android (sistema operacional) e o WhatsApp (aplicativo) são software.',
  ),

  // ------------------------------------------------------------ Tipos de software
  q(
    'q-operator-1',
    'operator',
    false,
    'Windows, Android e iOS são exemplos de qual tipo de software?',
    ['Navegadores', 'Sistemas operacionais', 'Produtividade', 'Jogos'],
    1,
    'Windows, Android e iOS são sistemas operacionais: eles controlam o aparelho e rodam os outros programas.',
  ),
  q(
    'q-operator-2',
    'operator',
    false,
    'Google Chrome, Safari e Firefox são exemplos de…',
    ['Navegadores', 'Sistemas operacionais', 'Planilhas', 'Redes sociais'],
    0,
    'Navegadores são os softwares que usamos para abrir e visitar sites.',
  ),
  q(
    'q-operator-3',
    'operator',
    true,
    'Word, Google Sheets e Canva ajudam a escrever, calcular e criar designs. Qual é a categoria deles?',
    ['Sistemas operacionais', 'Navegadores', 'Streaming', 'Produtividade'],
    3,
    'Programas de produtividade existem para resolver tarefas do dia a dia: textos, tabelas, apresentações e designs.',
  ),

  // ------------------------------------------------------------ O que é programação
  q(
    'q-boolean-1',
    'boolean',
    false,
    'O que é programação?',
    [
      'Assistir vídeos sobre tecnologia',
      'Escrever instruções organizadas numa linguagem que o computador entende',
      'Montar as peças físicas de um computador',
      'Navegar rápido na internet',
    ],
    1,
    'Programar é escrever um conjunto de instruções organizadas, numa linguagem que o computador entende.',
  ),
  q(
    'q-boolean-2',
    'boolean',
    false,
    'A programação funciona como uma…',
    ['Receita de bolo', 'Pintura em tela', 'Música de fundo', 'Fotografia'],
    0,
    'Como numa receita, você passa os passos na ordem certa e o dispositivo executa exatamente o que foi escrito.',
  ),
  q(
    'q-boolean-3',
    'boolean',
    true,
    'Na comparação com uma receita de bolo, quem seria o "cozinheiro" que segue as instruções?',
    [
      'O programador, que lê o código pronto',
      'O computador, que executa as instruções escritas',
      'O usuário, que só olha a tela',
      'A internet, que entrega os ingredientes',
    ],
    1,
    'O programador escreve a receita (o código) e o computador é quem a executa, passo a passo.',
  ),

  // ------------------------------------------------------------ Para que serve programar
  q(
    'q-condition-1',
    'condition',
    false,
    'Para que serve a programação?',
    [
      'Só para jogar videogame',
      'Para criar sistemas, aplicativos, sites, jogos e ferramentas',
      'Apenas para consertar impressoras',
      'Não serve para nada no dia a dia',
    ],
    1,
    'Com programação criamos sistemas, aplicativos, sites, jogos e ferramentas.',
  ),
  q(
    'q-condition-2',
    'condition',
    false,
    'Além de criar coisas novas, programar também ajuda a…',
    [
      'Automatizar tarefas e resolver problemas',
      'Aumentar o brilho da tela',
      'Deixar a internet mais barata',
      'Evitar o uso de eletricidade',
    ],
    0,
    'A programação serve para criar ferramentas que automatizam tarefas ou solucionam problemas.',
  ),
  q(
    'q-condition-3',
    'condition',
    true,
    'Um software não é criado só "para ser um programa". Normalmente ele nasce para…',
    [
      'Ocupar espaço no celular',
      'Resolver um problema ou atender a uma necessidade',
      'Substituir o hardware',
      'Enfeitar a tela do computador',
    ],
    1,
    'Todo bom software parte de um problema real ou de uma necessidade das pessoas.',
  ),

  // ------------------------------------------------------------ Programação no dia a dia
  q(
    'q-for-1',
    'for',
    false,
    'WhatsApp, Instagram, TikTok e YouTube são exemplos de…',
    ['Redes sociais', 'Sistemas operacionais', 'Linguagens de programação', 'Hardware'],
    0,
    'Todas essas redes sociais são feitas com programação.',
  ),
  q(
    'q-for-2',
    'for',
    false,
    'Netflix e Spotify, que entregam filmes e músicas pela internet, são exemplos de…',
    ['Navegadores', 'Planilhas', 'Streaming', 'Sistemas operacionais'],
    2,
    'Serviços de streaming transmitem conteúdo pela internet, e por trás deles há muito código.',
  ),
  q(
    'q-for-3',
    'for',
    true,
    'Quando você pesquisa algo no Google Search usando o Chrome, qual é a melhor descrição?',
    [
      'Nenhum código está envolvido',
      'Dois softwares feitos com programação: o navegador e o buscador',
      'Só hardware está trabalhando',
      'É um filme em streaming',
    ],
    1,
    'O Chrome (navegador) e o Google Search (busca) são softwares criados por programadores.',
  ),

  // ------------------------------------------------------------ Python
  q(
    'q-while-1',
    'while',
    false,
    'Na apresentação, o Python é comparado a…',
    [
      'Um canivete suíço',
      'O esqueleto de um prédio',
      'A fiação elétrica de uma casa',
      'Um martelo',
    ],
    0,
    'Python é como uma ferramenta universal: simples e direta, serve para muita coisa.',
  ),
  q(
    'q-while-2',
    'while',
    false,
    'Qual é uma característica do Python?',
    [
      'Ser muito rígida e complicada',
      'Ser simples e versátil',
      'Só servir para criar sites',
      'Só funcionar em videogames',
    ],
    1,
    'A força do Python é a simplicidade e a versatilidade.',
  ),
  q(
    'q-while-3',
    'while',
    true,
    'O que dá para construir com Python, segundo a apresentação?',
    [
      'Só planilhas',
      'Desde automações rápidas até inteligência artificial complexa',
      'Apenas sistemas operacionais',
      'Só sites de venda online',
    ],
    1,
    'Python vai de pequenas automações até inteligência artificial, sem complicações.',
  ),

  // ------------------------------------------------------------ Java
  q(
    'q-list-1',
    'list',
    false,
    'O Java é comparado a…',
    [
      'Um canivete suíço',
      'O esqueleto e a fundação de um prédio de vários andares',
      'A canalização de uma casa',
      'Uma receita de bolo',
    ],
    1,
    'Java é como a estrutura de um prédio: organizada e firme.',
  ),
  q(
    'q-list-2',
    'list',
    false,
    'Quais palavras descrevem o Java?',
    ['Simples e solta', 'Organizada, rígida e segura', 'Visual e sem código', 'Lenta e inútil'],
    1,
    'Java é organizada, rígida e segura, ótima para sistemas grandes.',
  ),
  q(
    'q-list-3',
    'list',
    true,
    'Por que o Java é uma boa escolha para grandes sistemas e aplicações empresariais?',
    [
      'Porque ela não precisa de computador',
      'Porque garante que sistemas grandes funcionem sem falhar',
      'Porque foi criada só para fazer sites',
      'Porque é a única linguagem que existe',
    ],
    1,
    'A estrutura rígida e segura do Java ajuda grandes sistemas a funcionarem sem falhar.',
  ),

  // ------------------------------------------------------------ PHP
  q(
    'q-dictionary-1',
    'dictionary',
    false,
    'O PHP é descrito como o…',
    ['Motor da Web', 'Canivete suíço', 'Esqueleto do prédio', 'Cozinheiro da receita'],
    0,
    'O PHP é o motor da web: foi criado para fazer sites funcionarem no servidor.',
  ),
  q(
    'q-dictionary-2',
    'dictionary',
    false,
    'O PHP foi criado especificamente para…',
    [
      'Fazer sites funcionarem no servidor',
      'Criar jogos de computador',
      'Controlar robôs',
      'Editar vídeos',
    ],
    0,
    'O PHP roda no servidor e faz os sites funcionarem.',
  ),
  q(
    'q-dictionary-3',
    'dictionary',
    true,
    'O PHP é como a canalização e a fiação elétrica de uma casa. O que ele liga?',
    [
      'O usuário às bases de dados, de forma ágil e direta',
      'O teclado ao mouse',
      'A bateria à tela',
      'O Wi-Fi à geladeira',
    ],
    0,
    'Assim como a fiação leva energia, o PHP conecta o usuário às bases de dados.',
  ),

  // ------------------------------------------------------------ Escolhendo a linguagem
  q(
    'q-set-1',
    'set',
    false,
    'Para uma automação rápida ou um projeto de inteligência artificial, qual linguagem da apresentação combina mais?',
    ['Python', 'Java', 'PHP', 'Nenhuma'],
    0,
    'Python é simples e versátil: boa para automações e IA.',
  ),
  q(
    'q-set-2',
    'set',
    false,
    'Para um site que precisa conversar com um banco de dados no servidor, a escolha mais natural é…',
    ['Java', 'PHP', 'Planilha', 'Sistema operacional'],
    1,
    'O PHP nasceu para fazer sites funcionarem no servidor e acessar bases de dados.',
  ),
  q(
    'q-set-3',
    'set',
    true,
    'Ligue cada linguagem à sua analogia: Python, Java e PHP.',
    [
      'Python = esqueleto do prédio; Java = canivete suíço; PHP = motor da web',
      'Python = canivete suíço; Java = esqueleto do prédio; PHP = canalização e fiação',
      'Python = fiação; Java = canivete suíço; PHP = receita de bolo',
      'Python = receita de bolo; Java = fiação; PHP = esqueleto do prédio',
    ],
    1,
    'Python é o canivete suíço, Java é a fundação do prédio e PHP é a canalização e fiação ligadas à casa.',
  ),

  // ------------------------------------------------------------ Bibliotecas
  q(
    'q-function-1',
    'function',
    false,
    'O que é uma biblioteca (library) na programação?',
    [
      'Um lugar com livros de papel',
      'Uma coleção de códigos prontos que você pode "pegar emprestado"',
      'Um tipo de computador',
      'Um site sem código',
    ],
    1,
    'Biblioteca é uma coleção de códigos prontos que resolvem um problema específico.',
  ),
  q(
    'q-function-2',
    'function',
    false,
    'Para que usamos bibliotecas?',
    [
      'Para reinventar a roda a cada projeto',
      'Para resolver um problema sem precisar reescrever tudo',
      'Para apagar o código pronto',
      'Para desligar o computador',
    ],
    1,
    'Elas evitam "reinventar a roda": você usa o que já foi feito e testado.',
  ),
  q(
    'q-function-3',
    'function',
    true,
    'Qual destes é um bom exemplo de tarefa que uma biblioteca resolve?',
    [
      'Calcular datas, criar um gráfico ou animar um botão',
      'Construir um computador inteiro',
      'Instalar um sistema operacional',
      'Trocar a bateria do celular',
    ],
    0,
    'Cada biblioteca tem foco único: datas, gráficos, animações e assim por diante.',
  ),

  // ------------------------------------------------------------ Como usar bibliotecas
  q(
    'q-parameter-1',
    'parameter',
    false,
    'Numa biblioteca, quem decide quando e como usá-la?',
    [
      'A própria biblioteca',
      'O seu código: você está no controle',
      'O sistema operacional',
      'O usuário final',
    ],
    1,
    'Você chama a biblioteca quando e como quiser: o controle é do seu código.',
  ),
  q(
    'q-parameter-2',
    'parameter',
    false,
    'Uma biblioteca costuma ter foco único. Isso quer dizer que ela…',
    [
      'Resolve uma tarefa ou um conjunto bem pequeno de tarefas',
      'Faz tudo no projeto sozinha',
      'Só funciona uma vez',
      'Só existe para jogos',
    ],
    0,
    'Foco único: ela é boa em uma coisa específica.',
  ),
  q(
    'q-parameter-3',
    'parameter',
    true,
    'Por que se diz que uma biblioteca é "leve e flexível"?',
    [
      'Porque pesa poucos gramas',
      'Porque dá para colocar e tirar do projeto sem quebrar a estrutura inteira',
      'Porque só funciona no celular',
      'Porque não precisa de código',
    ],
    1,
    'Como é uma peça independente, você a adiciona ou remove com facilidade.',
  ),

  // ------------------------------------------------------------ Frameworks
  q(
    'q-return-1',
    'return',
    false,
    'Um framework é uma estrutura pronta que…',
    [
      'Organiza o projeto e dá a base para você construir em cima',
      'Só serve para jogos',
      'Apaga o seu código',
      'Substitui o computador',
    ],
    0,
    'Framework é uma estrutura base: ele define como o projeto se organiza e você completa o resto.',
  ),
  q(
    'q-return-2',
    'return',
    false,
    'Qual é a diferença de espírito entre biblioteca e framework?',
    [
      'Nenhuma, são a mesma coisa',
      'Na biblioteca você chama o código; no framework a estrutura guia o seu código',
      'Biblioteca é hardware e framework é software',
      'Framework só existe em Python',
    ],
    1,
    'Com a biblioteca o controle é seu. Com o framework, ele impõe a estrutura e chama o seu código.',
  ),
  q(
    'q-return-3',
    'return',
    true,
    'Você precisa só de uma tarefa pequena, como gerar um gráfico. O que combina melhor?',
    [
      'Uma biblioteca',
      'Um framework completo',
      'Um novo sistema operacional',
      'Um novo computador',
    ],
    0,
    'Para uma tarefa pequena e específica, a biblioteca (leve e flexível) é a escolha certa.',
  ),

  // ------------------------------------------------------------ Sites no-code
  q(
    'q-recursion-1',
    'recursion',
    false,
    'O que são sites no-code?',
    [
      'Sites criados por ferramentas visuais, sem digitar código',
      'Sites que não funcionam',
      'Sites que só têm texto',
      'Sites escritos só em Python',
    ],
    0,
    'No-code significa "sem código": você monta o site com ferramentas visuais.',
  ),
  q(
    'q-recursion-2',
    'recursion',
    false,
    'Qual destas linguagens você NÃO precisa digitar num site no-code?',
    ['HTML, CSS e JavaScript', 'Português', 'Inglês', 'Emojis'],
    0,
    'As ferramentas no-code eliminam a necessidade de digitar HTML, CSS ou JavaScript.',
  ),
  q(
    'q-recursion-3',
    'recursion',
    true,
    'Quais coisas podem ser criadas com ferramentas no-code?',
    [
      'Só planilhas',
      'Páginas da web, lojas virtuais e sistemas',
      'Apenas hardware',
      'Somente filmes',
    ],
    1,
    'Com no-code dá para criar páginas da web, lojas virtuais e sistemas inteiros.',
  ),

  // ------------------------------------------------------------ Programação e jogos
  q(
    'q-search-1',
    'search',
    false,
    '"The Farmer Was Replaced" é um jogo baseado em qual linguagem?',
    ['Python', 'PHP', 'Java', 'Assembly'],
    0,
    'Nesse jogo você aprende a automatizar tarefas usando uma linguagem baseada em Python.',
  ),
  q(
    'q-search-2',
    'search',
    false,
    '"Shenzhen I/O" usa qual tipo de linguagem?',
    ['Python', 'Assembly customizado', 'PHP', 'HTML'],
    1,
    'Shenzhen I/O ensina programação com um Assembly customizado, bem perto da máquina.',
  ),
  q(
    'q-search-3',
    'search',
    true,
    'Os dois jogos da apresentação, "The Farmer Was Replaced" e "Shenzhen I/O", têm em comum…',
    [
      'Só rodam em celulares',
      'Usam programação como parte do jogo e estão disponíveis em computadores',
      'Não têm código',
      'São filmes na Netflix',
    ],
    1,
    'Ambos usam programação como mecânica de jogo e estão disponíveis em computadores.',
  ),

  // ------------------------------------------------------------ O Jogo da Imitação
  q(
    'q-unit-test-1',
    'unit-test',
    false,
    'O filme "O Jogo da Imitação" conta a história de qual matemático?',
    ['Alan Turing', 'Katherine Johnson', 'Dorothy Vaughan', 'Mary Jackson'],
    0,
    'O filme conta a história real de Alan Turing.',
  ),
  q(
    'q-unit-test-2',
    'unit-test',
    false,
    'Qual era a missão quase impossível de Alan Turing na Segunda Guerra Mundial?',
    [
      'Construir um foguete',
      'Decifrar a "Enigma", a máquina de códigos secretos',
      'Criar um videogame',
      'Fazer um site de buscas',
    ],
    1,
    'A missão era decifrar a Enigma, a máquina usada pelos inimigos.',
  ),
  q(
    'q-unit-test-3',
    'unit-test',
    true,
    'Por que decifrar a Enigma era tão difícil?',
    [
      'Porque ela só funcionava de dia',
      'Porque as senhas mudavam todas as noites à meia-noite',
      'Porque ela não tinha código algum',
      'Porque era uma máquina de lavar',
    ],
    1,
    'As senhas mudavam todas as noites à meia-noite, o que tornava a tarefa quase impossível.',
  ),

  // ------------------------------------------------------------ Estrelas Além do Tempo
  q(
    'q-breakpoint-1',
    'breakpoint',
    false,
    'Quais são as três mulheres do filme "Estrelas Além do Tempo"?',
    [
      'Katherine Johnson, Dorothy Vaughan e Mary Jackson',
      'Ada Lovelace, Marie Curie e Rosa Parks',
      'Alan Turing, Katherine Johnson e Mary Jackson',
      'Dorothy Vaughan, Marie Curie e Ada Lovelace',
    ],
    0,
    'O filme conta a história real de Katherine Johnson, Dorothy Vaughan e Mary Jackson.',
  ),
  q(
    'q-breakpoint-2',
    'breakpoint',
    false,
    'Segundo a apresentação, como essas três mulheres mudaram o mundo?',
    [
      'Com a mente e a matemática',
      'Com super-poderes de verdade',
      'Com capas e máscaras',
      'Só com sorte',
    ],
    0,
    'Elas mudaram o mundo com a mente e a matemática, sem capas.',
  ),
  q(
    'q-breakpoint-3',
    'breakpoint',
    true,
    'Onde estão disponíveis os dois filmes da apresentação?',
    [
      'Os dois na Netflix',
      '"O Jogo da Imitação" na Netflix e "Estrelas Além do Tempo" no Disney+',
      '"O Jogo da Imitação" no Disney+ e "Estrelas Além do Tempo" na Netflix',
      'Os dois só no cinema',
    ],
    1,
    '"O Jogo da Imitação" está na Netflix e "Estrelas Além do Tempo" no Disney+.',
  ),
];

/** Pergunta do boss final: fixa na 1ª mão da THE INFINITE LOOP. Resume a apresentação. */
export const BOSS_QUESTION: Question = spread({
  id: 'q-boss-infinite-loop',
  card: 'while',
  topic: 'Fábrica de software',
  hard: true,
  prompt: 'THE INFINITE LOOP quer a sua resposta final: qual frase define melhor um software?',
  options: [
    'É a parte física do computador, como a tela e o teclado',
    'São programas e instruções que orientam o hardware a executar tarefas',
    'É qualquer coisa que se conecta à internet',
    'É só um tipo de jogo de computador',
  ],
  answer: 1,
  explanation:
    'Software é a parte lógica dos dispositivos: programas e instruções que orientam o hardware. É isso que a Fábrica de software constrói.',
});

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
 * cai para qualquer pergunta da carta.
 */
export function questionPool(lead: CardId, big: boolean): Question[] {
  const all = QUESTIONS.filter((question) => question.card === lead);
  const level = all.filter((question) => question.hard === big);
  return level.length > 0 ? level : all;
}
