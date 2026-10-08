/** Tipos esperados vêm de JSON; usamos os mesmos nomes que o runner Python devolve. */
export function typeOfValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number' && Number.isNaN(value)) return 'nan';
  return typeof value;
}

function pyString(text: string): string {
  const quote = text.includes("'") && !text.includes('"') ? '"' : "'";
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(quote === "'" ? /'/g : /"/g, `\\${quote}`);
  return `${quote}${escaped}${quote}`;
}

/** Mostra um valor esperado (JSON) com a sintaxe de Python, como `repr()` faria. */
export function showValue(value: unknown, depth = 0): string {
  switch (typeOfValue(value)) {
    case 'null':
      return 'None';
    case 'boolean':
      return value ? 'True' : 'False';
    case 'string':
      return pyString(value as string);
    case 'array': {
      if (depth > 3) return '[…]';
      return `[${(value as unknown[]).map((item) => showValue(item, depth + 1)).join(', ')}]`;
    }
    case 'object': {
      if (depth > 3) return '{…}';
      const entries = Object.entries(value as Record<string, unknown>).map(
        ([key, item]) => `${pyString(key)}: ${showValue(item, depth + 1)}`,
      );
      return `{${entries.join(', ')}}`;
    }
    default:
      return String(value);
  }
}
