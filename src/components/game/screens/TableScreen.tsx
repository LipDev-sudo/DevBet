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
import { BOSS_MAX_LADDER } from '@/engine/hints';
import { canRedraw, handCards, RISK_LEVELS, RISK_ORDER, riskAvailability } from '@/engine/run';
import { computeScore, FAIL_PENALTY, previewHand, streakMultiplier } from '@/engine/scoring';
import { TOPIC_LABEL } from '@/engine/types';
import { playSfx } from '@/lib/sfx';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { cardEffect, getCard, RARITY_LABEL } from '@/engine/cards';
import { tutorialGate } from '@/engine/tutorial';
import type { CardId } from '@/engine/types';
import { useGame } from '../GameProvider';

export function TableScreen() {
  const { state, dispatch } = useGame();
  const run = state.run;
  const encounter = run?.encounter;
  const [inspected, setInspected] = useState<CardId | null>(null);
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
  const redraw = canRedraw(run);
  const gate = tutorialGate(run);
  const inspectedCard = inspected ? getCard(inspected) : null;
  const inspectedBoosted = inspected ? challenge.concepts.includes(inspected) : false;
  const inspectedEffect = inspectedCard ? cardEffect(inspectedCard, 0, inspectedBoosted) : null;

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
            data-tutorial="hand"
          >
            {hand.map((card, index) => (
              <PlayingCard
                key={`${card.uid}-${encounter.redrawsLeft}`}
                cardId={card.cardId}
                upgrade={card.upgrade}
                size="md"
                boosted={preview.lines.find((l) => l.uid === card.uid)?.boosted}
                dealDelayMs={index * 90}
                onClick={() => {
                  setInspected(card.cardId);
                  dispatch({ type: 'tutorial', event: { kind: 'inspect' } });
                }}
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
              <div className="flex justify-between gap-3">
                <dt className="text-ivory-dim">Meta da mesa</dt>
                <dd className="font-bold text-ivory tabular-nums">{challenge.target} pts</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ivory-dim">Sua estimativa</dt>
                <dd
                  className={`font-bold tabular-nums ${ratio >= 1 ? 'text-win' : 'text-crimson-hot'}`}
                >
                  ~{estimate} pts
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ivory-dim">Multiplicador</dt>
                <dd className="text-right font-bold text-ivory tabular-nums">
                  ×{preview.mult.toFixed(2)} · sequência ×{streakMultiplier(run.streak).toFixed(2)}
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
              Multiplicador = 1 + cartas {preview.sumMult.toFixed(2)} + mão{' '}
              {preview.rank.mult.toFixed(2)} + combos de conceitos {preview.comboMult.toFixed(2)}.
            </p>
            <p className="mt-2 text-xs text-ivory-dim">
              Estimativa para uma entrega correta de primeira, sem dicas. Cada entrega errada custa{' '}
              {Math.round(FAIL_PENALTY * 100)}% e cada dica paga custa mais; Executar para testar
              não custa pontos.
            </p>
          </div>

          <div className="panel rounded-lg p-5">
            <p className="table-label">Risco · fichas virtuais</p>
            <div
              className="mt-3 space-y-2"
              role="radiogroup"
              aria-label="Nível de risco"
              data-tutorial="risk"
              onKeyDown={(event) => {
                const step =
                  event.key === 'ArrowRight' || event.key === 'ArrowDown'
                    ? 1
                    : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                      ? -1
                      : 0;
                if (!step) return;
                event.preventDefault();
                const at = RISK_ORDER.indexOf(encounter.risk);
                for (let i = 1; i <= RISK_ORDER.length; i++) {
                  const next =
                    RISK_ORDER[(at + step * i + RISK_ORDER.length * i) % RISK_ORDER.length];
                  if (next && riskAvailability(challenge.difficulty, next, run.chips).ok) {
                    dispatch({ type: 'risk', risk: next });
                    document.getElementById(`risk-${next}`)?.focus();
                    break;
                  }
                }
              }}
            >
              {RISK_ORDER.map((level) => {
                const def = RISK_LEVELS[level];
                const availability = riskAvailability(challenge.difficulty, level, run.chips);
                const active = encounter.risk === level;
                return (
                  <button
                    key={level}
                    type="button"
                    id={`risk-${level}`}
                    role="radio"
                    aria-checked={active}
                    tabIndex={active ? 0 : -1}
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
                        {!availability.ok
                          ? availability.reason
                          : def.wager === 0
                            ? 'Nada em jogo'
                            : `Em jogo: ${def.wager} fichas (de ${run.chips})`}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-mono text-sm font-bold text-gold-light">
                        ×{def.multiplier.toFixed(1)}
                      </span>
                      <span className="block text-xs text-ivory-dim">
                        +{Math.round(challenge.chipReward * def.multiplier)} fichas
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ivory-dim">
              Se acertar: <strong className="text-gold-light">+{winChips} fichas</strong>
              {risk.wager > 0 && <> e a aposta de {risk.wager} volta</>} (Jackpot e High Roll somam
              bônus). Bust:{' '}
              <strong className="text-crimson-hot">
                {risk.wager > 0 ? `−${risk.wager} fichas` : 'nenhuma ficha perdida'}
              </strong>{' '}
              e −1 vida. O risco não muda a meta nem a chance de Bust: só quanto você ganha e quanto
              pode perder.
              {challenge.difficulty < 2 && ' Riscos maiores abrem a partir da mesa LOGIC.'}
            </p>
          </div>

          {isBoss && (
            <div className="panel rounded-lg p-5 ring-1 ring-crimson-hot/40">
              <p className="table-label !text-crimson-hot">Regras do boss</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-ivory-dim">
                <li>
                  O Bust não tira você da mesa: o boss exige revanche, e cada tentativa custa uma
                  vida.
                </li>
                <li>
                  O Dealer só dá dicas até o nível {BOSS_MAX_LADDER}; depois, só a solução
                  explicada.
                </li>
                <li>Vencer o boss encerra a run com vitória e rende {challenge.xp} XP.</li>
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              className="!py-4"
              data-tutorial="start-challenge"
              disabled={gate === 'start'}
              title={gate === 'start' ? 'Primeiro toque em uma carta da sua mão.' : undefined}
              onClick={() => dispatch({ type: 'start' })}
              variant={isBoss ? 'crimson' : 'brass'}
            >
              Começar desafio
            </Button>
            <Button
              variant="ghost"
              disabled={!redraw.ok}
              title={redraw.ok ? undefined : redraw.reason}
              onClick={() => dispatch({ type: 'redraw' })}
            >
              Trocar mão ({encounter.redrawsLeft})
            </Button>
            {!redraw.ok && encounter.redrawsLeft > 0 && (
              <p className="text-center text-xs text-ivory-dim">{redraw.reason}</p>
            )}
          </div>
        </aside>
      </div>

      <Modal
        open={inspectedCard !== null}
        onClose={() => setInspected(null)}
        title={inspectedCard?.name ?? ''}
      >
        {inspectedCard && inspectedEffect && (
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <PlayingCard
              cardId={inspectedCard.id}
              upgrade={hand.find((c) => c.cardId === inspectedCard.id)?.upgrade ?? 0}
              size="md"
              boosted={inspectedBoosted}
            />
            <div>
              <p className="table-label">{RARITY_LABEL[inspectedCard.rarity]}</p>
              <p className="mt-2 text-sm leading-relaxed text-ivory/90">{inspectedCard.concept}</p>
              <p className="mt-3 text-sm leading-relaxed text-ivory-dim">
                Efeito neste desafio: +{inspectedEffect.chips} fichas e +
                {inspectedEffect.mult.toFixed(2)} de multiplicador
                {inspectedBoosted
                  ? ' (dobrado: o desafio usa este conceito).'
                  : '. Dobra em desafios que usam este conceito.'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
