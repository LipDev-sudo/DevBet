'use client';

import { getChallenge } from '@/content/challenges';
import { RUN_LAYERS } from '@/content/map';
import { TableEnvironment, TableSwatch } from '@/components/tables/TableEnvironment';
import { getTableByArea, tableForLayer, tableLabel } from '@/content/tables';
import { DealerDialogue } from '@/components/dealer/DealerDialogue';
import { restingMood } from '@/engine/dealer';
import { playSfx } from '@/lib/sfx';
import { TOPIC_LABEL } from '@/engine/types';
import { useGame } from '../game/GameProvider';

function Dots({ value }: { value: number }) {
  return (
    <span aria-label={`Dificuldade ${value} de 5`} className="font-mono tracking-widest text-ivory">
      {'●'.repeat(value)}
      <span className="text-ivory-dim/30">{'●'.repeat(5 - value)}</span>
    </span>
  );
}

/** Entrada da casa: as mesas em ordem, com estado e requisito de desbloqueio. */
export function Lobby() {
  const { state, dispatch } = useGame();
  const run = state.run;
  if (!run) return null;

  const current = tableForLayer(run.layerIndex);
  const tableLayers = RUN_LAYERS.filter((l) => l.kind !== 'shop');
  const opened = Math.min(tableLayers.length, run.history.filter((h) => !h.bust).length + 1);

  // Índice no histórico e requisito de desbloqueio de cada mesa da trilha.
  const historyAt = new Map<number, number>();
  const requirementAt = new Map<number, string>();
  let played = 0;
  let previous: string | null = null;
  for (let i = 0; i < RUN_LAYERS.length; i++) {
    const layer = RUN_LAYERS[i];
    if (!layer || layer.kind === 'shop') continue;
    if (i < run.layerIndex) historyAt.set(i, played++);
    if (previous) requirementAt.set(i, previous);
    previous = tableLabel(getTableByArea(layer.areaId));
  }

  return (
    <div className="screen-enter">
      <header className="text-center">
        <p className="table-label">Lobby</p>
        <h1 className="mt-2 text-3xl font-black tracking-[0.12em] text-ivory sm:text-4xl">
          THE HOUSE
        </h1>
        <p className="mt-2 text-sm text-ivory-dim">
          {opened} de {tableLayers.length} mesas abertas
        </p>
      </header>

      <DealerDialogue
        className="mx-auto mt-6 max-w-2xl"
        text={current.intro}
        mood={restingMood(current.tone)}
        tone={current.tone}
        lamp={current.scene.lamp}
      />

      <ol className="mx-auto mt-8 flex max-w-3xl flex-col items-stretch">
        {RUN_LAYERS.map((layer, index) => {
          const done = index < run.layerIndex;
          const isCurrent = index === run.layerIndex;

          if (layer.kind === 'shop') {
            return (
              <li key={index} className="flex flex-col items-center" aria-label="Loja">
                <span aria-hidden="true" className="h-3 w-px bg-white/10" />
                <span
                  className={`table-label rounded-full px-3 py-1 ring-1 ${done || isCurrent ? 'ring-white/20' : 'opacity-50 ring-white/10'}`}
                >
                  $ Loja
                </span>
                <span aria-hidden="true" className="h-3 w-px bg-white/10" />
              </li>
            );
          }

          const table = getTableByArea(layer.areaId);
          const entry = done ? run.history[historyAt.get(index) ?? -1] : undefined;
          const requirement = requirementAt.get(index);
          const isBoss = layer.kind === 'boss';
          const locked = !done && !isCurrent;
          const prevIsShop = RUN_LAYERS[index - 1]?.kind === 'shop';

          const info = (
            <div className="flex items-center gap-4">
              <TableSwatch table={table} dim={locked} />
              <div className="min-w-0 flex-1">
                <p className={`table-label ${isBoss ? '!text-crimson-hot' : ''}`}>
                  {tableLabel(table)}
                </p>
                <p className={`mt-1 text-sm ${locked ? 'text-ivory-dim/70' : 'text-ivory-dim'}`}>
                  {table.topics}
                </p>
                {table.planned.length > 0 && (
                  <p className="mt-0.5 text-xs text-ivory-dim/60">
                    Em breve: {table.planned.join(', ')}
                  </p>
                )}
              </div>
              <p className="shrink-0 text-right text-xs">
                {done && entry ? (
                  <span className={entry.bust ? 'text-crimson-hot' : 'text-win'}>
                    {entry.bust ? 'Bust' : `Concluída · +${entry.score}`}
                  </span>
                ) : isCurrent ? (
                  <span className="text-ivory">Aberta</span>
                ) : (
                  <span className="text-ivory-dim">
                    <span aria-hidden="true">🔒 </span>
                    Complete {requirement ?? 'a mesa anterior'}
                  </span>
                )}
              </p>
            </div>
          );

          return (
            <li key={index} aria-current={isCurrent ? 'step' : undefined} className="flex flex-col">
              {index > 0 && !prevIsShop && (
                <span aria-hidden="true" className="mx-auto h-4 w-px bg-white/10" />
              )}
              {isCurrent ? (
                <TableEnvironment table={table} showLabel={false} feltHeight="55%">
                  <div className="p-4 sm:p-5">
                    {info}
                    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                      {layer.options.map((id) => {
                        const challenge = getChallenge(id);
                        return (
                          <li key={id}>
                            <button
                              type="button"
                              onClick={() => {
                                playSfx('select');
                                dispatch({ type: 'choose', challengeId: id });
                              }}
                              className="panel w-full p-4 text-left transition-colors hover:border-white/40"
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="table-label !text-[0.68rem]">
                                  {TOPIC_LABEL[challenge.topic]}
                                </span>
                                <Dots value={challenge.difficulty} />
                              </span>
                              <span
                                className={`mt-2 block text-lg font-bold ${isBoss ? 'text-crimson-hot' : 'text-ivory'}`}
                              >
                                {challenge.title}
                              </span>
                              <span className="mt-1 block text-sm text-ivory-dim">
                                {challenge.concept}
                              </span>
                              <span className="mt-3 flex justify-between text-xs text-ivory-dim">
                                <span>Meta {challenge.target} pts</span>
                                <span>
                                  +{challenge.chipReward} fichas · +{challenge.xp} XP
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </TableEnvironment>
              ) : (
                <div
                  aria-disabled={locked || undefined}
                  className={`rounded-xl p-4 ring-1 ${locked ? 'ring-dashed bg-white/[0.015] ring-white/10' : 'ring-white/10'}`}
                >
                  {info}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-12 text-center">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Abandonar a run atual? O progresso desta run será perdido.')) {
              dispatch({ type: 'abandon-run' });
            }
          }}
          className="text-xs text-ivory-dim underline-offset-4 hover:text-crimson-hot hover:underline"
        >
          Abandonar run
        </button>
      </div>
    </div>
  );
}
