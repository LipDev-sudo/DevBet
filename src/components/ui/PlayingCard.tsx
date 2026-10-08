import { cardChips, cardMult, getCard, RARITY_LABEL } from '@/engine/cards';
import { CATEGORY_LABEL, TOPIC_LABEL, type CardId, type CategoryId } from '@/engine/types';

export type CardSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<CardSize, string> = {
  xs: 'w-[3.9rem] sm:w-[4.4rem]',
  sm: 'w-28',
  md: 'w-32',
  lg: 'w-48',
};

/** Marca da categoria: forma simples e funcional, para reconhecer o naipe conceitual de relance. */
function CategoryMark({ category }: { category: CategoryId }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="size-[9cqw] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.300"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {category === 'fundamentos' && <rect x="2" y="2" width="8" height="8" rx="1.200" />}
      {category === 'controle' && <path d="M6 11 V6.500 M6 6.500 L2.500 2 M6 6.500 L9.500 2" />}
      {category === 'estruturas' && (
        <path d="M2 2 H5 V5 H2 Z M7 2 H10 V5 H7 Z M2 7 H5 V10 H2 Z M7 7 H10 V10 H7 Z" />
      )}
      {category === 'funcoes' && <path d="M4 2 Q1.500 6 4 10 M8 2 Q10.500 6 8 10" />}
      {category === 'algoritmos' && <path d="M6 2 L10.500 10 H1.500 Z" />}
      {category === 'debug' && (
        <>
          <circle cx="6" cy="6" r="4" />
          <circle cx="6" cy="6" r="1" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

const nameSize = (name: string) => (name.length <= 5 ? 's' : name.length <= 8 ? 'm' : 'l');

export interface PlayingCardProps {
  cardId: CardId;
  upgrade?: number;
  size?: CardSize;
  selected?: boolean;
  /** Destaca a carta como sinérgica com o tema atual. */
  boosted?: boolean;
  faceDown?: boolean;
  dealDelayMs?: number;
  onClick?: () => void;
  className?: string;
}

export function PlayingCard({
  cardId,
  upgrade = 0,
  size = 'md',
  selected = false,
  boosted = false,
  faceDown = false,
  dealDelayMs,
  onClick,
  className = '',
}: PlayingCardProps) {
  const style = dealDelayMs === undefined ? undefined : { animationDelay: `${dealDelayMs}ms` };
  const base = `${SIZE_CLASS[size]} shrink-0 ${dealDelayMs === undefined ? '' : 'animate-deal'} ${className}`;

  if (faceDown) {
    return <div className={`card-back ${base}`} style={style} aria-label="Carta virada" />;
  }

  const card = getCard(cardId);
  const mult = Math.round(cardMult(card, upgrade) * 100);
  const interactive = Boolean(onClick);
  const Tag = interactive ? 'button' : 'div';

  return (
    <Tag
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      data-rarity={card.rarity}
      data-selected={selected}
      data-interactive={interactive}
      data-boosted={boosted}
      aria-pressed={interactive ? selected : undefined}
      aria-label={`${card.name}, ${CATEGORY_LABEL[card.category]}, carta ${RARITY_LABEL[card.rarity].toLowerCase()}. +${cardChips(card, upgrade)} fichas, +${mult}% ${TOPIC_LABEL[card.topics[0] ?? 'basics']}`}
      className={`playing-card text-left ${base}`}
      style={style}
    >
      <div className="relative z-10 flex h-full flex-col justify-between p-[9cqw]">
        <div className="pc-top flex items-start justify-between gap-1">
          <span className="flex items-center gap-[2cqw] text-ivory-dim">
            <CategoryMark category={card.category} />
            {CATEGORY_LABEL[card.category]}
          </span>
          {(card.rarity !== 'common' || upgrade > 0) && (
            <span className="text-gold">
              {upgrade > 0 ? `+${upgrade}` : ''}
              {card.rarity === 'legendary' ? ' ◆' : card.rarity === 'rare' ? ' ◇' : ''}
            </span>
          )}
        </div>

        <div className="flex flex-col items-center gap-[5cqw]">
          <span className="pc-name" data-size={nameSize(card.name)}>
            {card.name}
          </span>
          <span className="pc-tag">{card.tag}</span>
        </div>

        <div className="pc-effect">
          <div className={boosted ? 'text-gold-light' : 'text-ivory'}>
            +{mult}% {TOPIC_LABEL[card.topics[0] ?? 'basics']}
          </div>
          <div className="text-ivory-dim">+{cardChips(card, upgrade)} FICHAS</div>
        </div>
      </div>
    </Tag>
  );
}
