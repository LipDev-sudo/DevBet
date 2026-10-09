import type { DealerTone } from '@/content/tables';
import type { DealerKind, Mood } from '@/engine/dealer';
import { Dealer } from './Dealer';

const KIND_META: Partial<Record<DealerKind, { label: string; className: string }>> = {
  wrong: { label: 'Errou', className: 'text-crimson-hot ring-crimson-hot/50' },
  success: { label: 'Acertou', className: 'text-win ring-win/40' },
};

/**
 * Fala compacta do Dealer. Não bloqueia nada: é só contexto ao lado do que o jogador está fazendo.
 * `avatar={false}` quando o personagem já está em cena (mesa, desafio, resultado).
 */
export function DealerDialogue({
  text,
  detail,
  nudge,
  kind,
  mood = 'idle',
  tone = 'warm',
  lamp,
  avatar = true,
  avatarClass = 'hidden sm:block',
  children,
  extra,
  className = '',
}: {
  text: string;
  /** Explicação complementar. */
  detail?: React.ReactNode;
  nudge?: string;
  /** Tipo da reação: vira uma etiqueta (acertou, errou). */
  kind?: DealerKind;
  mood?: Mood;
  tone?: DealerTone;
  lamp?: string;
  avatar?: boolean;
  /** Classes de visibilidade do avatar (ex.: só em telas sem a cena do Dealer). */
  avatarClass?: string;
  /** Ações (ENTENDI, DICA…). */
  children?: React.ReactNode;
  /** Conteúdo adicional abaixo das ações (ex.: dicas já pedidas). */
  extra?: React.ReactNode;
  className?: string;
}) {
  const meta = kind ? KIND_META[kind] : undefined;
  return (
    <section
      aria-label="Dealer"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-lg bg-white/[0.04] p-3 ring-1 ring-white/10 ${className}`}
    >
      {avatar && (
        <Dealer
          mood={mood}
          tone={tone}
          lamp={lamp}
          className={`h-16 w-[3.2rem] shrink-0 ${avatarClass}`}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="table-label flex items-center gap-2">
          Dealer
          {meta && (
            <span
              className={`animate-rise rounded-full px-2 py-0.5 text-[0.65rem] tracking-[0.12em] ring-1 ${meta.className}`}
            >
              {meta.label}
            </span>
          )}
        </p>
        <p key={text} className="mt-1 animate-rise text-sm leading-relaxed text-ivory">
          “{text}”
        </p>
        {detail && <div className="mt-2 text-sm leading-relaxed text-ivory-dim">{detail}</div>}
        {nudge && <p className="mt-2 text-xs text-ivory-dim">{nudge}</p>}
        {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
        {extra}
      </div>
    </section>
  );
}
