# DEVBet

**Bet on your skills.**

Programming roguelike where you bet on your coding skills. Você aprende **Python** resolvendo desafios de programação,
enquanto monta um deck de cartas que representam conceitos reais da linguagem.

As fichas são virtuais: não há dinheiro real, apostas reais nem compras dentro do jogo.

## Gameplay

```
Começar run → Desafio → Escolher risco → Escrever Python → Testes → Recompensa → Nova carta → … → Boss
```

- **Roguelike de programação.** Uma run é linear: seis mesas de aprendizado (FUNDAMENTALS, LOGIC, LOOPS, DATA, ALGORITHMS e HIGH TABLE), com lojas entre elas e um boss no final.
- **Python de verdade.** Você escreve código no editor (Monaco) e ele roda contra testes automáticos, incluindo testes ocultos que só aparecem na entrega.
- **Cartas são conceitos de Python:** VARIABLE, CONDITION, FOR, LIST, DICTIONARY, FUNCTION, RECURSION, entre outros. Elas nunca resolvem o código por você; só influenciam pontuação, multiplicador, risco e recompensa. A carta de um conceito que o desafio usa vale o dobro.
- **Combos** exigem dois conceitos na mão e no desafio. Exemplo: LIST + FOR = ITERATOR; FUNCTION + RECURSION = RECURSIVE ENGINE.
- **Risco/recompensa** com fichas fictícias: SAFE (×1.0), RISKY (×1.5) ou HIGH RISK (×2.0). Vencer multiplica as fichas ganhas; um Bust custa a aposta e uma vida.
- **Dealer.** Mentor ocasional que explica conceitos, reage a erros e oferece dicas em cinco níveis (Pergunta → Pista → Conceito → Exemplo parcial → Explicação), sempre a pedido do jogador.
- **Progressão.** XP e níveis desbloqueiam novas cartas. Perfil e run em andamento são salvos no `localStorage` do navegador.

## Desenvolvimento

Requer Node.js 20.9 ou superior (testado com Node 22).

```bash
npm install     # instala dependências e copia Monaco e Pyodide para public/
npm run dev     # http://localhost:3000
```

| Comando              | O que faz                                                      |
| -------------------- | -------------------------------------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento                                    |
| `npm run build`      | Build de produção                                              |
| `npm start`          | Serve o build de produção                                      |
| `npm test`           | Testes (Vitest). Levam cerca de 1 min porque carregam o Python |
| `npm run test:watch` | Testes em modo watch                                           |
| `npm run lint`       | ESLint                                                         |
| `npm run typecheck`  | TypeScript                                                     |
| `npm run format`     | Prettier (`format:check` apenas verifica)                      |
| `npm run check`      | lint + typecheck + testes + build                              |

### Estrutura

```
src/engine      Regras puras do jogo (cartas, combos, mãos, pontuação, run, loja, dicas, Dealer)
src/content     Desafios, áreas, mesas e trilha (dados)
src/runner      Fronteira de execução de código (CodeExecutor) e limites
src/lib         Persistência (SaveRepository) e reducer do jogo
src/components  Interface (ui/ = base, game/ = telas, dealer/, tables/, world/)
public/sandbox  Runner Python executado dentro do Web Worker
scripts         copy-assets.mjs: copia Monaco e Pyodide de node_modules para public/
```

`public/monaco` e `public/pyodide` são gerados por `scripts/copy-assets.mjs` (no `postinstall`, `predev` e `prebuild`) e não são versionados.

### Execução segura do código do jogador

O código do jogador nunca roda no servidor nem na thread principal. O Python executa com [Pyodide](https://pyodide.org) (CPython em WebAssembly) dentro de um Web Worker dedicado, com um interpretador novo a cada execução:

- CSP própria para o worker (`next.config.ts`): sem `eval` de JavaScript, sem outros workers e somente a própria origem como destino de rede;
- depois que o interpretador carrega, `fetch`, XHR, WebSocket e `importScripts` são removidos do escopo global;
- builtins reduzidos (sem `open`, `eval`, `exec`) e `import` restrito a `math`, `itertools`, `functools`, `collections`, `heapq`, `bisect` e `string`;
- timeout de 1,5 s com encerramento forçado do worker, limite de 4000 caracteres, 60 execuções por desafio e cooldown entre execuções.

Limitações: o navegador não permite limitar a memória de um worker, e a restrição de builtins é defesa em profundidade, não uma fronteira de segurança isolada. Antes de recursos como ranking ou contas, valide pontuações com um executor remoto implementando a interface `CodeExecutor` (`src/runner/types.ts`).

### Variáveis de ambiente

Nenhuma é obrigatória (veja `.env.example`).

| Variável                      | Padrão                  | Uso                                                |
| ----------------------------- | ----------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`        | `http://localhost:3000` | Base dos metadados Open Graph                      |
| `NEXT_PUBLIC_MONACO_BASE_URL` | `/monaco/vs`            | Origem do Monaco (CDN ou mirror próprio, opcional) |

## Deploy

O projeto é um app Next.js sem backend próprio e pode ser conectado à Vercel pelo GitHub:

1. Na Vercel, **Add New → Project** e importe este repositório (o framework Next.js é detectado; `vercel.json` já define `npm ci` e `npm run build`).
2. Opcional: defina `NEXT_PUBLIC_SITE_URL` com a URL de produção.
3. Cada push na branch de produção gera um deploy; pull requests geram previews.

Pelo `postinstall`/`prebuild`, o build copia o Monaco e o Pyodide de `node_modules`, então é reproduzível e não depende de CDN. A integração contínua (`.github/workflows/ci.yml`) roda format, lint, typecheck, testes e build a cada push na `main` e em pull requests.

## Evolução prevista

A persistência fica atrás de `SaveRepository` (`src/lib/storage.ts`) e a execução de código atrás de `CodeExecutor` (`src/runner/types.ts`), o que permite adicionar contas, ranking e cloud saves, ou um executor remoto, sem mexer nas regras do jogo. Conteúdo planejado: busca binária, ordenação, dois ponteiros e complexidade (ALGORITHMS), e `match` (LOGIC).
