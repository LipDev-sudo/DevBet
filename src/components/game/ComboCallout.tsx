'use client';

import { useEffect } from 'react';
import { playSfx } from '@/lib/sfx';
import type { ActiveCombo } from '@/engine/combos';

/**
 * Mostra por que o bônus existe: as cartas que formam o combo, o resultado e quanto ele soma.
 * Entra uma vez, em sequência, e fica parado.
 */
export function ComboCallout({ combos }: { combos: ActiveCombo[] }) {
  const key = combos.map((c) => c.combo.id).join();
  useEffect(() => {
    if (key) playSfx('combo');
  }, [key]);
  if (combos.length === 0) return null;
  return (
    <ul className="space-y-2" aria-label="Combos de conceitos ativos">
      {combos.map(({ combo, bonus }, index) => (
        <li
          key={combo.id}
          className="combo-in flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/[0.05] px-3 py-2 ring-1 ring-white/10"
          style={{ animationDelay: `${index * 140}ms` }}
        >
          <span className="font-mono text-xs text-ivory-dim">
            {combo.requires.map((id) => id.toUpperCase().replace('-', ' ')).join(' + ')}
          </span>
          <span aria-hidden="true" className="text-ivory-dim">
            →
          </span>
          <span className="text-sm font-bold tracking-wide text-ivory">{combo.name}</span>
          <span className="ml-auto font-mono text-sm font-bold text-gold-light">
            +{bonus.toFixed(2)} MULT
          </span>
          <span className="basis-full text-xs text-ivory-dim">
            {combo.description}. Combo de conceitos: ativo porque você tem as duas cartas e o
            desafio usa os dois conceitos. Soma ao multiplicador.
          </span>
        </li>
      ))}
    </ul>
  );
}
