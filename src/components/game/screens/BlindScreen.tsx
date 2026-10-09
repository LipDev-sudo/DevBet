'use client';

import { Button } from '@/components/ui/Button';
import { JokerCard } from '@/components/ui/JokerCard';
import { ANTES, BASE_DISCARDS, BASE_HANDS, currentBlind } from '@/engine/blind';
import { useGame } from '../GameProvider';

/** Tela de entrada da blind: a meta, a regra do boss, o que se ganha e a trilha completa. */
export function BlindScreen() {
  const { state, dispatch } = useGame();
  const run = state.run;
  if (!run) return null;
  const def = currentBlind(run);
  const ante = ANTES[run.ante];
  const hands = BASE_HANDS + (def.boss?.handsDelta ?? 0);
  const discards = def.boss?.noDiscards ? 0 : BASE_DISCARDS;

  return (
    <div className="screen-enter mx-auto max-w-4xl">
      <header className="text-center">
        <p className="table-label">
          Ante {run.ante + 1} de {ANTES.length} · {ante?.name}
        </p>
        <h1
          className={`mt-2 text-3xl font-black tracking-tight sm:text-5xl ${def.boss ? 'text-crimson-hot' : 'text-ivory'}`}
        >
          {def.name}
        </h1>
      </header>

      <section
        data-tutorial="blind-info"
        aria-label="Detalhes da blind"
        className="panel mx-auto mt-6 max-w-xl rounded-lg p-5 text-center"
      >
        <p className="table-label">Pontue pelo menos</p>
        <p className="mt-1 font-display text-5xl font-black text-ivory tabular-nums">
          {def.target}
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="table-label !tracking-[0.2em]">Mãos</dt>
            <dd className="font-display text-2xl font-bold text-ivory tabular-nums">{hands}</dd>
          </div>
          <div>
            <dt className="table-label !tracking-[0.2em]">Descartes</dt>
            <dd className="font-display text-2xl font-bold text-ivory tabular-nums">{discards}</dd>
          </div>
          <div>
            <dt className="table-label !tracking-[0.2em]">Recompensa</dt>
            <dd className="font-display text-2xl font-bold text-gold tabular-nums">
              +{def.reward}
            </dd>
          </div>
        </dl>
        {def.boss && (
          <p className="mt-4 rounded-lg bg-wine/40 px-3 py-2 text-sm text-crimson-hot ring-1 ring-crimson-hot/40">
            <strong>Regra do boss:</strong> {def.boss.text}
          </p>
        )}
      </section>

      <div className="mt-6 flex justify-center">
        <Button
          data-tutorial="start-blind"
          className="!px-12 !py-4 !text-base"
          variant={def.boss ? 'crimson' : 'brass'}
          onClick={() => dispatch({ type: 'start-blind' })}
        >
          Jogar blind
        </Button>
      </div>

      {run.jokers.length > 0 && (
        <section className="mt-8" aria-labelledby="jokers-titulo">
          <h2 id="jokers-titulo" className="table-label mb-3 text-center">
            Seus jokers
          </h2>
          <ul className="flex flex-wrap justify-center gap-3">
            {run.jokers.map((id) => (
              <li key={id} className="w-24 sm:w-28">
                <JokerCard id={id} compact />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10" aria-labelledby="trilha-titulo">
        <h2 id="trilha-titulo" className="table-label mb-3 text-center">
          A trilha
        </h2>
        <ol className="grid gap-2 sm:grid-cols-5">
          {ANTES.map((a) => (
            <li key={a.index} className="panel rounded-lg p-3 text-center">
              <p className="table-label !tracking-[0.18em]">{a.name}</p>
              <ul className="mt-2 space-y-1 text-xs">
                {a.blinds.map((b) => {
                  const done =
                    a.index < run.ante || (a.index === run.ante && b.index < run.blindIndex);
                  const current = a.index === run.ante && b.index === run.blindIndex;
                  return (
                    <li
                      key={b.id}
                      aria-current={current ? 'step' : undefined}
                      className={`rounded px-2 py-1 ${current ? 'bg-white/10 font-bold text-ivory ring-1 ring-ivory/60' : done ? 'text-win' : 'text-ivory-dim'}`}
                    >
                      <span aria-hidden="true">{done ? '✓ ' : b.boss ? '☠ ' : ''}</span>
                      {b.boss ? 'Boss' : 'Blind'} · {b.target}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
