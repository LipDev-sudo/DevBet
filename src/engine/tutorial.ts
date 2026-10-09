import { getQuestion } from '@/content/quiz';
import { COMBOS, comboLabel } from './combos';
import type { Mood } from './dealer';
import { BASE_DISCARDS, bossRule, currentBlind, handCards, type RunState } from './blind';
import type { LessonId, TutorialEvent, TutorialEventKind, TutorialState } from './tutorial-state';

/**
 * A Tutorial Run é uma run real. Este módulo só decide QUAL dica o Dealer mostra agora, a partir do
 * estado real da run, e quando ela termina (por ações reais). Nenhuma regra do jogo muda aqui.
 */

export type LessonKey = LessonId | 'welcome' | 'end';

export interface Lesson {
  id: LessonKey;
  title: string;
  text: string;
  detail?: string;
  /** Seletor CSS dos elementos a destacar na tela. */
  target: string;
  /** Lição informativa: tem botão "Entendi". As de ação esperam o jogador fazer a coisa de verdade. */
  ack: boolean;
  /** Ação esperada, nas lições de ação. */
  action?: string;
  mood: Mood;
  /** Eventos reais que concluem a lição. */
  completeOn: TutorialEventKind[];
}

const T = (name: string) => `[data-tutorial="${name}"]`;

function welcome(): Lesson {
  return {
    id: 'welcome',
    title: 'Bem-vindo à casa',
    text: 'Aqui você joga mãos de cartas de conceitos de Python, como no pôquer. Cada mão vem com uma pergunta rápida e vira pontos.',
    detail:
      'Esta é uma run de verdade, no estilo dos jogos de cartas roguelike: blinds com meta, mãos e descartes limitados, jokers que dão bônus a mãos bem montadas. Na primeira run você joga com o Pacote Funções.',
    target: `${T('packs')}, ${T('start-run')}`,
    ack: false,
    action: 'Escolha um baralho e sente à mesa',
    mood: 'idle',
    completeOn: [],
  };
}

function comboInHand(run: RunState): string | null {
  const ids = new Set(handCards(run).map((card) => card.cardId));
  const present = COMBOS.filter((c) => c.requires.every((id) => ids.has(id)));
  // A Tutorial Run garante PURE FUNCTION na 1ª mão: é o combo que a lição ensina.
  const combo = present.find((c) => c.id === 'pure-function') ?? present[0];
  return combo ? `${combo.name} (${comboLabel(combo)})` : null;
}

function lessonForBlind(run: RunState, done: Set<LessonId>): Lesson | null {
  const def = currentBlind(run);
  if (def.boss) {
    if (done.has('boss')) return null;
    return {
      id: 'boss',
      title: 'O boss',
      text: `${def.name}: ${def.boss.text}`,
      detail:
        'Todo boss muda uma regra da mesa. Leia a regra antes de começar: ela decide quais cartas e quantas você deve jogar.',
      target: T('blind-info'),
      ack: true,
      mood: 'boss',
      completeOn: ['ack', 'started'],
    };
  }
  if (done.has('blind')) return null;
  return {
    id: 'blind',
    title: 'A blind',
    text: `Para vencer esta blind você precisa somar ${def.target} pontos com as mãos que jogar. Você tem 4 mãos e 3 descartes.`,
    detail:
      'Cada mão que você joga pontua fichas × multiplicador. Se as mãos acabarem antes da meta, a run termina. Entre as blinds você ganha fichas e visita a loja.',
    target: T('blind-info'),
    ack: false,
    action: 'Comece a blind',
    mood: 'idle',
    completeOn: ['started'],
  };
}

function lessonForRound(run: RunState, done: Set<LessonId>): Lesson | null {
  const round = run.round;
  if (!round) return null;
  if (!done.has('hand')) {
    const combo = comboInHand(run);
    return {
      id: 'hand',
      title: 'Sua mão',
      text: 'Escolha de 1 a 5 cartas e toque em Jogar. A PRIMEIRA carta que você escolher decide o assunto da pergunta rápida da mão.',
      detail: `Cartas do mesmo assunto formam combinações (PAIR, FLUSH…) e conceitos que combinam dão bônus.${combo ? ` Sua mão tem um combo: ${combo}. Escolha as duas cartas juntas!` : ''} Mais cartas jogadas = pergunta mais difícil, mas pontua mais.`,
      target: T('hand'),
      ack: false,
      action: 'Escolha cartas e toque em Jogar',
      mood: 'idle',
      completeOn: ['played'],
    };
  }
  if (!done.has('discard') && round.handsPlayed >= 1 && round.discardsLeft === BASE_DISCARDS) {
    return {
      id: 'discard',
      title: 'Descartes',
      text: 'Não gostou das cartas? Descarte até 5 e compre outras. Você tem 3 descartes por blind.',
      detail:
        'Descartar não gasta mão. Use para buscar um combo ou cartas do assunto que você já domina.',
      target: T('discard'),
      ack: true,
      mood: 'idle',
      completeOn: ['ack', 'discarded', 'played'],
    };
  }
  return null;
}

