import type { Metadata } from 'next';
import { PlayShell } from '@/components/game/PlayShell';

export const metadata: Metadata = { title: 'Mesa de jogo' };

export default function PlayPage() {
  return <PlayShell />;
}
