'use client';

import { Dealer } from '@/components/dealer/Dealer';
import { moodForRun } from '@/engine/dealer';
import { useGame } from './GameProvider';

/** O Dealer no canto da tela, reagindo em tempo real ao que o jogador faz (erro, combo, vitória…). */
export function DealerCorner() {
  const { state } = useGame();
  const run = state.run;
  // Na pergunta e na tela final o Dealer já aparece grande na própria cena.
  if (run && (run.status === 'quiz' || run.status === 'won' || run.status === 'lost')) return null;
  return (
    <div className="dealer-corner" aria-live="polite">
      <Dealer mood={moodForRun(run)} className="h-16 w-16 sm:h-20 sm:w-20" />
    </div>
  );
}
