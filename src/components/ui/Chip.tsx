type Tone = 'red' | 'gold' | 'green' | 'black';

const TONE_CLASS: Record<Tone, string> = {
  red: '',
  gold: 'chip-gold',
  green: 'chip-green',
  black: 'chip-black',
};

/** Ficha de cassino. Sem `children`, é só decoração. */
export function Chip({
  tone = 'gold',
  className = '',
  children,
  style,
}: {
  tone?: Tone;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`chip ${TONE_CLASS[tone]} ${className}`} style={style} aria-hidden={!children}>
      <span>{children}</span>
    </span>
  );
}

/** Contador de fichas: ficha dourada + valor. */
export function ChipCount({ amount, label = 'fichas' }: { amount: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label={`${amount} ${label}`}>
      <Chip tone="gold" className="!w-8" />
      <span className="font-mono text-base font-bold text-gold-light tabular-nums">{amount}</span>
    </span>
  );
}
