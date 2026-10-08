'use client';

import { Dealer } from '@/components/dealer/Dealer';
import { TableEnvironment } from '@/components/tables/TableEnvironment';
import { ComboCallout } from '../ComboCallout';
import { DealerDialogue } from '@/components/dealer/DealerDialogue';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { getChallenge } from '@/content/challenges';
import { tableForLayer } from '@/content/tables';
import { reactToOutcome } from '@/engine/dealer';
import { cardsUnlockedBetween } from '@/engine/progression';
import { CARDS, getCard, RARITY_LABEL } from '@/engine/cards';
import { RISK_LEVELS, SKIP_REWARD_CHIPS } from '@/engine/run';
import { useGame } from '../GameProvider';

function Row({
  label,
  value,
  tone = 'text-ivory',
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="table-label !tracking-[0.22em]">{label}</dt>
      <span
        aria-hidden="true"
        className="flex-1 translate-y-[-3px] border-b border-dotted border-white/15"
      />
      <dd className={`font-display text-xl font-black tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'gold' | 'red' }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-[0.7rem] font-bold tracking-[0.2em] uppercase ring-1 ${tone === 'gold' ? 'bg-gold/10 text-gold-light ring-gold/50' : 'bg-crimson/30 text-crimson-hot ring-crimson-hot'}`}
    >
      {children}
    </span>
  );
}

