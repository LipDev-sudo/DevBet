'use client';

import { Wordmark } from '@/components/ui/Wordmark';
import { DealerCorner } from './DealerCorner';
import { GameHud } from './GameHud';
import { useGame } from './GameProvider';
import { AbandonRun } from './AbandonRun';
import { Notice } from './Notice';
import { TutorialCoach } from './TutorialCoach';
import { EndScreen } from './screens/EndScreen';
import { BlindScreen } from './screens/BlindScreen';
import { ClearedScreen } from './screens/ClearedScreen';
import { QuizScreen } from './screens/QuizScreen';
import { RoundScreen } from './screens/RoundScreen';
import { ScoreScreen } from './screens/ScoreScreen';
import { ShopScreen } from './screens/ShopScreen';
import { StartScreen } from './screens/StartScreen';

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
    case 'blind':
      screen = <BlindScreen />;
      break;
    case 'round':
      screen = <RoundScreen />;
      break;
    case 'quiz':
      screen = <QuizScreen />;
      break;
    case 'scored':
      screen = <ScoreScreen />;
      break;
    case 'cleared':
      screen = <ClearedScreen />;
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
    <div className="table-felt flex min-h-screen flex-col">
      <GameHud />
      <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <TutorialCoach />
        {/* `key` reinicia a animação de entrada a cada mudança de etapa. */}
        <div key={`${run?.status ?? 'start'}-${run?.ante ?? 0}-${run?.blindIndex ?? 0}`}>
          {screen}
        </div>
        <AbandonRun />
      </main>
      <DealerCorner />
      <Notice />
    </div>
  );
}