function lessonForQuiz(run: RunState, done: Set<LessonId>): Lesson | null {
  const play = run.round?.play;
  if (!play || done.has('quiz')) return null;
  const question = getQuestion(play.questionId);
  return {
    id: 'quiz',
    title: 'A pergunta da mão',
    text: `Sua mão trouxe uma pergunta sobre ${question.topic}. Escolha a alternativa certa para pontuar.`,
    detail:
      'Cada resposta errada tira 15% da pontuação da mão (a alternativa some e você tenta outra). A primeira carta que você escolheu vale o dobro.',
    target: T('quiz'),
    ack: false,
    action: 'Responda a pergunta',
    mood: 'idle',
    completeOn: ['answered'],
  };
}

function lessonForScored(run: RunState, done: Set<LessonId>): Lesson | null {
  if (done.has('score')) return null;
  const last = run.round?.last;
  return {
    id: 'score',
    title: 'O placar',
    text: 'Fichas × multiplicador: a mão certa, cada carta, os combos e os jokers vão somando.',
    detail: last
      ? 'A precisão final reduz a pontuação se você errou alguma alternativa da pergunta.'
      : undefined,
    target: T('score'),
    ack: true,
    mood: 'success',
    completeOn: ['ack', 'continued'],
  };
}

function lessonForCleared(done: Set<LessonId>): Lesson | null {
  if (done.has('cleared')) return null;
  return {
    id: 'cleared',
    title: 'Blind vencida',
    text: 'Meta batida! Você ganha fichas pela blind, por cada mão que sobrou e juros por poupar.',
    detail: 'Gaste as fichas na loja: jokers, cartas novas e melhorias de mão.',
    target: T('payout'),
    ack: false,
    action: 'Recolha a recompensa',
    mood: 'success',
    completeOn: ['cashed'],
  };
}

function lessonForShop(done: Set<LessonId>, t: TutorialState): Lesson | null {
  if (done.has('shop')) return null;
  return {
    id: 'shop',
    title: 'A loja e os jokers',
    text: t.bought
      ? 'Boa compra! Quando terminar, siga para a próxima blind.'
      : 'Jokers são IDIOMAS de Python: cada um dispara quando a sua mão tem as cartas daquele assunto. Cada um mostra um exemplo.',
    detail:
      'Compre um joker para levar o bônus pelas próximas mãos. Você também pode vender jokers depois por metade do preço.',
    target: T('shop-offers'),
    ack: false,
    action: t.bought ? 'Siga para a próxima blind' : 'Compre um joker (ou siga em frente)',
    mood: 'idle',
    completeOn: ['bought', 'left-shop'],
  };
}

function ending(run: RunState): Lesson {
  const won = run.status === 'won';
  const abandoned = run.endReason === 'abandoned';
  return {
    id: 'end',
    title: 'Fim da primeira run',
    text: won
      ? 'Você venceu a High Table. Agora conhece as regras da casa.'
      : abandoned
        ? 'Você abandonou a primeira run. O que aprendeu continua com você.'
        : 'Suas mãos acabaram antes da meta. Agora você conhece as regras da casa.',
    detail: 'O guia termina aqui: as próximas runs começam direto, sem tutorial.',
    target: T('new-run'),
    ack: false,
    mood: won ? 'success' : 'serious',
    completeOn: [],
  };
}

/** A dica do Dealer que vale agora, ou null. Depende só do estado real da run. */
export function currentLesson(run: RunState | null, tutorialCompleted = false): Lesson | null {
  if (!run) return tutorialCompleted ? null : welcome();
  const t = run.tutorial;
  if (!t) return null;
  const done = new Set(t.done);
  switch (run.status) {
    case 'blind':
      return lessonForBlind(run, done);
    case 'round':
      return lessonForRound(run, done);
    case 'quiz':
      return lessonForQuiz(run, done);
    case 'scored':
      return lessonForScored(run, done);
    case 'cleared':
      return lessonForCleared(done);
    case 'shop':
      return lessonForShop(done, t);
    case 'won':
    case 'lost':
      return ending(run);
  }
}

/** Aplica um evento real: registra as ações e conclui a lição que estava ativa, se ele a conclui. */
export function reduceTutorial(run: RunState, event: TutorialEvent): TutorialState | null {
  const t = run.tutorial;
  if (!t) return null;
  const lesson = currentLesson(run);
  const next: TutorialState = { ...t, done: [...t.done] };
  if (event.kind === 'bought') next.bought = true;
  // Jogar uma mão conclui a lição de mão; começar uma blind com regra de boss conclui a do boss.
  if (event.kind === 'played' && !next.done.includes('hand')) next.done.push('hand');
  if (
    lesson &&
    lesson.id !== 'welcome' &&
    lesson.id !== 'end' &&
    lesson.completeOn.includes(event.kind) &&
    (event.kind !== 'ack' || event.lesson === lesson.id) &&
    !next.done.includes(lesson.id)
  ) {
    next.done.push(lesson.id);
  }
  // Ver a blind do boss sem lição própria pendente: nada a fazer; o boss só aparece uma vez.
  if (event.kind === 'started' && bossRule(run) && !next.done.includes('boss'))
    next.done.push('boss');
  return next;
}
