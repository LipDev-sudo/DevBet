'use client';

import { Button } from '@/components/ui/Button';
import { ANTES, currentBlind } from '@/engine/blind';
import { useGame } from '../GameProvider';

/** Blind vencida: o que a casa paga (blind + mãos que sobraram + juros). */
export function ClearedScreen() {
  const { state, dispatch } = useGame();
  const run = state.run;
  const payout = run?.round?.payout;
  if (!run || !run.round || !payout) return null;
  const def = currentBlind(run);
  const last = run.ante === ANTES.length - 1 && run.blindIndex === 1;

  const lines: [string, number][] = [
    [def.boss ? 'Boss vencido' : 'Blind vencida', payout.blind],
    [`Mãos que sobraram (${payout.handsLeft} × 1)`, payout.handsLeft],
    ['Juros (1 a cada 5 fichas, até 5)', payout.interest],
  ];

  return (
    <div className="screen-enter mx-auto max-w-xl text-center">
      <p className="table-label">{def.name}</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight text-win sm:text-5xl">
        {last ? 'HIGH TABLE VENCIDA' : 'BLIND VENCIDA'}
      </h1>
      <p className="mt-2 text-sm text-ivory-dim">
        Você fez {run.round.roundScore} pontos de {run.round.target}.
      </p>

      <section data-tutorial="payout" aria-label="Recompensa" className="panel mt-6 rounded-lg p-5">
        <ul className="space-y-2 text-left text-sm">
          {lines.map(([label, value]) => (
            <li key={label} className="flex justify-between gap-3">
              <span className="text-ivory-dim">{label}</span>
              <span className="font-mono font-bold text-gold tabular-nums">+{value}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t border-white/10 pt-3 text-sm">
          <span className="table-label">Total</span>
          <span className="font-display text-2xl font-black text-gold tabular-nums">
            +{payout.total}
          </span>
        </p>
        <p className="mt-2 text-xs text-ivory-dim" role="status">
          Saldo de fichas: {run.money - payout.total} → +{payout.total} → {run.money}
        </p>
      </section>

      <div className="mt-6">
        <Button data-tutorial="cash-out" onClick={() => dispatch({ type: 'cash-out' })}>
          {last ? 'Concluir run' : 'Ir à loja'}
        </Button>
      </div>
    </div>
  );
}
