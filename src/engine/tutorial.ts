import { getChallenge } from '@/content/challenges';
import { RUN_LAYERS } from '@/content/map';
import { cardChips, cardMult, getCard } from './cards';
import { comboLabel } from './combos';
import type { Mood } from './dealer';
import { BOSS_MAX_LADDER, hintCost } from './hints';
import {
  handCards,
  LIFE_PRICE,
  RISK_LEVELS,
  RISK_ORDER,
  riskAvailability,
  SKIP_REWARD_CHIPS,
  type RunState,
} from './run';
import { FAIL_PENALTY, previewHand, streakMultiplier } from './scoring';
import type { LessonId, TutorialEvent, TutorialEventKind, TutorialState } from './tutorial-state';
import { RUN_LIMITS, type ExecutionReport } from '@/runner/types';

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
const one = (n: number) => n.toFixed(1);
const pct = (n: number) => Math.round(n * 100);
const names = (ids: readonly string[]) => ids.join(', ');

/** Diferença real entre o nível 0 e o nível 1 de melhoria: vem das funções do engine, não de texto fixo. */
function upgradeStep() {
  const card = getCard('variable');
  return {
    chips: cardChips(card, 1) - cardChips(card, 0),
    mult: cardMult(card, 1) - cardMult(card, 0),
  };
}

function welcome(): Lesson {
  return {
    id: 'welcome',
    title: 'Bem-vindo à casa',
    text: 'Você não está apenas programando. Está apostando na sua capacidade de resolver problemas.',
    detail:
      'Esta é uma run de verdade: você monta um baralho de conceitos de Python, escolhe quanto arriscar e resolve desafios reais. Na primeira run você joga com o Pacote Funções, que traz os conceitos do primeiro desafio; os outros baralhos abrem depois.',
    target: `${T('packs')}, ${T('start-run')}`,
    ack: false,
    action: 'Escolha um baralho e sente à mesa',
    mood: 'idle',
    completeOn: [],
  };
}

function lessonForMap(run: RunState, done: Set<LessonId>): Lesson | null {
  const layer = RUN_LAYERS[run.layerIndex];
  if (layer?.kind === 'boss') {
    if (done.has('boss')) return null;
    return {
      id: 'boss',
      title: 'O boss',
      text: 'Agora você vai enfrentar uma mesa diferente.',
      detail: `No boss, um Bust não tira você da mesa: você precisa vencer, e cada derrota custa uma vida. O Dealer só dá dicas até o nível ${BOSS_MAX_LADDER}; depois disso, só a solução explicada. Vencer o boss encerra a run com vitória.`,
      target: T('choices'),
      ack: true,
      mood: 'boss',
      completeOn: ['ack', 'chose'],
    };
  }
  if (run.history.length === 0 && !done.has('lobby')) {
    return {
      id: 'lobby',
      title: 'A casa',
      text: 'Cada mesa é um desafio de Python com uma meta de pontos. Ficar abaixo da meta é um Bust.',
      detail: 'Escolha um dos desafios abertos para sentar.',
      target: T('choices'),
      ack: false,
      action: 'Escolha um desafio',
      mood: 'idle',
      completeOn: ['chose'],
    };
  }
  return null;
}

