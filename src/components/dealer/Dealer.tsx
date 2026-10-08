import { useId } from 'react';
import type { DealerTone } from '@/content/tables';
import type { Mood } from '@/engine/dealer';

const BROWS: Record<Mood, [string, string]> = {
  idle: ['M64 50 Q70 47.500 76.500 49.500', 'M83.500 49.500 Q90 47.500 96 50'],
  thinking: ['M64 47 Q70 43.500 76.500 46.500', 'M83.500 49.500 Q90 48 96 50.500'],
  success: ['M64 49 Q70 46 76.500 48.500', 'M83.500 48.500 Q90 46 96 49'],
  error: ['M64 49 L76.500 50.800', 'M83.500 50.800 L96 49'],
  serious: ['M63.500 49.500 L76.500 51.800', 'M83.500 51.800 L96.500 49.500'],
  boss: ['M63 48.500 L76.500 52.800', 'M83.500 52.800 L97 48.500'],
};
const MOUTH: Record<Mood, string> = {
  idle: 'M72.500 78.500 Q80 80.500 87.500 78.500',
  thinking: 'M73 79.500 L86 78.500',
  success: 'M71 77.500 Q80 83.500 89 77.500',
  error: 'M73 80.500 Q80 78 87 80.500',
  serious: 'M72.500 79.500 L87.500 79.500',
  boss: 'M73 80.500 L87 80.500',
};
/** Deslocamento das pupilas: thinking olha para baixo/direita, na direção do editor. */
const GAZE: Record<Mood, [number, number]> = {
  idle: [0, 0],
  thinking: [1.6, 1.4],
  success: [0, 0.4],
  error: [0, 0.6],
  serious: [0, 0.4],
  boss: [0, 0.2],
};
/** Quanto da pálpebra cobre o olho (0 = aberto). */
const LID: Record<Mood, number> = {
  idle: 0.15,
  thinking: 0.2,
  success: 0.38,
  error: 0.1,
  serious: 0.4,
  boss: 0.52,
};

const MOOD_LABEL: Record<Mood, string> = {
  idle: 'observando você',
  thinking: 'acompanhando seu código',
  success: 'aprovando',
  error: 'atento ao erro',
  serious: 'sério',
  boss: 'em postura de boss',
};

const HEAD =
  'M54 58 C54 38 66 28 80 28 C94 28 106 38 106 58 C106 75 98 90 80 92 C62 90 54 75 54 58 Z';
const JACKET = 'M12 200 L16 152 C20 126 48 113 80 113 C112 113 140 126 144 152 L148 200 Z';
const NECK = 'M69 88 L91 88 L93 116 L80 126 L67 116 Z';

/**
 * Dealer 2D, plano e iluminado por uma lâmpada lateral (a mesma cor da mesa).
 * Os estados mudam olhar, sobrancelhas, pálpebras e boca; o boss ganha luz de contorno vermelha.
 */
export function Dealer({
  mood = 'idle',
  tone = 'warm',
  lamp = '255 214 150',
  className = 'h-28 w-[5.6rem]',
}: {
  mood?: Mood;
  tone?: DealerTone;
  /** Cor da lâmpada da mesa, "r g b". */
  lamp?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const vest = tone === 'warm' ? '#1d2a45' : tone === 'focused' ? '#241f3d' : '#3b0f1b';
  const [gx, gy] = GAZE[mood];
  const lid = LID[mood];
  const boss = mood === 'boss';
  const [browL, browR] = BROWS[mood];

  return (
    <span key={mood} className="dealer-react inline-block">
      <svg
        viewBox="0 0 160 200"
        role="img"
        aria-label={`Dealer, ${MOOD_LABEL[mood]}`}
        className={className}
      >
        <defs>
          <linearGradient id={`${id}-light`} x1="0" x2="1" y1="0" y2="0.2">
            <stop offset="0" stopColor={`rgb(${lamp})`} stopOpacity="0.28" />
            <stop offset="0.5" stopColor="#000" stopOpacity="0" />
            <stop
              offset="1"
              stopColor={boss ? '#d9485a' : '#000'}
              stopOpacity={boss ? 0.4 : 0.34}
            />
          </linearGradient>
        </defs>

        {/* paletó, colete, camisa */}
        <path d={JACKET} fill="#0f1626" />
        <path d="M54 126 L80 176 L106 126 L112 200 L48 200 Z" fill={vest} />
        <path d="M64 112 L80 134 L96 112 L100 118 L80 142 L60 118 Z" fill="#e6dfce" />
        <path
          d="M42 130 L67 113 L82 156 L56 176 Z"
          fill="#0b111e"
          stroke="#fff"
          strokeOpacity=".08"
        />
        <path
          d="M118 130 L93 113 L78 156 L104 176 Z"
          fill="#0b111e"
          stroke="#fff"
          strokeOpacity=".08"
        />
        {tone !== 'warm' &&
          [158, 172, 186].map((y) => (
            <circle key={y} cx="80" cy={y} r="2" fill="#c9a24a" opacity=".85" />
          ))}
        {/* gravata-borboleta */}
        <path d="M80 121 L63 113 L63 129 Z M80 121 L97 113 L97 129 Z" fill="#d9485a" />
        <circle cx="80" cy="121" r="3.200" fill="#8c1d2b" />

        {/* pescoço e cabeça */}
        <path d={NECK} fill="#a98066" />
        <path d={HEAD} fill="#c9a283" />
        <ellipse cx="53.500" cy="62" rx="3.600" ry="6" fill="#b8926f" />
        <ellipse cx="106.500" cy="62" rx="3.600" ry="6" fill="#b8926f" />
        {/* cabelo penteado para trás */}
        <path
          d="M51 58 C47 30 66 21 80 21 C96 21 113 30 109 58 C106 45 97 38 80 38 C63 38 54 45 51 58 Z"
          fill="#14100e"
        />
        <path
          d="M66 31 Q80 24 96 33"
          stroke="#fff"
          strokeOpacity=".12"
          strokeWidth="1.500"
          fill="none"
        />

        {/* rosto */}
        {[70, 90].map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy="58.500" rx="4.400" ry="2.800" fill="#efe8da" />
            <circle cx={cx + gx} cy={58.5 + gy} r="2" fill="#14100e" />
            <rect x={cx - 4.8} y="55.300" width="9.600" height={5.8 * lid} fill="#c9a283" />
          </g>
        ))}
        <path d={browL} stroke="#14100e" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d={browR} stroke="#14100e" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path
          d="M80 59 L77.500 71 Q80 73 82.500 71"
          stroke="#a98066"
          strokeWidth="1.400"
          fill="none"
        />
        <path d={MOUTH[mood]} stroke="#6f4636" strokeWidth="2" strokeLinecap="round" fill="none" />
        {tone === 'severe' && (
          <g stroke="#e6dfce" strokeOpacity=".7" strokeWidth="1.300" fill="none">
            <rect x="62.500" y="52.500" width="15" height="11" rx="4" />
            <rect x="82.500" y="52.500" width="15" height="11" rx="4" />
            <path d="M77.500 57 L82.500 57" />
          </g>
        )}

        {/* luz da mesa sobre o personagem */}
        <path d={JACKET} fill={`url(#${id}-light)`} />
        <path d={NECK} fill={`url(#${id}-light)`} />
        <path d={HEAD} fill={`url(#${id}-light)`} />
      </svg>
    </span>
  );
}
