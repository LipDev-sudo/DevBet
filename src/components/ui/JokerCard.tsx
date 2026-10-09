import { effectLabel, getJoker } from '@/engine/jokers';
import { JOKER_ART, SPRITE_COLOR } from './jokerArt';
import { PixelStar } from './PixelSuit';

/** Sprite pixelado do joker: um caminho SVG por cor, para ficar nítido em qualquer tamanho. */
function JokerSprite({ id }: { id: string }) {
  const art = JOKER_ART[id];
  if (!art) return null;
  const paths = new Map<string, string>();
  art.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      paths.set(ch, `${paths.get(ch) ?? ''}M${x} ${y}h1v1h-1z`);
    });
  });
  const width = Math.max(...art.rows.map((row) => row.length));
  return (
    <svg
      viewBox={`0 0 ${width} ${art.rows.length}`}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
      className="jk-sprite"
    >
      {[...paths.entries()].map(([ch, d]) => (
        <path
          key={ch}
          d={d}
          fill={ch === 'a' ? art.a : ch === 'b' ? art.b : (SPRITE_COLOR[ch] ?? '#fff')}
        />
      ))}
    </svg>
  );
}

/**
 * Joker = idioma de Python. Diferente das cartas (papel creme com naipes), o joker é uma ficha escura em formato
 * de ingresso, com um retrato pixelado próprio, faixa com o nome e uma etiqueta colorida com o efeito.
 * `active` acende o joker quando ele dispara durante a pontuação.
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
  const art = JOKER_ART[id];
  const style = art
    ? ({
        '--jk-a': art.a,
        '--jk-b': art.b,
        '--jk-bg1': art.bg[0],
        '--jk-bg2': art.bg[1],
      } as React.CSSProperties)
    : undefined;
  return (
    <div
      data-joker={id}
      data-active={active}
      data-rarity={joker.rarity}
      aria-label={`Joker ${joker.name}: ${effectLabel(joker.effect)}. ${joker.when}`}
      style={style}
      className={`joker-card ${compact ? 'w-full sm:w-28' : 'w-40'} ${className}`}
    >
      <div className="jk-frame">
        <div className="jk-face">
          <p className="jk-label">
            <PixelStar className="jk-star" />
            JOKER
            <PixelStar className="jk-star" />
          </p>
          <div className="jk-window">
            <JokerSprite id={id} />
          </div>
          <p className="jk-name">{joker.name}</p>
          <p className="jk-tag">{joker.tag}</p>
          <p className="jk-effect" data-kind={joker.effect.kind}>
            {effectLabel(joker.effect)}
          </p>
        </div>
      </div>
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
