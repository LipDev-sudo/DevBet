/** Marca DEVBet: "DEV" em mono (tecnologia) + "Bet" em sans pesado e vermelho (risco). */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline leading-none select-none ${className}`}
      aria-label="DEVBet"
    >
      <span aria-hidden="true" className="font-mono font-bold tracking-tight text-ivory">
        DEV
      </span>
      <span aria-hidden="true" className="font-sans font-black tracking-tight text-crimson-hot">
        Bet
      </span>
    </span>
  );
}
