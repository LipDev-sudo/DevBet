import { effectLabel, getJoker } from '@/engine/jokers';
import { RARITY_LABEL } from '@/engine/cards';

/**
 * Joker = idioma de Python. O cartão mostra o efeito, quando dispara e um exemplo real do código que o ativa.
 * `active` acende o cartão quando ele dispara durante a pontuação.
 */
export function JokerCard({
  id,
  active = false,
  compact = false,
  className = '',
}: {
  id: string;
  active?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const joker = getJoker(id);
  return (
    <div
      data-joker={id}
      data-active={active}
      data-rarity={joker.rarity}
      aria-label={`Joker ${joker.name}: ${effectLabel(joker.effect)}. ${joker.when}`}
      className={`joker-card relative flex flex-col justify-between rounded-lg p-2.5 text-left ${compact ? 'w-full sm:w-28' : 'w-40'} ${className}`}
    >
      <div>
        <p className="text-[0.55rem] font-bold tracking-[0.16em] text-ivory-dim uppercase sm:text-[0.6rem]">
          Joker · {RARITY_LABEL[joker.rarity]}
        </p>
        <p
          className={`mt-1 font-mono leading-tight font-bold text-ivory ${compact ? 'text-[0.7rem] sm:text-xs' : 'text-sm'}`}
        >
          {joker.name}
        </p>
        <p className="mt-0.5 font-mono text-[0.6rem] text-gold-light sm:text-[0.65rem]">
          {joker.tag}
        </p>
      </div>
      <p className={`mt-2 font-mono font-bold text-gold ${compact ? 'text-[0.65rem]' : 'text-xs'}`}>
        {effectLabel(joker.effect)}
      </p>
    </div>
  );
}

/** Texto longo (para a loja e para o modal do joker): quando dispara, o que ensina e um exemplo. */
export function JokerLesson({ id }: { id: string }) {
  const joker = getJoker(id);
  return (
    <div className="space-y-2 text-left text-xs leading-relaxed">
      <p className="text-ivory">{joker.when}</p>
      <p className="text-ivory-dim">{joker.lesson}</p>
      <pre className="overflow-x-auto rounded bg-black/50 p-2 font-mono text-[0.7rem] text-ivory ring-1 ring-white/15">
        {joker.snippet}
      </pre>
    </div>
  );
}