function lessonForTable(run: RunState, done: Set<LessonId>): Lesson | null {
  const encounter = run.encounter;
  if (!encounter) return null;
  const challenge = getChallenge(encounter.challengeId);
  const hand = handCards(run);
  const preview = previewHand(hand, challenge.concepts);

  if (!done.has('cards')) {
    const boosted = preview.lines.filter((l) => l.boosted).map((l) => l.name);
    return {
      id: 'cards',
      title: 'Sua mão',
      text: 'Estas cartas são conceitos reais de Python. Cada uma soma fichas e multiplicador à sua pontuação, e o efeito dobra quando o desafio usa o conceito dela.',
      detail:
        boosted.length > 0
          ? `Neste desafio valem o dobro: ${names(boosted)}. Toque em uma carta para ver o que ela faz.`
          : 'Nenhuma carta desta mão é usada neste desafio, então todas valem o efeito normal. Toque em uma carta para ver o que ela faz.',
      target: T('hand'),
      ack: false,
      action: 'Toque em uma carta da mão',
      mood: 'idle',
      completeOn: ['inspect'],
    };
  }

  // Vidas e Bust: explicados quando passa a haver algo em jogo (mesa 2), sem provocar nenhum Bust.
  // Se um Bust real já aconteceu, a lição de Bust já explicou tudo isso.
  if (challenge.difficulty >= 2 && !done.has('lives') && !done.has('bust')) {
    return {
      id: 'lives',
      title: 'Bust e vidas',
      text: `Cada mesa tem uma meta (${challenge.target} pts nesta). Se a sua entrega aprovada pontuar abaixo dela, é Bust: você perde 1 vida e a aposta que estiver em jogo.`,
      detail: `Você tem ${run.lives} ${run.lives === 1 ? 'vida' : 'vidas'}; com 0, a run termina. Código que falha nos testes não é Bust: a mesa só fecha com uma entrega aprovada. Você não precisa provocar um Bust para continuar. A loja vende +1 vida por ${LIFE_PRICE} fichas.`,
      target: T('lives'),
      ack: true,
      mood: 'serious',
      completeOn: ['ack', 'started'],
    };
  }

  const riskOpen = riskAvailability(challenge.difficulty, 'risky', run.chips).ok;
  if (challenge.difficulty >= 2 && !done.has('risk')) {
    const lines = RISK_ORDER.map((level) => {
      const def = RISK_LEVELS[level];
      return `${def.label}: ${def.wager === 0 ? 'nada em jogo' : `aposta ${def.wager} fichas`}, recompensa ×${one(def.multiplier)}`;
    });
    return {
      id: 'risk',
      title: 'Risco',
      text: `${lines.join(' · ')}.`,
      detail:
        'A aposta volta se você vencer e se perde num Bust. O risco não muda a meta nem a chance de Bust: só quanto você ganha e quanto pode perder. Você jogou a mesa anterior em SAFE.' +
        (riskOpen ? '' : ' Faltam fichas para os riscos maiores.'),
      target: T('risk'),
      ack: true,
      mood: 'idle',
      completeOn: ['ack', 'started'],
    };
  }

  const combo = preview.combos[0];
  if (combo && !done.has('combo')) {
    return {
      id: 'combo',
      title: 'Combo de conceitos',
      text: `${combo.combo.name}: ${combo.combo.description}.`,
      detail: `Você tem ${comboLabel(combo.combo)} na mão e o desafio usa os dois conceitos, então soma +${combo.bonus.toFixed(2)} ao multiplicador. É diferente da Sequência, que premia vitórias seguidas.`,
      target: combo.combo.requires
        .map((id) => `${T('hand')} .playing-card[data-card-id="${id}"]`)
        .join(', '),
      ack: true,
      mood: 'success',
      completeOn: ['ack', 'started'],
    };
  }
  return null;
}

function lessonForChallenge(run: RunState, done: Set<LessonId>, t: TutorialState): Lesson | null {
  const encounter = run.encounter;
  if (!encounter) return null;
  const challenge = getChallenge(encounter.challengeId);

  if (challenge.boss && !done.has('boss-code')) {
    return {
      id: 'boss-code',
      title: 'Os dois bugs',
      text: 'Este código tem dois bugs, e um deles trava tudo.',
      detail: `Se o código nunca terminar, o jogo o interrompe em ${RUN_LIMITS.timeoutMs / 1000} s e o Dealer avisa que travou: isso é uma pista, não uma punição. Dicas só até o nível ${BOSS_MAX_LADDER}.`,
      target: T('editor'),
      ack: true,
      mood: 'boss',
      completeOn: ['ack', 'resolved'],
    };
  }

  if (!t.executed && !done.has('editor')) {
    return {
      id: 'editor',
      title: 'O editor',
      text: 'Resolva o desafio usando Python. Primeiro teste sua solução.',
      detail:
        'Executar roda os testes visíveis e mostra o resultado. Não custa pontos, fichas nem vidas. Se der erro, o Dealer explica a causa.',
      target: `${T('editor')}, ${T('run')}`,
      ack: false,
      action: 'Escreva algo e toque em Executar',
      mood: 'thinking',
      completeOn: ['executed'],
    };
  }

  if (!done.has('deliver')) {
    return {
      id: 'deliver',
      title: 'Executar × Entregar',
      text: 'Executar é testar sua solução. Entregar é assumir o risco e colocar a solução na mesa.',
      detail: `Entregar roda também os testes ocultos. Uma entrega errada custa ${pct(FAIL_PENALTY)}% de precisão; só uma entrega aprovada fecha a mesa. Se algum teste falhou, leia o Dealer e execute de novo: é grátis.`,
      target: T('deliver'),
      ack: false,
      action: 'Quando os testes passarem, toque em Entregar',
      mood: 'idle',
      completeOn: ['resolved'],
    };
  }

  if (run.history.length >= 1 && !done.has('hint')) {
    const costs = [0, 1, 4].map((level) => hintCost(challenge, level)?.label ?? '');
    return {
      id: 'hint',
      title: 'Dicas',
      text: 'Travou? Peça ajuda ao Dealer. O custo aparece no botão antes de você pedir.',
      detail: `Pergunta: ${costs[0]}. Cada nível seguinte: ${costs[1]}. Explicação: ${costs[2]}. A explicação só abre depois de execuções ou entregas com falha.`,
      target: T('hint'),
      ack: true,
      mood: 'idle',
      completeOn: ['ack', 'resolved'],
    };
  }
  return null;
}

