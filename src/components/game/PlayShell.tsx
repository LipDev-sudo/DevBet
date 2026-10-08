'use client';

import { Wordmark } from '@/components/ui/Wordmark';
import { GameHud } from './GameHud';
import { useGame } from './GameProvider';
import { Notice } from './Notice';
import { ChallengeScreen } from './screens/ChallengeScreen';
import { EndScreen } from './screens/EndScreen';
import { Lobby } from '../world/Lobby';
import { ResultScreen } from './screens/ResultScreen';
import { ShopScreen } from './screens/ShopScreen';
import { StartScreen } from './screens/StartScreen';
import { TableScreen } from './screens/TableScreen';

export function PlayShell() {
  const { state } = useGame();
  const run = state.run;

  if (!state.hydrated) {
    return (
      <div className="grid min-h-[60vh] place-items-center" role="status">
        <div className="flex flex-col items-center gap-3">
          <Wordmark className="text-3xl" />
          <p className="table-label">Carregando</p>
        </div>
      </div>
    );
  }

  let screen: React.ReactNode;
  switch (run?.status) {
    case undefined:
      screen = <StartScreen />;
      break;
    case 'map':
      screen = <Lobby />;
      break;
    case 'table':
      screen = <TableScreen />;
      break;
    case 'challenge':
      screen = <ChallengeScreen />;
      break;
    case 'reward':
      screen = <ResultScreen />;
      break;
    case 'shop':
      screen = <ShopScreen />;
      break;
    case 'won':
    case 'lost':
      screen = <EndScreen />;
      break;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <GameHud />
      <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {/* `key` reinicia a animação de entrada a cada mudança de etapa. */}
        <div key={`${run?.status ?? 'start'}-${run?.layerIndex ?? 0}`}>{screen}</div>
      </main>
      <Notice />
    </div>
  );
}
