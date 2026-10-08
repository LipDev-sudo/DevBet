'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { xpProgress } from '@/engine/progression';
import { STARTER_PACKS, TUTORIAL_PACK_ID } from '@/engine/run';
import { useGame } from '../GameProvider';

export function StartScreen() {
  const { state, dispatch } = useGame();
  const profile = state.profile;
  // Na primeira run, o Dealer recomenda o pacote com os conceitos do primeiro desafio.
  const [packId, setPackId] = useState<string>(
    profile.tutorialCompleted ? (STARTER_PACKS[0]?.id ?? 'logica') : TUTORIAL_PACK_ID,
  );
  const guided = !profile.tutorialCompleted;
  const xp = xpProgress(profile.xp);

  return (
    <div className="animate-rise">
      <div className="text-center">
        <p className="table-label">Nova run</p>
        <h1 className="mt-3 font-display text-3xl font-black text-ivory sm:text-5xl">
          Escolha seu <span className="gold-text">baralho inicial</span>
        </h1>
      </div>

      <hr className="my-8 border-white/10" />

      <fieldset>
        <legend className="sr-only">Pacote inicial</legend>
        <div className="grid gap-5 lg:grid-cols-3" data-tutorial="packs">
          {STARTER_PACKS.map((pack) => {
            const locked = guided && pack.id !== TUTORIAL_PACK_ID;
            const selected = pack.id === packId;
            return (
              <label
                key={pack.id}
                className={`panel relative block rounded-lg p-5 transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ivory ${locked ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'} ${selected ? 'ring-2 ring-ivory' : locked ? '' : 'opacity-80 hover:opacity-100'}`}
              >
                <input
                  type="radio"
                  name="pack"
                  value={pack.id}
                  checked={selected}
                  disabled={locked}
                  onChange={() => setPackId(pack.id)}
                  className="sr-only"
                />
                <span className="font-display text-xl font-bold text-ivory">{pack.name}</span>
                <span className="mt-1 block min-h-10 text-sm text-ivory-dim">{pack.tagline}</span>
                {locked && (
                  <span className="mt-2 block text-xs text-ivory-dim">
                    Disponível depois da primeira run.
                  </span>
                )}
                <span className="mt-4 flex justify-center">
                  {pack.cards.map((id, index) => (
                    <span
                      key={id}
                      className="-mx-2"
                      style={{ transform: `rotate(${(index - 2) * 4}deg)` }}
                    >
                      <PlayingCard cardId={id} size="xs" />
                    </span>
                  ))}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-10 flex flex-col items-center gap-3">
        <Button
          data-tutorial="start-run"
          className="!px-12 !py-4 !text-base"
          onClick={() =>
            dispatch({ type: 'new-run', packId, seed: Math.floor(Math.random() * 2 ** 31) })
          }
        >
          Sentar à mesa
        </Button>
        <Link
          href="/colecao"
          className="table-label inline-flex min-h-10 items-center text-ivory-dim hover:text-ivory"
        >
          Ver coleção e combos de conceitos
        </Link>
      </div>

      <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-4 text-center sm:grid-cols-4">
        {[
          ['Nível', String(xp.level)],
          ['XP', `${xp.intoLevel}/${xp.needed}`],
          ['Runs', `${profile.runsWon}/${profile.runsPlayed}`],
          ['Recorde', String(profile.bestRunScore)],
        ].map(([label, value]) => (
          <div key={label} className="panel rounded-lg px-3 py-3">
            <dt className="table-label !tracking-[0.2em]">{label}</dt>
            <dd className="mt-1 font-display text-xl font-bold text-ivory tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
