import { cardEffect, getCard, RARITY_LABEL } from '@/engine/cards';
import { CARD_MULT_SCALE } from '@/engine/handscore';
import { CATEGORY_LABEL, type CardId } from '@/engine/types';
import { PixelStar, PixelSuit, SUIT_BY_CATEGORY } from './PixelSuit';

export type CardSize = 'xs' | 'sm' | 'md' | 'lg' | 'fluid';

const SIZE_CLASS: Record<CardSize, string> = {
  xs: 'w-[3.9rem] sm:w-[4.4rem]',
  sm: 'w-28',
  md: 'w-32',
  lg: 'w-48',
  /** Preenche a coluna (até 6rem) no celular e vira `sm` a partir de sm. */
  fluid: 'w-full max-w-24 sm:w-28',
};

/** O "valor" da carta no canto, como o A, 2, 3… de um baralho: aqui é o símbolo do conceito em código. */
const RANK_GLYPH: Record<CardId, string> = {
  variable: 'x=',
  operator: '+-',
  boolean: 'T/F',
  condition: 'if',
  for: 'for',
  while: 'do',
  list: '[]',
  dictionary: '{}',
  set: '{,}',
  function: 'f()',
  parameter: '(a)',
  return: '=>',
  recursion: 'f(f)',
  search: 'O(n)',
  'unit-test': 'ok',
  breakpoint: 'bp',
};

const glyphSize = (glyph: string) => (glyph.length <= 2 ? 'l' : glyph.length === 3 ? 'm' : 's');

/** Multiplicador como o placar o aplica (0.2 de efeito vale +0.8 de mult), sem zeros sobrando. */
export const fmtMult = (mult: number) => String(Math.round(mult * CARD_MULT_SCALE * 10) / 10);

const nameSize = (name: string) => (name.length <= 5 ? 's' : name.length <= 8 ? 'm' : 'l');

export interface PlayingCardProps {
  cardId: CardId;
  upgrade?: number;
  size?: CardSize;
  selected?: boolean;
  /** O desafio atual usa o conceito desta carta: o efeito mostrado já é o dobrado. */
  boosted?: boolean;
  faceDown?: boolean;
  /** Anulada pela regra do boss: não pontua. */
  debuffed?: boolean;
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
  debuffed = false,
  dealDelayMs,
  onClick,
  className = '',
}: PlayingCardProps) {
  const style = dealDelayMs === undefined ? undefined : { animationDelay: `${dealDelayMs}ms` };
  const base = `${SIZE_CLASS[size]} shrink-0 ${dealDelayMs === undefined ? '' : 'animate-deal'} ${className}`;

  if (faceDown) {
    return (
      <div className={`card-back ${base}`} style={style} role="img" aria-label="Carta virada" />
    );
  }

  const card = getCard(cardId);
  const effect = cardEffect(card, upgrade, boosted);
  const suit = SUIT_BY_CATEGORY[card.category];
  const interactive = Boolean(onClick);
  const Tag = interactive ? 'button' : 'div';

  return (
    <Tag
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      data-card-id={cardId}
      data-rarity={card.rarity}
      data-selected={selected}
      data-interactive={interactive}
      data-boosted={boosted}
      data-debuffed={debuffed}
      aria-pressed={interactive ? selected : undefined}
      aria-label={`${card.name}, ${CATEGORY_LABEL[card.category]}, carta ${RARITY_LABEL[card.rarity].toLowerCase()}. +${effect.chips} fichas e +${fmtMult(effect.mult)} de multiplicador${debuffed ? '. Anulada pelo boss: não pontua' : ''}${boosted ? ', dobrado porque lidera a pergunta' : '; dobra se for a primeira carta da mão'}`}
      className={`playing-card text-left ${base}`}
      style={style}
    >
      <div className="pc-frame">
        <div className="pc-face">
          <div className="pc-index">
            <span className="pc-rank" data-size={glyphSize(RANK_GLYPH[cardId])}>
              {RANK_GLYPH[cardId]}
            </span>
            <PixelSuit suit={suit} className="pc-suit-s" />
          </div>
          {(card.rarity !== 'common' || upgrade > 0) && (
            <span className="pc-rare">
              {upgrade > 0 && <span>+{upgrade}</span>}
              {card.rarity !== 'common' && <PixelStar className="pc-star" />}
            </span>
          )}

          <div className="pc-center">
            <PixelSuit suit={suit} className="pc-suit-l" />
            <span className="pc-name" data-size={nameSize(card.name)}>
              {card.name}
            </span>
            <span className="pc-tag">{card.tag}</span>
          </div>

          <div className="pc-index pc-index-end" aria-hidden="true">
            <span className="pc-rank" data-size={glyphSize(RANK_GLYPH[cardId])}>
              {RANK_GLYPH[cardId]}
            </span>
            <PixelSuit suit={suit} className="pc-suit-s" />
          </div>

          <div className="pc-band" data-boosted={boosted}>
            <span>
              +{fmtMult(effect.mult)} MULT{boosted ? ' ×2' : ''}
            </span>
            <span>+{effect.chips} FICHAS</span>
          </div>
        </div>
      </div>
    </Tag>
  );
}
