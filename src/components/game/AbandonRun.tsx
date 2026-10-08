'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useGame } from './GameProvider';

/** Saída de emergência disponível em qualquer etapa da run: ela termina e o resultado fica na tela final. */
export function AbandonRun() {
  const { state, dispatch } = useGame();
  const [open, setOpen] = useState(false);
  const run = state.run;
  if (!run || run.status === 'won' || run.status === 'lost') return null;

  return (
    <div className="mt-10 text-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 px-3 text-xs text-ivory-dim underline-offset-4 hover:text-crimson-hot hover:underline"
      >
        Abandonar run
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Abandonar a run?">
        <p className="text-sm leading-relaxed text-ivory/90">
          A run termina agora e as fichas e cartas desta run se perdem. O XP já ganho continua salvo
          e conta como uma run jogada.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" size="sm" data-autofocus onClick={() => setOpen(false)}>
            Continuar jogando
          </Button>
          <Button
            variant="crimson"
            size="sm"
            onClick={() => {
              setOpen(false);
              dispatch({ type: 'abandon-run' });
            }}
          >
            Abandonar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