function lessonForReward(run: RunState, done: Set<LessonId>): Lesson | null {
  const outcome = run.encounter?.outcome;
  if (!outcome) return null;
  const wager = RISK_LEVELS[outcome.risk].wager;
  if (outcome.bust) {
    if (done.has('bust')) return null;
    const why = outcome.forfeit
      ? 'Você desistiu do desafio.'
      : `Sua pontuação (${outcome.score.total}) ficou abaixo da meta (${outcome.target}).`;
    const cause = outcome.forfeit
      ? ''
      : outcome.score.precision < 1
        ? ' Entregas erradas e dicas pagas baixaram a precisão.'
        : ' O código passou, mas a mão rendeu pouco: cartas que casam com o desafio dobram o efeito.';
    return {
      id: 'bust',
      title: 'Bust',
      text: `${why} Isso é um Bust.${cause}`,
      detail: `Consequência: −1 vida${wager > 0 ? ` e a aposta de ${wager} fichas` : ''}. Vidas restantes: ${run.lives}. Com 0 vidas a run termina; o Seguro de mesa da loja compra +1 vida por ${LIFE_PRICE} fichas.`,
      target: `${T('lives')}, ${T('continue')}`,
      ack: false,
      action: 'Toque em Continuar',
      mood: 'serious',
      completeOn: ['claimed'],
    };
  }
  if (done.has('reward')) return null;
  const before = outcome.chipsBefore;
  const after = outcome.chipsAfter;
  return {
    id: 'reward',
    title: 'Aposta → solução → resultado → recompensa',
    text: `Você pontuou ${outcome.score.total} para uma meta de ${outcome.target} e ganhou ${outcome.chipsGained} fichas${
      before !== undefined && after !== undefined ? ` (saldo ${before} → ${after})` : ''
    }.`,
    detail: `${
      wager > 0 ? `A aposta de ${wager} fichas voltou. ` : 'Em SAFE nada ficou em jogo. '
    }Vidas: ${run.lives}; só um Bust tira uma. Sequência: ×${streakMultiplier(run.streak).toFixed(2)} (vitórias seguidas). ${
      outcome.rewardOptions.length > 0
        ? `Escolha uma carta para o baralho, ou pule por +${SKIP_REWARD_CHIPS} fichas.`
        : `Não há cartas novas para você agora: ao continuar, a casa paga +${SKIP_REWARD_CHIPS} fichas.`
    }`,
    target: `${T('rewards')}, ${T('lives')}`,
    ack: false,
    action: outcome.rewardOptions.length > 0 ? 'Escolha uma carta ou pule' : 'Toque em Continuar',
    mood: 'success',
    completeOn: ['claimed'],
  };
}

