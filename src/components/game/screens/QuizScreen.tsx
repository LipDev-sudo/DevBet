'use client';

import { Dealer } from '@/components/dealer/Dealer';
import { DealerDialogue } from '@/components/dealer/DealerDialogue';
import { TableEnvironment } from '@/components/tables/TableEnvironment';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { RichText } from '@/components/ui/RichText';
import { getQuestion } from '@/content/quiz';
import { getTableByArea } from '@/content/tables';
import { ANTES, handLevel, playedCards } from '@/engine/blind';
import { briefQuestion, reactToWrong, restingMood } from '@/engine/dealer';
import { FAIL_PENALTY, previewPlay } from '@/engine/handscore';
import { playSfx } from '@/lib/sfx';
import { useGame } from '../GameProvider';

const LETTERS = ['A', 'B', 'C', 'D'];

/** A pergunta rápida da mão: acertar pontua a mão; cada erro tira precisão e some com a alternativa. */
export function QuizScreen() {
  const { state, dispatch } = useGame();
  const run = state.run;
  const play = run?.round?.play ?? null;
  if (!run || !play) return null;

  const question = getQuestion(play.questionId);
  const hand = playedCards(run);
  const preview = previewPlay(hand, [question.card], handLevel(run, previewPlay(hand, []).rank.id));
  const table = getTableByArea(ANTES[run.ante]?.areaId ?? 'fundamentos');
  const isBoss = question.id.startsWith('q-boss');
  const wrongCount = play.wrong.length;
  const penalty = Math.round(FAIL_PENALTY * 100);
  const mood = wrongCount > 0 ? reactToWrong(wrongCount).mood : restingMood(table.tone, isBoss);
  const line =
    wrongCount > 0
      ? reactToWrong(wrongCount)
      : { mood, kind: 'brief' as const, text: briefQuestion(isBoss) };

  return (
    <div className="screen-focus space-y-4">
      <TableEnvironment table={table} feltHeight="8.5rem" inlay={false}>
        <div className="grid gap-4 p-4 pt-2 sm:p-5 sm:pt-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className={`table-label ${isBoss ? '!text-crimson-hot' : ''}`}>
              Pergunta da mão · {question.card.toUpperCase()}
            </p>
            <h1
              id="pergunta-titulo"
              className={`mt-2 text-xl leading-snug font-black tracking-tight sm:text-2xl ${isBoss ? 'text-crimson-hot' : 'text-ivory'}`}
            >
              <RichText text={question.prompt} />
            </h1>
            {question.code && (
              <pre
                aria-label="Código da pergunta"
                className="mt-3 overflow-x-auto rounded-lg bg-black/55 p-4 font-mono text-sm leading-relaxed text-ivory ring-1 ring-white/10"
              >
                {question.code}
              </pre>
            )}
          </div>

          <div className="flex flex-col items-center lg:w-[26rem]">
            <div className="hidden lg:block">
              <Dealer
                mood={line.mood}
                tone={table.tone}
                lamp={table.scene.lamp}
                className="h-36 w-[7.2rem]"
              />
            </div>
            <ul className="relative flex gap-1.5 lg:-mt-9" aria-label="Cartas jogadas">
              {hand.map((card) => (
                <li key={card.uid}>
                  <PlayingCard
                    cardId={card.cardId}
                    upgrade={card.upgrade}
                    size="xs"
                    boosted={card.cardId === question.card}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ivory-dim">
              <span className="font-bold text-ivory">{preview.rank.name}</span> · {preview.chips}{' '}
              fichas × {preview.mult} mult
              <span className="sr-only"> (mínimo, sem jokers)</span>
            </p>
          </div>
        </div>
      </TableEnvironment>

      <section
        aria-labelledby="pergunta-titulo"
        data-tutorial="quiz"
        data-question={question.id}
        className="space-y-3"
      >
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Alternativas">
          {question.options.map((option, index) => {
            const eliminated = play.wrong.includes(index);
            return (
              <li key={option}>
                <button
                  type="button"
                  aria-disabled={eliminated}
                  onClick={() => {
                    if (eliminated) return;
                    if (index !== question.answer) playSfx('error');
                    dispatch({ type: 'answer', option: index });
                  }}
                  className={`panel flex min-h-14 w-full items-start gap-3 rounded-lg p-4 text-left transition-shadow ${
                    eliminated
                      ? 'cursor-not-allowed line-through opacity-40'
                      : 'hover:ring-2 hover:ring-ivory/70'
                  }`}
                >
                  <span className="font-display text-lg font-black text-gold">
                    {LETTERS[index]}
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-relaxed text-ivory sm:text-base">
                    <RichText text={option} />
                    {eliminated && <span className="sr-only"> (errada)</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <DealerDialogue
          avatar={false}
          mood={line.mood}
          kind={wrongCount > 0 ? line.kind : undefined}
          text={line.text}
          nudge={
            wrongCount > 0
              ? `Precisão atual: ${Math.max(40, 100 - penalty * wrongCount)}% da pontuação da mão.`
              : `Cada resposta errada tira ${penalty}% da pontuação da mão.`
          }
        />
      </section>
    </div>
  );
}
