import type { DealerTone } from '@/content/tables';
import { DEALER_FRAME, MOOD_LABEL, type Mood } from '@/engine/dealer';

/**
 * Dealer em pixel art: um emoji que reage ao jogador. Cada humor é um quadro da folha `public/sprites/dealer.png`
 * (4×4 quadros de 24 px). O tamanho vem do `className` (largura e altura); o sprite é quadrado e encosta embaixo.
 */
export function Dealer({
  mood = 'idle',
  className = 'h-28 w-28',
}: {
  mood?: Mood;
  /** Mantidos por compatibilidade com as telas antigas: o emoji não depende da mesa. */
  tone?: DealerTone;
  lamp?: string;
  className?: string;
}) {
  const frame = DEALER_FRAME[mood];
  return (
    <div
      role="img"
      aria-label={`Dealer ${MOOD_LABEL[mood]}`}
      data-mood={mood}
      className={`dealer ${className}`}
    >
      {/* `key` reinicia a animação de "pulinho" a cada mudança de humor. */}
      <div
        key={mood}
        className="dealer-sprite"
        style={{ '--col': frame % 4, '--row': Math.floor(frame / 4) } as React.CSSProperties}
      />
    </div>
  );
}