function lessonForShop(run: RunState, done: Set<LessonId>, t: TutorialState): Lesson | null {
  if (done.has('shop') || !run.shop) return null;
  const cheapest = run.shop.offers.length
    ? Math.min(...run.shop.offers.map((id) => getCard(id).price))
    : null;
  const step = upgradeStep();
  const canBuy = cheapest !== null && run.chips >= cheapest;
  const nextStep = t.bought
    ? 'Compra feita: a carta já está no baralho e pode aparecer na sua mão nas próximas mesas. Quando terminar, volte à mesa.'
    : canBuy
      ? `Você tem ${run.chips} fichas: compre uma carta.`
      : cheapest === null
        ? 'A prateleira está vazia agora; você pode rolar de novo ou seguir.'
        : `Você tem ${run.chips} fichas e a carta mais barata custa ${cheapest}: ganhe mais nas próximas mesas.`;
  return {
    id: 'shop',
    title: 'A loja',
    text: 'Suas fichas também servem para melhorar seu baralho nas próximas mesas.',
    detail: `Comprar adiciona uma carta ao baralho. Melhorar soma +${step.chips} fichas e +${step.mult.toFixed(2)} de multiplicador à carta. Remover tira cartas fracas. Rolar de novo troca as ofertas. O Seguro de mesa dá +1 vida por ${LIFE_PRICE} fichas. ${nextStep}`,
    target: t.bought ? T('leave-shop') : T('shop-offers'),
    ack: false,
    action: canBuy && !t.bought ? 'Compre uma carta' : 'Volte à mesa quando quiser',
    mood: 'idle',
    completeOn: ['left-shop'],
  };
}

function ending(run: RunState): Lesson {
  const won = run.status === 'won';
  return {
    id: 'end',
    title: 'Fim da primeira run',
    text: won
      ? 'Você terminou sua primeira run. Agora você conhece as regras da mesa.'
      : run.endReason === 'abandoned'
        ? 'Você abandonou sua primeira run. Quando quiser, comece outra.'
        : 'Você perdeu sua primeira run. Mas agora você já conhece a mesa.',
    detail: 'O guia termina aqui: as próximas runs começam direto, sem tutorial.',
    target: T('new-run'),
    ack: false,
    mood: won ? 'success' : 'serious',
    completeOn: [],
  };
}

/** Só conta como "execução" para o tutorial o que passou pelo executor Python e voltou com um relatório. */
export function isRealExecution(report: ExecutionReport): boolean {
  return report.status !== 'rejected' && report.status !== 'crash';
}

/** A dica do Dealer que vale agora, ou null. Depende só do estado real da run. */
export function currentLesson(run: RunState | null, tutorialCompleted = false): Lesson | null {
  if (!run) return tutorialCompleted ? null : welcome();
  const t = run.tutorial;
  if (!t) return null;
  const done = new Set(t.done);
  switch (run.status) {
    case 'map':
      return lessonForMap(run, done);
    case 'table':
      return lessonForTable(run, done);
    case 'challenge':
      return lessonForChallenge(run, done, t);
    case 'reward':
      return lessonForReward(run, done);
    case 'shop':
      return lessonForShop(run, done, t);
    case 'won':
    case 'lost':
      return ending(run);
  }
}

/**
 * Trava só o que a lição pede de verdade, e nunca por muito tempo:
 * - `start`: abrir uma carta da mão antes de começar (sempre possível, a mão tem 5 cartas);
 * - `deliver`: executar antes de entregar. Depois de 3 tentativas de execução o travamento cai, para que
 *   uma falha do executor nunca deixe o jogador sem saída.
 */
export function tutorialGate(run: RunState | null): 'start' | 'deliver' | null {
  if (!run?.tutorial) return null;
  const lesson = currentLesson(run);
  if (lesson?.id === 'cards') return 'start';
  if (lesson?.id === 'editor' && (run.encounter?.runsUsed ?? 0) < 3) return 'deliver';
  return null;
}

/** Aplica um evento real: registra as ações e conclui a lição que estava ativa, se ele a conclui. */
export function reduceTutorial(run: RunState, event: TutorialEvent): TutorialState | null {
  const t = run.tutorial;
  if (!t) return null;
  const lesson = currentLesson(run);
  const next: TutorialState = { ...t, done: [...t.done] };
  if (event.kind === 'inspect') next.inspected = true;
  if (event.kind === 'executed') next.executed = true;
  if (event.kind === 'bought') next.bought = true;
  // As lições da tela do desafio terminam junto com o desafio, mesmo que o jogador as tenha pulado.
  if (event.kind === 'resolved' && run.status === 'challenge') {
    const finished: LessonId[] = ['editor', 'deliver'];
    if (run.history.length >= 1) finished.push('hint');
    if (run.encounter && getChallenge(run.encounter.challengeId).boss) finished.push('boss-code');
    for (const id of finished) if (!next.done.includes(id)) next.done.push(id);
  }
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
  return next;
}
