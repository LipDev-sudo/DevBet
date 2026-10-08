'use client';

import { useEffect } from 'react';
import { useGame } from './GameProvider';

/** Aviso de regra (fichas insuficientes etc.). Anunciado a leitores de tela. */
export function Notice() {
  const { state, dispatch } = useGame();
  const notice = state.notice;

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => dispatch({ type: 'clear-notice' }), 4500);
    return () => clearTimeout(timer);
  }, [notice, dispatch]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
    >
      {notice && (
        <p className="animate-rise rounded-lg bg-wine px-4 py-2.5 text-sm text-ivory shadow-xl ring-1 ring-crimson-hot/60">
          {notice.text}
        </p>
      )}
    </div>
  );
}
