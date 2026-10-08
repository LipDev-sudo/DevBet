'use client';

import { Button } from '@/components/ui/Button';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { Dealer } from '@/components/dealer/Dealer';
import { DealerDialogue } from '@/components/dealer/DealerDialogue';
import { TableEnvironment } from '@/components/tables/TableEnvironment';
import { getChallenge } from '@/content/challenges';
import { tableForLayer } from '@/content/tables';
import { ComboCallout } from '../ComboCallout';
import { briefChallenge, explainHand, restingMood } from '@/engine/dealer';
import { handCards, RISK_LEVELS, RISK_ORDER, riskAvailability } from '@/engine/run';
import { computeScore, previewHand, streakMultiplier } from '@/engine/scoring';
import { TOPIC_LABEL } from '@/engine/types';
import { playSfx } from '@/lib/sfx';
import { useEffect } from 'react';
import { useGame } from '../GameProvider';

export function TableScreen() {
  const { state, dispatch } = useGame();
  const run = state.run;
  const encounter = run?.encounter;
  const dealtKey = `${encounter?.challengeId}-${encounter?.redrawsLeft}`;
  const bossTable = encounter?.challengeId === 'boss-infinite-loop';
  useEffect(() => {
    playSfx('deal');
    if (bossTable) playSfx('boss');
  }, [dealtKey, bossTable]);
  if (!run || !encounter) return null;

  const challenge = getChallenge(encounter.challengeId);
  const hand = handCards(run);
  const preview = previewHand(hand, challenge.concepts);
  const risk = RISK_LEVELS[encounter.risk];
  const winChips = Math.round(challenge.chipReward * risk.multiplier);
  const estimate = computeScore({
    basePoints: challenge.basePoints,
    concepts: challenge.concepts,
    hand,
    streak: run.streak,
    failedSubmissions: 0,
    voluntaryHints: 0,
    solutionViewed: false,
  }).total;
  const ratio = estimate / challenge.target;
  const isBoss = Boolean(challenge.boss);
  const table = tableForLayer(run.layerIndex);

  return (
    <div className="screen-focus">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <TableEnvironment table={table} className="pb-6" feltHeight="62%">
          <div className="px-4 pt-3 text-center sm:px-8">
            <h1
              id="mesa-titulo"
              className={`text-3xl font-black tracking-tight sm:text-4xl ${isBoss ? 'text-crimson-hot' : 'text-ivory'}`}
            >
              {challenge.title}
            </h1>
            <p className={`table-label mt-1 ${isBoss ? '!text-crimson-hot' : ''}`}>
              {TOPIC_LABEL[challenge.topic]}
            </p>
          </div>

          <div className="mt-4 flex items-end justify-center gap-5 px-4">
            <div className="hidden sm:block">
              <Dealer
                mood={restingMood(table.tone, challenge)}
                tone={table.tone}
                lamp={table.scene.lamp}
                className="h-52 w-[10.4rem]"
              />
            </div>
            <DealerDialogue
              avatar={false}
              className="max-w-sm self-start sm:mt-2"
              kind="brief"
              text={briefChallenge(challenge)}
              detail={explainHand(preview)}
              mood={restingMood(table.tone, challenge)}
              tone={table.tone}
            />
          </div>

          <div
            className="relative z-10 mt-5 flex flex-wrap justify-center gap-3 px-4 sm:-mt-12 sm:gap-4"
            aria-label="Sua mão"
          >
            {hand.map((card, index) => (
              <PlayingCard
                key={`${card.uid}-${encounter.redrawsLeft}`}
                cardId={card.cardId}
                upgrade={card.upgrade}
                size="md"
                boosted={preview.lines.find((l) => l.uid === card.uid)?.boosted}
                dealDelayMs={index * 90}
              />
            ))}
          </div>

          <div className="relative z-10 mx-auto mt-6 max-w-xl space-y-3 px-4">
            <p className="text-center">
              <span className="text-lg font-black tracking-wide text-ivory">
                {preview.rank.name}
              </span>
              <span className="ml-2 font-mono text-sm text-gold-light">
                +{preview.rank.mult.toFixed(1)}
              </span>
              <span className="mt-0.5 block text-xs text-ivory-dim">
                {preview.rank.description}
              </span>
            </p>
            <ComboCallout combos={preview.combos} />
          </div>
        </TableEnvironment>

        <aside className="space-y-4" aria-label="Detalhes da mesa">
          <div className="panel rounded-lg p-5">
            <p className="table-label">O desafio</p>
            <p className="mt-2 text-sm leading-relaxed text-ivory/90">{challenge.concept}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Conceitos usados neste desafio">
              {challenge.concepts.map((id) => {
                const inHand = hand.some((card) => card.cardId === id);
                return (
                  <li
                    key={id}
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[0.7rem] ring-1 ${inHand ? 'text-gold-light ring-gold/60' : 'text-ivory-dim ring-white/15'}`}
                  >
                    {id.toUpperCase()}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-ivory-dim">
              Em dourado: conceitos que você tem na mão (efeito dobrado).
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ivory-dim">Meta da mesa</dt>
                <dd className="font-bold text-ivory tabular-nums">{challenge.target} pts</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ivory-dim">Sua estimativa</dt>
                <dd
                  className={`font-bold tabular-nums ${ratio >= 1 ? 'text-win' : 'text-crimson-hot'}`}
                >
                  ~{estimate} pts
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ivory-dim">Multiplicador</dt>
                <dd className="font-bold text-ivory tabular-nums">
                  ×{preview.mult.toFixed(2)} · combo ×{streakMultiplier(run.streak).toFixed(2)}
                </dd>
              </div>
            </dl>
            <div
              role="img"
              aria-label={`Estimativa em ${Math.round(ratio * 100)}% da meta`}
              className="mt-3 h-2 overflow-hidden rounded-full bg-black/60 ring-1 ring-white/25"
            >
              <div
                className={`h-full ${ratio >= 1 ? 'bg-win' : 'bg-crimson-hot'}`}
                style={{ width: `${Math.min(100, ratio * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-ivory-dim">
              Estimativa para um acerto de primeira, sem dicas. Erros e dicas reduzem a pontuação.
            </p>
          </div>

          <div className="panel rounded-lg p-5">
            <p className="table-label">Risco · fichas virtuais</p>
            <div className="mt-3 space-y-2" role="radiogroup" aria-label="Nível de risco">
              {RISK_ORDER.map((level) => {
                const def = RISK_LEVELS[level];
                const availability = riskAvailability(challenge.difficulty, level, run.chips);
                const active = encounter.risk === level;
                return (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!availability.ok}
                    title={availability.ok ? undefined : availability.reason}
                    onClick={() => dispatch({ type: 'risk', risk: level })}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition ${active ? 'bg-white/8 ring-2 ring-ivory' : 'ring-1 ring-ivory-dim/20 hover:ring-white/40'} ${availability.ok ? '' : 'opacity-40'}`}
                  >
                    <span>
                      <span className="block text-sm font-bold tracking-wide text-ivory">
                        {def.label}
                      </span>
                      <span className="block text-xs text-ivory-dim">
                        {def.wager === 0 ? 'Nada em jogo' : `Arrisca ${def.wager} fichas`}
                      </span>
                    </span>
                    <span className="font-mono text-sm font-bold text-gold-light">
                      ×{def.multiplier.toFixed(1)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ivory-dim">
              Vitória: <strong className="text-gold-light">+{winChips}+ fichas</strong>
              {risk.wager > 0 && <> (a aposta volta)</>}. Bust:{' '}
              <strong className="text-crimson-hot">
                {risk.wager > 0 ? `−${risk.wager} fichas` : 'nenhuma ficha perdida'}
              </strong>{' '}
              e −1 vida.
              {challenge.difficulty < 2 && ' Riscos maiores abrem a partir da mesa LOGIC.'}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              className="!py-4"
              onClick={() => dispatch({ type: 'start' })}
              variant={isBoss ? 'crimson' : 'brass'}
            >
              Começar desafio
            </Button>
            <Button
              variant="ghost"
              disabled={encounter.redrawsLeft <= 0}
              onClick={() => dispatch({ type: 'redraw' })}
            >
              Trocar mão ({encounter.redrawsLeft})
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
