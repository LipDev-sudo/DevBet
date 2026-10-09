'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { JokerCard } from '@/components/ui/JokerCard';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { getCard } from '@/engine/cards';
import {
  BASE_DISCARDS,
  bossRule,
  currentBlind,
  deckEntry,
  handLevel,
  handCards,
  isDebuffed,
  JOKER_SLOTS,
  maxPlayFor,
  type RunState,
} from '@/engine/blind';
import { previewPlay } from '@/engine/handscore';
import { playSfx } from '@/lib/sfx';
import { useGame } from '../GameProvider';

type Sort = 'ordem' | 'nivel' | 'categoria';

const SORTS: { id: Sort; label: string }[] = [
  { id: 'ordem', label: 'Ordem' },
  { id: 'nivel', label: 'Nível' },
  { id: 'categoria', label: 'Categoria' },
];

/** Painel lateral: meta, pontos da rodada e a estimativa da mão que está escolhida. */
export function RoundPanel({
  run,
  estimate,
}: {
  run: RunState;
  estimate?: { rank: string; chips: number; mult: number } | null;
}) {
  const round = run.round;
  if (!round) return null;
  const def = currentBlind(run);
  const ratio = Math.min(1, round.roundScore / round.target);
  return (
    <aside
      aria-label="Blind"
      className="grid grid-cols-2 gap-2 lg:block lg:w-64 lg:shrink-0 lg:space-y-3"
      data-tutorial="blind-info"
    >
      <section className="panel rounded-lg p-3 lg:p-4">
        <p className={`table-label ${def.boss ? '!text-crimson-hot' : ''}`}>{def.name}</p>
        <p className="mt-2 text-xs text-ivory-dim">Pontue pelo menos</p>
        <p className="font-display text-3xl font-black text-ivory tabular-nums">{round.target}</p>
        {def.boss && <p className="mt-2 text-xs text-crimson-hot">{def.boss.text}</p>}
        <p className="mt-1 text-xs text-gold">Recompensa +{def.reward}</p>
      </section>

      <section className="panel rounded-lg p-3 lg:p-4" aria-label="Pontos da rodada">
        <p className="table-label">Pontos da rodada</p>
        <p
          key={round.roundScore}
          className="score-pop mt-1 font-display text-3xl font-black text-gold tabular-nums"
        >
          {round.roundScore}
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={round.target}
          aria-valuenow={Math.min(round.roundScore, round.target)}
          aria-label="Progresso da meta"
          className="mt-2 h-2 overflow-hidden rounded-full bg-black/60 ring-1 ring-white/20"
        >
          <div
            className={`h-full ${ratio >= 1 ? 'bg-win' : 'bg-ivory'}`}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
      </section>

      <section
        className="panel col-span-2 rounded-lg p-3 lg:col-span-1 lg:p-4"
        aria-label="Estimativa da mão"
        data-tutorial="estimate"
      >
        <p className="table-label">Mão escolhida</p>
        {estimate ? (
          <>
            <p className="mt-1 text-sm font-bold text-ivory">{estimate.rank}</p>
            <p className="mt-1 font-mono text-lg font-bold">
              <span className="text-sky-300">{estimate.chips}</span>
              <span className="text-ivory-dim"> × </span>
              <span className="text-crimson-hot">{estimate.mult}</span>
            </p>
            <p className="mt-1 text-[0.7rem] text-ivory-dim">
              Mínimo, sem jokers: a pergunta e os jokers decidem o resto.
            </p>
          </>
        ) : (
          <p className="mt-1 text-xs text-ivory-dim">Escolha de 1 a 5 cartas.</p>
        )}
      </section>

      <dl className="col-span-2 grid grid-cols-3 gap-2 text-center lg:col-span-1">
        <div className="panel rounded-lg px-2 py-2">
          <dt className="table-label !tracking-[0.12em]">Mãos</dt>
          <dd className="font-display text-xl font-black text-ivory tabular-nums">
            {round.handsLeft}
          </dd>
        </div>
        <div className="panel rounded-lg px-2 py-2">
          <dt className="table-label !tracking-[0.12em]">Descartes</dt>
          <dd className="font-display text-xl font-black text-ivory tabular-nums">
            {round.discardsLeft}
          </dd>
        </div>
        <div className="panel rounded-lg px-2 py-2">
          <dt className="table-label !tracking-[0.12em]">Fichas</dt>
          <dd className="font-display text-xl font-black text-gold tabular-nums">{run.money}</dd>
        </div>
      </dl>
    </aside>
  );
}

