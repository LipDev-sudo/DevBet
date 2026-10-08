'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch } from 'react';
import { createProfile } from '@/engine/progression';
import { gameReducer, initialGameState, type GameAction, type GameState } from '@/lib/game-state';
import { createLocalStorageRepository, type SaveRepository } from '@/lib/storage';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  repository: SaveRepository;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const repository = useMemo(() => createLocalStorageRepository(), []);
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    initialGameState(createProfile()),
  );

  // O estado salvo só existe no navegador: carrega depois da hidratação para não divergir do HTML do servidor.
  useEffect(() => {
    dispatch({ type: 'hydrate', profile: repository.loadProfile(), run: repository.loadRun() });
  }, [repository]);

  useEffect(() => {
    if (!state.hydrated) return;
    const timer = setTimeout(() => {
      repository.saveProfile(state.profile);
      repository.saveRun(
        state.run && state.run.status !== 'won' && state.run.status !== 'lost' ? state.run : null,
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [repository, state.hydrated, state.profile, state.run]);

  const value = useMemo(() => ({ state, dispatch, repository }), [state, repository]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame precisa estar dentro de <GameProvider>.');
  return context;
}
