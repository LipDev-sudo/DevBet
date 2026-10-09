'use client';

import { useGame } from '../game/GameProvider';
import { NicknameForm } from './AccountMenu';
import { useAccount } from './AccountProvider';

/** Durante a run: sem apelido a pontuação não entra no placar, então o pedido aparece na própria tela de jogo. */
export function NicknamePrompt() {
  const { state } = useGame();
  const { configured, user, nickname } = useAccount();
  if (!configured || !user || nickname || !state.run) return null;
  return (
    <section aria-label="Apelido do placar" className="panel mx-auto mb-5 max-w-md p-4 text-left">
      <p className="mb-2 text-sm text-ivory">
        Escolha um apelido para aparecer no placar ao vivo enquanto você joga.
      </p>
      <NicknameForm />
    </section>
  );
}
