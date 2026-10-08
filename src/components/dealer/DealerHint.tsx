import { RichText } from '@/components/ui/RichText';
import type { Challenge } from '@/engine/challenge';
import { HINT_LABEL, type HintLevel } from '@/engine/hints';

const FIELD = { 1: 'question', 2: 'clue', 3: 'concept', 4: 'example' } as const;

/** Dicas já pedidas, como uma conversa: você pede, o Dealer responde. O jogador decide a próxima. */
export function DealerHint({
  challenge,
  level,
  onOpenExplanation,
}: {
  challenge: Challenge;
  level: number;
  onOpenExplanation: () => void;
}) {
  const steps = challenge.boss ? [1, 2, 3, 5] : [1, 2, 3, 4, 5];
  const shown = ([1, 2, 3, 4] as const).filter((n) => n <= level && challenge.ladder[FIELD[n]]);
  if (shown.length === 0 && level < 5) return null;

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div
        role="img"
        aria-label={`Ajuda usada: nível ${level} de 5`}
        className="flex items-center gap-1.5"
      >
        {steps.map((n) => (
          <span
            key={n}
            className={`h-1 w-6 rounded-full ${n <= level ? 'bg-ivory' : 'bg-white/15'}`}
          />
        ))}
      </div>
      <ol className="mt-3 space-y-3" aria-label="Conversa de dicas">
        {shown.map((n) => {
          const text = challenge.ladder[FIELD[n]] ?? '';
          return (
            <li key={n} className="animate-rise space-y-1.5">
              <p className="text-right text-[0.7rem] text-ivory-dim">Você pediu ajuda</p>
              <div className="rounded-lg rounded-tl-sm bg-white/[0.06] p-3 ring-1 ring-white/10">
                <p className="table-label !text-[0.65rem]">
                  {n} · {HINT_LABEL[n as Exclude<HintLevel, 0>]}
                </p>
                {n === 4 ? (
                  <pre className="mt-1.5 overflow-x-auto rounded-md bg-black/50 p-3 font-mono text-xs leading-relaxed text-ivory ring-1 ring-white/10">
                    {text}
                  </pre>
                ) : (
                  <p className="mt-1.5 text-sm leading-relaxed text-ivory/90">
                    <RichText text={text} />
                  </p>
                )}
              </div>
            </li>
          );
        })}
        {level >= 5 && (
          <li className="animate-rise space-y-1.5">
            <p className="text-right text-[0.7rem] text-ivory-dim">Você pediu ajuda</p>
            <div className="rounded-lg rounded-tl-sm bg-white/[0.06] p-3 ring-1 ring-white/10">
              <p className="table-label !text-[0.65rem]">5 · {HINT_LABEL[5]}</p>
              <button
                type="button"
                onClick={onOpenExplanation}
                className="mt-1.5 text-sm text-ivory underline underline-offset-4 hover:text-white"
              >
                Reabrir a solução explicada
              </button>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}