export function ResultScreen() {
  const { state, dispatch } = useGame();
  const run = state.run;
  const encounter = run?.encounter;
  const outcome = encounter?.outcome;
  if (!run || !encounter || !outcome) return null;

  const challenge = getChallenge(encounter.challengeId);
  const { score } = outcome;
  const bust = outcome.bust;
  const ratio = Math.min(1.5, score.total / outcome.target);
  const riskDef = RISK_LEVELS[outcome.risk];
  const stakeLabel =
    outcome.risk === 'safe'
      ? null
      : bust
        ? `${riskDef.label}: ${outcome.stakeDelta}`
        : `${riskDef.label} ×${riskDef.multiplier.toFixed(1)}`;
  const table = tableForLayer(run.layerIndex);
  const reaction = reactToOutcome(challenge, outcome);
  const isBossRetry = bust && challenge.boss && run.lives > 0;
  const allUnlocked = CARDS.every((card) => card.unlockLevel <= run.unlockLevel);

  return (
    <div className="screen-enter mx-auto max-w-4xl">
      <TableEnvironment table={table} feltHeight="45%">
        <div className="grid gap-4 p-4 pt-2 sm:p-6 sm:pt-2 md:grid-cols-[auto_minmax(0,1fr)] md:items-end">
          <div className="hidden md:block">
            <Dealer
              mood={reaction.mood}
              tone={table.tone}
              lamp={table.scene.lamp}
              className="h-44 w-[8.8rem]"
            />
          </div>
          <section
            aria-labelledby="resultado-titulo"
            className={`panel p-6 sm:p-8 ${bust ? 'ring-2 ring-crimson-hot/70' : 'ring-1 ring-white/20'}`}
          >
            <div className="text-center">
              <p className="table-label">{challenge.title}</p>
              <h1
                id="resultado-titulo"
                className={`mt-2 font-display text-4xl font-black tracking-wide sm:text-5xl ${bust ? 'text-crimson-hot' : 'gold-text'}`}
              >
                {bust ? 'BUST' : 'MÃO VENCEDORA'}
              </h1>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {outcome.jackpot && <Badge tone="gold">Jackpot · entrega de primeira</Badge>}
                {outcome.highRoll && <Badge tone="gold">High Roll · 2× a meta</Badge>}
                {score.rank.id === 'royal-flush' && <Badge tone="gold">Royal Hand</Badge>}
                {outcome.forfeit && <Badge tone="red">Desistência</Badge>}
                {bust && <Badge tone="red">−1 vida</Badge>}
              </div>
            </div>

            <DealerDialogue
              className="mx-auto mt-6 max-w-md"
              text={reaction.text}
              kind={reaction.kind}
              mood={reaction.mood}
              tone={table.tone}
              avatar={false}
            />

            {!outcome.forfeit && (
              <ul
                className="mx-auto mt-6 max-w-sm space-y-1.5 text-sm"
                aria-label="Testes aprovados"
              >
                {challenge.tests.map((test, index) => (
                  <li key={test.name} className="flex items-center gap-2 text-ivory/90">
                    <span aria-hidden="true" className="font-bold text-win">
                      ✓
                    </span>
                    {test.hidden
                      ? `Teste oculto ${index + 1 - challenge.tests.filter((t) => !t.hidden).length}`
                      : test.name}
                  </li>
                ))}
              </ul>
            )}

            {score.combos.length > 0 && !outcome.forfeit && (
              <div className="mx-auto mt-6 max-w-md">
                <ComboCallout combos={score.combos} />
              </div>
            )}

            {run.tutorial && (
              <ol
                aria-label="Aposta, solução, resultado e recompensa"
                className="mx-auto mt-7 grid max-w-md grid-cols-4 gap-2 text-center"
              >
                {[
                  ['Aposta', riskDef.wager > 0 ? `${riskDef.wager} fichas` : 'nada (SAFE)'],
                  ['Solução', outcome.forfeit ? 'desistência' : `${score.total} pts`],
                  ['Resultado', bust ? 'Bust' : 'Vitória'],
                  [
                    'Recompensa',
                    bust
                      ? outcome.stakeDelta === 0
                        ? '0 fichas'
                        : `−${Math.abs(outcome.stakeDelta)} fichas`
                      : `+${outcome.chipsGained} fichas`,
                  ],
                ].map(([label, value], index) => (
                  <li key={label} className="rounded-lg bg-black/30 px-1 py-2 ring-1 ring-white/10">
                    <span className="table-label block !text-[0.6rem]">
                      {index > 0 && <span aria-hidden="true">→ </span>}
                      {label}
                    </span>
                    <span className="mt-1 block text-xs font-bold text-ivory tabular-nums">
                      {value}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            <dl className="mx-auto mt-7 max-w-md space-y-3">
              <Row
                label={bust ? 'Pontuação (não soma)' : 'Pontuação'}
                value={bust ? `${score.total}` : `+${score.total}`}
                tone={bust ? 'text-crimson-hot' : 'text-ivory'}
              />
              <Row label="Sequência" value={`×${score.streakMult.toFixed(2)}`} tone="text-win" />
              <Row label="Precisão" value={`×${score.precision.toFixed(2)}`} />
              <Row
                label="Fichas"
                value={
                  bust
                    ? outcome.stakeDelta === 0
                      ? '0'
                      : `−${Math.abs(outcome.stakeDelta)}`
                    : `+${outcome.chipsGained}`
                }
                tone="text-gold-light"
              />
              <Row label="XP" value={`+${outcome.xpGained}`} />
            </dl>
            {stakeLabel && (
              <p className="mt-2 text-center text-xs text-ivory-dim">
                {stakeLabel}
                {!bust && ' · a aposta voltou'}
              </p>
            )}
            {outcome.chipsBefore !== undefined && outcome.chipsAfter !== undefined && (
              <p className="mt-1 text-center text-xs text-ivory-dim">
                Saldo de fichas: {outcome.chipsBefore} →{' '}
                {outcome.chipsAfter - outcome.chipsBefore >= 0 ? '+' : '−'}
                {Math.abs(outcome.chipsAfter - outcome.chipsBefore)} → {outcome.chipsAfter}
              </p>
            )}

            <div className="mx-auto mt-6 max-w-md">
              <div
                role="img"
                aria-label={`Pontuação em ${Math.round((score.total / outcome.target) * 100)}% da meta`}
                className="relative h-3 overflow-hidden rounded-full bg-black/60 ring-1 ring-white/25"
              >
                <div
                  className={`h-full ${bust ? 'bg-crimson-hot' : 'bg-win'}`}
                  style={{ width: `${(ratio / 1.5) * 100}%` }}
                />
                <div className="absolute inset-y-0 left-[66.6%] w-px bg-ivory" />
              </div>
              <p className="mt-1.5 text-center text-xs text-ivory-dim">
                Meta {outcome.target} pts · você fez {score.total}
              </p>
            </div>

            <details className="mx-auto mt-6 max-w-md text-sm text-ivory-dim">
              <summary className="flex min-h-10 cursor-pointer items-center justify-center text-center text-xs tracking-widest uppercase hover:text-ivory">
                Como a pontuação foi calculada
              </summary>
              <ul className="mt-3 space-y-1 font-mono text-xs">
                <li>Base do desafio: {score.basePoints}</li>
                <li>Fichas das cartas: +{score.cardChips}</li>
                <li>
                  Multiplicador: 1 + cartas {score.cardMult.toFixed(2)} + {score.rank.name}{' '}
                  {score.rank.mult.toFixed(2)} + combos de conceitos {score.comboMult.toFixed(2)} =
                  ×{score.mult.toFixed(2)}
                </li>
                {score.combos.map(({ combo, bonus }) => (
                  <li key={combo.id}>
                    Combo de conceitos {combo.name}: +{bonus.toFixed(2)}
                  </li>
                ))}
                <li>Sequência de vitórias: ×{score.streakMult.toFixed(2)}</li>
                <li>Precisão (entregas erradas e dicas): ×{score.precision.toFixed(2)}</li>
              </ul>
            </details>

            {state.levelUp && (
              <p
                className="mx-auto mt-6 max-w-md rounded-lg bg-white/8 px-4 py-3 text-center text-sm text-ivory ring-1 ring-white/25"
                role="status"
              >
                Subiu de nível! Você é nível <strong>{state.levelUp.to}</strong>.{' '}
                {(() => {
                  const unlocked = cardsUnlockedBetween(state.levelUp.from, state.levelUp.to);
                  return unlocked.length > 0
                    ? `Passam a aparecer nas lojas e recompensas: ${unlocked.map((c) => c.name).join(', ')}.`
                    : 'Nenhuma carta nova neste nível.';
                })()}
              </p>
            )}
          </section>
        </div>
      </TableEnvironment>

      {bust ? (
        <div className="mt-8 flex flex-col items-center gap-2">
          <Button
            variant="crimson"
            data-tutorial="continue"
            onClick={() => dispatch({ type: 'claim', cardId: null })}
          >
            {run.lives <= 0 ? 'Encerrar run' : isBossRetry ? 'Pedir revanche' : 'Continuar'}
          </Button>
          {isBossRetry && (
            <p className="text-xs text-ivory-dim">O boss não sai da mesa até você vencê-lo.</p>
          )}
        </div>
      ) : (
        <section
          className="mt-10 text-center"
          aria-labelledby="recompensa-titulo"
          data-tutorial="rewards"
        >
          {outcome.rewardOptions.length > 0 ? (
            <>
              <h2 id="recompensa-titulo" className="table-label">
                Escolha uma carta de recompensa
              </h2>
              <ul className="mt-5 flex flex-wrap items-end justify-center gap-5">
                {outcome.rewardOptions.map((id, index) => (
                  <li key={id} className="flex flex-col items-center gap-2">
                    <PlayingCard
                      cardId={id}
                      size="md"
                      dealDelayMs={index * 120}
                      onClick={() => dispatch({ type: 'claim', cardId: id })}
                    />
                    <span className="text-xs text-ivory-dim">
                      {RARITY_LABEL[getCard(id).rarity]}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button variant="ghost" onClick={() => dispatch({ type: 'claim', cardId: null })}>
                  <Chip tone="gold" className="!w-6" /> Pular · +{SKIP_REWARD_CHIPS} fichas
                </Button>
                <p className="mt-2 text-xs text-ivory-dim">
                  Escolher uma carta é opcional: pular dá fichas no lugar dela.
                </p>
              </div>
            </>
          ) : challenge.boss ? (
            <>
              <h2 id="recompensa-titulo" className="table-label">
                O boss caiu
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ivory-dim">
                Vencer o boss encerra a run, então não há carta para escolher.
              </p>
              <div className="mt-6">
                <Button
                  data-tutorial="continue"
                  onClick={() => dispatch({ type: 'claim', cardId: null })}
                >
                  Concluir run
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 id="recompensa-titulo" className="table-label">
                Nenhuma carta nova disponível
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ivory-dim">
                {allUnlocked
                  ? 'Você já tem todas as cartas do jogo.'
                  : 'Você já tem todas as cartas que o seu nível libera. Suba de nível para desbloquear mais.'}{' '}
                No lugar da carta, a casa paga +{SKIP_REWARD_CHIPS} fichas.
              </p>
              <div className="mt-6">
                <Button
                  data-tutorial="continue"
                  onClick={() => dispatch({ type: 'claim', cardId: null })}
                >
                  <Chip tone="gold" className="!w-6" /> Continuar · +{SKIP_REWARD_CHIPS} fichas
                </Button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
