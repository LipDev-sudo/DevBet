import { useId } from 'react';
import { tableLabel, type InlayKind, type TableDef } from '@/content/tables';

/** Marcação gravada no tampo. Fica quase invisível: é pista de conteúdo, não decoração. */
function Inlay({ kind, color }: { kind: InlayKind; color: string }) {
  const id = useId().replace(/:/g, '');
  if (kind === 'none') return null;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 160"
      preserveAspectRatio="xMidYMax meet"
      className="absolute inset-x-0 bottom-0 mx-auto h-full max-h-[11rem] w-full max-w-[34rem]"
      fill="none"
      stroke={color}
      strokeWidth="1.2"
    >
      {kind === 'fork' && (
        <g>
          <path d="M200 150 L200 96 M200 96 Q200 70 140 46 M200 96 Q200 70 260 46" />
          <circle cx="140" cy="46" r="4" />
          <circle cx="260" cy="46" r="4" />
          <circle cx="200" cy="96" r="3" />
        </g>
      )}
      {kind === 'rings' && (
        <g>
          <ellipse cx="200" cy="150" rx="70" ry="24" />
          <ellipse cx="200" cy="150" rx="130" ry="46" />
          <ellipse cx="200" cy="150" rx="190" ry="68" />
        </g>
      )}
      {kind === 'lattice' && (
        <g>
          <defs>
            <pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="14" cy="14" r="1.400" fill={color} stroke="none" />
            </pattern>
          </defs>
          <rect x="70" y="30" width="260" height="110" rx="6" fill={`url(#${id})`} />
          <path d="M70 52 L70 30 L92 30 M308 30 L330 30 L330 52 M330 118 L330 140 L308 140 M92 140 L70 140 L70 118" />
        </g>
      )}
      {kind === 'tree' && (
        <g>
          <path d="M200 30 L140 70 M200 30 L260 70 M140 70 L110 112 M140 70 L170 112 M260 70 L230 112 M260 70 L290 112" />
          {[
            [200, 30],
            [140, 70],
            [260, 70],
            [110, 112],
            [170, 112],
            [230, 112],
            [290, 112],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="4.500" fill="#07050a" />
          ))}
        </g>
      )}
      {kind === 'crest' && (
        <g>
          <rect x="30" y="22" width="340" height="120" rx="14" />
          <rect x="38" y="30" width="324" height="104" rx="10" strokeOpacity=".5" />
          <path d="M200 52 L222 82 L200 112 L178 82 Z" />
          <path d="M120 82 L172 82 M228 82 L280 82" />
        </g>
      )}
    </svg>
  );
}

/**
 * A mesa como lugar: parede, cone de luz, tampo (feltro/couro) com moldura e marcação própria.
 * Tudo estático e atrás do conteúdo; nunca compete com o código nem com as cartas.
 */
export function TableEnvironment({
  table,
  children,
  className = '',
  showLabel = true,
  feltHeight = '46%',
  inlay = true,
}: {
  table: TableDef;
  children: React.ReactNode;
  className?: string;
  showLabel?: boolean;
  /** Altura do tampo em relação à cena. */
  feltHeight?: string;
  /** Marcação do tampo. Desligada onde há texto/código por cima: o cenário não compete com o editor. */
  inlay?: boolean;
}) {
  const { scene, ambient } = table;
  return (
    <section
      aria-label={tableLabel(table)}
      className={`relative isolate overflow-hidden rounded-xl ${className}`}
      style={{
        background: scene.wall,
        boxShadow: `inset 0 0 0 1px ${ambient.rail}, inset 0 0 110px rgb(0 0 0 / ${ambient.vignette})`,
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            clipPath: 'polygon(40% 0, 60% 0, 92% 100%, 8% 100%)',
            background: `linear-gradient(180deg, rgb(${scene.lamp} / ${scene.lampStrength}), transparent 85%)`,
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 overflow-hidden"
          style={{
            height: feltHeight,
            borderRadius: '50% 50% 0 0 / 22% 22% 0 0',
            borderTop: `4px solid ${scene.trim}`,
            background: `radial-gradient(ellipse 70% 120% at 50% 0%, ${scene.felt}, ${scene.feltEdge})`,
            boxShadow: `inset 0 14px 30px -12px rgb(${scene.lamp} / ${scene.lampStrength * 0.8})`,
          }}
        >
          {inlay && <Inlay kind={scene.inlay} color={scene.inlayColor} />}
        </div>
      </div>
      {showLabel && (
        <p className="table-label px-4 pt-3 sm:px-5">
          {tableLabel(table)}
          <span className="hidden text-ivory-dim/70 sm:inline"> · {table.topics}</span>
        </p>
      )}
      {children}
    </section>
  );
}

/** Miniatura do tampo para o Lobby: a identidade da mesa, aberta ou apagada. */
export function TableSwatch({ table, dim = false }: { table: TableDef; dim?: boolean }) {
  const { scene } = table;
  return (
    <span
      aria-hidden="true"
      className="relative block h-12 w-[4.5rem] shrink-0 overflow-hidden rounded-lg"
      style={{
        background: scene.wall,
        boxShadow: `inset 0 0 0 1px ${table.ambient.rail}`,
        opacity: dim ? 0.8 : 1,
      }}
    >
      <span
        className="absolute inset-x-0 bottom-0 block h-[62%] overflow-hidden"
        style={{
          borderRadius: '50% 50% 0 0 / 30% 30% 0 0',
          borderTop: `2px solid ${scene.trim}`,
          background: `radial-gradient(ellipse 80% 120% at 50% 0%, ${scene.felt}, ${scene.feltEdge})`,
        }}
      >
        <Inlay kind={scene.inlay} color={scene.inlayColor} />
      </span>
    </span>
  );
}
