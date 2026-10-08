import Link from 'next/link';
import { Wordmark } from './Wordmark';

export function Brand({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center ${className}`} aria-label="DEVBet — início">
      <Wordmark className="text-xl" />
    </Link>
  );
}
