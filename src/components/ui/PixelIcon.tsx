/**
 * Ícones em pixel art do pacote Lucid (Midhil, CC0), servidos de `public/icons`. `size` 16 ou 32 px; o ícone
 * é desenhado sem suavização e herda o tamanho em `em` quando `scale` é usado.
 */
export type IconName =
  | 'star'
  | 'heart'
  | 'gear'
  | 'play'
  | 'pause'
  | 'cart'
  | 'bag'
  | 'redo'
  | 'exit'
  | 'info'
  | 'person'
  | 'people'
  | 'stack'
  | 'list'
  | 'clock'
  | 'game-controller'
  | 'lock-closed'
  | 'lock-open'
  | 'chevron-arrow-left'
  | 'chevron-arrow-right'
  | 'chevron-arrow-up'
  | 'chevron-arrow-down'
  | 'plus'
  | 'question-mark'
  | 'exclamation-mark'
  | 'home'
  | 'speaker-1'
  | 'speaker-crossed'
  | 'bookmark'
  | 'filter';

export function PixelIcon({
  name,
  size = 16,
  scale = 1,
  className = '',
}: {
  name: IconName;
  size?: 16 | 32;
  /** Multiplicador inteiro do tamanho, para manter os pixels nítidos. */
  scale?: number;
  className?: string;
}) {
  const px = size * scale;
  return (
    <span
      aria-hidden="true"
      className={`pixelated inline-block shrink-0 ${className}`}
      style={{
        width: px,
        height: px,
        backgroundImage: `url(/icons/${size}/${name}.png)`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}
