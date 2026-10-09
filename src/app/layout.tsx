import type { Metadata, Viewport } from 'next';
import { GameProvider } from '@/components/game/GameProvider';
import { AccountProvider } from '@/components/leaderboard/AccountProvider';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'DEVBet — Bet on your skills.', template: '%s · DEVBet' },
  description:
    'Roguelike de cartas em que programar é a jogabilidade. Escreva código, monte combos e vença a mesa.',
  openGraph: {
    title: 'DEVBet — Bet on your skills.',
    description: 'Aprenda programação escrevendo código de verdade.',
    type: 'website',
    locale: 'pt_BR',
  },
};

export const viewport: Viewport = { themeColor: '#06080d' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-ivory focus:px-3 focus:py-2 focus:text-ink"
        >
          Pular para o conteúdo
        </a>
        <AccountProvider>
          <GameProvider>{children}</GameProvider>
        </AccountProvider>
      </body>
    </html>
  );
}
