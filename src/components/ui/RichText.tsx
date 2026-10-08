/** Renderiza `código` e **negrito** em textos de enunciado, sem HTML bruto. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('`')) {
          return (
            <code
              key={index}
              className="rounded-lg bg-black/50 px-1.5 py-0.5 font-mono text-[0.9em] text-ivory ring-1 ring-white/25"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith('**')) {
          return (
            <strong key={index} className="font-bold text-ivory">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
