'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { RichText } from '@/components/ui/RichText';
import { getQuestion } from '@/content/quiz';
import { deckEntry, currentBlind } from '@/engine/blind';
import { playSfx } from '@/lib/sfx';
import { useGame } from '../GameProvider';
import { JokerRow } from './RoundScreen';

const STEP_MS = 480;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** A pontuação da mão, passo a passo: mão, cada carta, combos e jokers, fichas × multiplicador. */
export function ScoreScreen() {
  const { state, dispatch } = useGame();
  const run = state.run;
  const round = run?.round ?? null;
  const last = round?.last ?? null;
  const stepCount = last?.score.steps.length ?? 0;
  const [revealedRaw, setRevealed] = useState(0);
  // Com "reduzir movimento" o placar já aparece completo, sem animação.
  const [instant] = useState(() => prefersReducedMotion());
  const sfxRef = useRef(false);
  const continueRef = useRef<HTMLButtonElement>(null);
  const noAnimation = instant;
  const revealed = noAnimation ? stepCount : revealedRaw;

  useEffect(() => {
    if (!last || noAnimation) return;
    const timer = setInterval(() => {
      setRevealed((n) => {
        if (n >= stepCount) {
          clearInterval(timer);
          return n;
        }
        return n + 1;
      });
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [last, stepCount, noAnimation]);

  const done = revealed >= stepCount;
  useEffect(() => {
    if (done && last && !sfxRef.current) {
      sfxRef.current = true;
      playSfx('correct');
    }
  }, [done, last]);

  if (!run || !round || !last) return null;
  const score = last.score;
  const question = getQuestion(last.questionId);
  const def = currentBlind(run);
  const shown = score.steps[Math.max(0, Math.min(revealed, stepCount) - 1)];
  const active = done ? undefined : score.steps[revealed - 1];
  const before = round.roundScore - score.total;
  const shownRound = done ? round.roundScore : before;
  const cleared = round.roundScore >= round.target;
  const out = !cleared && round.handsLeft <= 0;
  const played = last.uids.map((uid) => deckEntry(run, uid));
  const total = score.total;

  return (
    <div className="screen-focus mx-auto max-w-4xl space-y-6">
      <header className="text-center">
        <p className="table-label">
          {def.name} · {question.topic}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-ivory sm:text-4xl">
          {score.rank.name}
        </h1>
      </header>

      <JokerRow run={run} activeId={active?.jokerId ?? null} />

      <section
        data-tutorial="score"
        aria-label="Pontuação da mão"
        className="panel rounded-lg p-5 text-center"
      >
        <ul className="mb-5 flex flex-wrap justify-center gap-3" aria-label="Cartas jogadas">
          {played.map((card) => (
            <li
              key={card.uid}
              className={active?.uid === card.uid ? 'score-pop' : undefined}
              style={active?.uid === card.uid ? { transform: 'translateY(-10px)' } : undefined}
            >
              <PlayingCard
                cardId={card.cardId}
                upgrade={card.upgrade}
                size="sm"
                boosted={card.cardId === question.card}
                selected={active?.uid === card.uid}
              />
            </li>
          ))}
        </ul>

        <>
          <div className="flex items-center justify-center gap-3 font-mono text-3xl font-black sm:text-5xl">
            <span
              key={`c${shown?.chips ?? 0}`}
              className="score-pop rounded-lg bg-sky-900/60 px-4 py-2 text-sky-200 tabular-nums"
            >
              {shown?.chips ?? 0}
            </span>
            <span className="text-ivory-dim">×</span>
            <span
              key={`m${shown?.mult ?? 0}`}
              className="score-pop rounded-lg bg-wine/60 px-4 py-2 text-crimson-hot tabular-nums"
            >
              {shown?.mult ?? 0}
            </span>
          </div>
          <p className="mt-3 min-h-6 text-sm text-ivory" role="status" aria-live="polite">
            {active
              ? `${active.label}${active.debuffed ? ' (anulada)' : ''}${active.addChips && active.kind !== 'rank' ? ` +${active.addChips} fichas` : ''}${active.addMult && active.kind !== 'rank' ? ` +${active.addMult} mult` : ''}${active.xMult !== 1 ? ` ×${active.xMult}` : ''}`
              : `${score.rank.name}: ${score.chips} × ${score.mult}${score.precision < 1 ? ` × precisão ${score.precision}` : ''}`}
          </p>
          {done && (
            <p className="score-pop mt-2 font-display text-4xl font-black text-gold tabular-nums sm:text-6xl">
              +{total}
            </p>
          )}
        </>
      </section>

      {done && (
        <section aria-label="Explicação" className="panel rounded-lg p-4 text-left">
          <p className="table-label">
            {last.wrongAnswers === 0 ? 'Acertou de primeira' : 'Resposta certa'}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ivory">
            <RichText text={question.options[question.answer] ?? ''} />
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ivory-dim">
            <RichText text={question.explanation} />
          </p>
        </section>
      )}

      <section className="panel rounded-lg p-4" aria-label="Meta da blind">
        <div className="flex items-baseline justify-between text-sm">
          <span className="table-label">Pontos da rodada</span>
          <span className="font-mono font-bold text-ivory tabular-nums">
            {shownRound} / {round.target}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/60 ring-1 ring-white/20">
          <div
            className={`h-full transition-[width] duration-500 ${shownRound >= round.target ? 'bg-win' : 'bg-ivory'}`}
            style={{ width: `${Math.min(100, Math.round((shownRound / round.target) * 100))}%` }}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {!done && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRevealed(stepCount);
              // O botão some ao ser usado: o foco vai para o próximo passo natural (Continuar).
              setTimeout(() => continueRef.current?.focus(), 0);
            }}
          >
            Pular animação
          </Button>
        )}
        <Button
          ref={continueRef}
          data-tutorial="continue"
          disabled={!done}
          variant={cleared ? 'brass' : out ? 'crimson' : 'brass'}
          onClick={() => dispatch({ type: 'continue' })}
        >
          {cleared ? 'Blind vencida!' : out ? 'Suas mãos acabaram' : 'Continuar'}
        </Button>
      </div>
    </div>
  );
}