export function JokerRow({ run, activeId }: { run: RunState; activeId?: string | null }) {
  const { dispatch } = useGame();
  return (
    <section aria-label="Seus jokers" data-tutorial="jokers">
      <ul className="grid grid-cols-5 items-stretch gap-1.5 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
        {Array.from({ length: JOKER_SLOTS }, (_, index) => {
          const id = run.jokers[index];
          return (
            <li key={index} className="min-w-0">
              {id ? (
                <div className="flex flex-col items-center gap-1">
                  <JokerCard id={id} compact active={activeId === id} />
                  <div className="hidden gap-1 sm:flex">
                    <button
                      type="button"
                      aria-label={`Mover ${id} para a esquerda`}
                      disabled={index === 0}
                      onClick={() => dispatch({ type: 'move-joker', from: index, to: index - 1 })}
                      className="grid min-h-9 min-w-9 place-items-center text-ivory-dim ring-2 ring-white/20 hover:text-ivory disabled:opacity-30"
                    >
                      <PixelIcon name="chevron-arrow-left" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Mover ${id} para a direita`}
                      disabled={index === run.jokers.length - 1}
                      onClick={() => dispatch({ type: 'move-joker', from: index, to: index + 1 })}
                      className="grid min-h-9 min-w-9 place-items-center text-ivory-dim ring-2 ring-white/20 hover:text-ivory disabled:opacity-30"
                    >
                      <PixelIcon name="chevron-arrow-right" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  aria-label="Espaço de joker vazio"
                  className="grid aspect-[4/5.6] w-full place-items-center rounded-lg border border-dashed border-white/15 text-[0.65rem] text-ivory-dim/60 sm:w-28"
                >
                  vazio
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function RoundScreen() {
  const { state, dispatch } = useGame();
  const run = state.run;
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>('ordem');
  const round = run?.round ?? null;

  const hand = useMemo(() => (run ? handCards(run) : []), [run]);
  const shown = useMemo(() => {
    const list = [...hand];
    if (sort === 'nivel') list.sort((a, b) => getCard(b.cardId).level - getCard(a.cardId).level);
    if (sort === 'categoria') {
      list.sort((a, b) => getCard(a.cardId).category.localeCompare(getCard(b.cardId).category));
    }
    return list;
  }, [hand, sort]);

  if (!run || !round) return null;
  const rule = bossRule(run);
  const limit = maxPlayFor(run);
  // A escolha só vale para cartas que ainda estão na mão (depois de jogar ou descartar, ela se limpa).
  const sel = selected.filter((uid) => round.hand.includes(uid));
  const selCards = sel.map((uid) => deckEntry(run, uid));
  const lead = selCards[0];
  const estimate =
    selCards.length > 0
      ? (() => {
          const preview = previewPlay(
            selCards,
            lead ? [lead.cardId] : [],
            handLevel(run, previewPlay(selCards, []).rank.id),
            (card) => isDebuffed(run, card),
          );
          return { rank: preview.rank.name, chips: preview.chips, mult: preview.mult };
        })()
      : null;

  const playReason =
    sel.length === 0
      ? 'Escolha de 1 a 5 cartas.'
      : sel.length > limit
        ? `Nesta blind você joga no máximo ${limit} cartas.`
        : null;
  const discardReason = rule?.noDiscards
    ? 'Esta blind não permite descartes.'
    : round.discardsLeft <= 0
      ? 'Seus descartes acabaram.'
      : sel.length === 0
        ? 'Escolha as cartas a descartar.'
        : null;

  const toggle = (uid: string) => {
    playSfx('select');
    setSelected((current) => {
      const valid = current.filter((id) => round.hand.includes(id));
      if (valid.includes(uid)) return valid.filter((id) => id !== uid);
      if (valid.length >= 5) return valid;
      return [...valid, uid];
    });
  };

  return (
    <div className="screen-enter flex flex-col gap-4 lg:flex-row">
      <RoundPanel run={run} estimate={estimate} />

      <div className="min-w-0 flex-1 space-y-5">
        <JokerRow run={run} />

        <section aria-label="Sua mão" className="pt-4">
          <ul
            data-tutorial="hand"
            className="grid grid-cols-4 justify-items-center gap-x-2 gap-y-6 sm:flex sm:flex-wrap sm:justify-center sm:gap-3"
          >
            {shown.map((card) => {
              const index = sel.indexOf(card.uid);
              const debuffed = isDebuffed(run, card);
              return (
                <li key={card.uid} className="relative w-full max-w-24 sm:w-auto sm:max-w-none">
                  <PlayingCard
                    cardId={card.cardId}
                    upgrade={card.upgrade}
                    size="fluid"
                    selected={index >= 0}
                    debuffed={debuffed}
                    onClick={() => toggle(card.uid)}
                  />
                  {index >= 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-6 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full bg-gold text-xs font-black text-ink"
                    >
                      {index === 0 ? '★' : index + 1}
                    </span>
                  )}
                  {debuffed && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[0.55rem] font-bold tracking-widest text-crimson-hot"
                    >
                      ANULADA
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {lead && (
            <p className="mt-4 text-center text-xs text-ivory-dim" role="status">
              ★ {getCard(lead.cardId).name} decide a pergunta desta mão.
            </p>
          )}
        </section>

        <div className="wood sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-center gap-2 px-4 py-3 sm:mx-0 sm:gap-3 sm:rounded-lg">
          <Button
            data-tutorial="play"
            className="flex-1 !px-3 sm:flex-none sm:!px-8"
            disabled={playReason !== null}
            title={playReason ?? undefined}
            onClick={() => {
              dispatch({ type: 'play', uids: sel });
              setSelected([]);
            }}
          >
            <PixelIcon name="play" />
            Jogar mão
          </Button>
          <Button
            data-tutorial="discard"
            className="flex-1 !px-3 sm:flex-none sm:!px-6"
            variant="felt"
            disabled={discardReason !== null}
            title={discardReason ?? undefined}
            onClick={() => {
              dispatch({ type: 'discard', uids: sel });
              setSelected([]);
            }}
          >
            <PixelIcon name="redo" />
            Descartar ({round.discardsLeft}/{rule?.noDiscards ? 0 : BASE_DISCARDS})
          </Button>
          <div className="flex items-center gap-1" role="group" aria-label="Ordenar a mão">
            {SORTS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={sort === option.id}
                onClick={() => setSort(option.id)}
                className={`table-label min-h-10 rounded-lg px-3 ring-1 ${sort === option.id ? 'bg-white/10 text-ivory ring-ivory/60' : 'ring-white/15 hover:text-ivory'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="basis-full text-center text-xs text-ivory-dim">
            {playReason ?? discardReason ?? 'Jogar a mão abre uma pergunta rápida.'}
            {sel.length > 0 && discardReason && playReason === null && ` ${discardReason}`}
          </p>
        </div>
      </div>
    </div>
  );
}
