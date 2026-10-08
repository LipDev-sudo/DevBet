# DEVBet

**Bet on your skills.**

Programming roguelike where you bet on your coding skills. Você aprende **Python** resolvendo desafios de programação,
enquanto monta um deck de cartas que representam conceitos reais da linguagem.

As fichas são virtuais: não há dinheiro real, apostas reais nem compras dentro do jogo.

## Gameplay

```
Começar run → Desafio → Escolher risco → Escrever Python → Testes → Recompensa → Nova carta → … → Boss
```

- **Roguelike de programação.** Uma run é linear: seis mesas de aprendizado (FUNDAMENTALS, LOGIC, LOOPS, DATA, ALGORITHMS e HIGH TABLE), com lojas entre elas e um boss no final. As mesas têm identidade visual própria; o cenário não dá bônus.
- **Python de verdade.** Você escreve código no editor (Monaco). **Executar** testa à vontade (só os testes visíveis, sem custo de pontos, até 60 vezes por desafio). **Entregar** roda também os testes ocultos: uma entrega errada custa 8% de precisão e entregar nunca é bloqueado. **Desistir** é sempre possível e conta como Bust.
- **Cartas são conceitos de Python:** VARIABLE, CONDITION, FOR, LIST, DICTIONARY, FUNCTION, RECURSION, entre outros. Elas nunca resolvem o código por você: cada carta soma fichas e multiplicador, e o efeito dobra quando o desafio usa o conceito dela. Você começa com 7 cartas e recebe uma mão de 5; **Trocar mão** sorteia outra mão (uma vez por mesa).
- **Combos de conceitos** exigem as duas cartas na mão e que o desafio use os dois conceitos. Exemplo: LIST + FOR = ITERATOR; FUNCTION + RECURSION = RECURSIVE ENGINE. A **sequência** de vitórias seguidas é outro bônus, separado.
- **Risco/recompensa** com fichas fictícias: SAFE (×1.0), RISKY (×1.5, aposta 10) ou HIGH RISK (×2.0, aposta 25). O risco não muda a meta nem a chance de Bust: muda quanto você ganha e quanto pode perder. Vencer devolve a aposta e paga a recompensa multiplicada; um Bust custa a aposta e uma vida. Sem vidas, a run termina.
- **Dealer.** Mentor ocasional que explica conceitos, reage ao tipo real do erro e oferece dicas em cinco níveis (Pergunta → Pista → Conceito → Exemplo parcial → Explicação), sempre a pedido do jogador. O custo de cada dica aparece antes de pedir.
- **Primeira run guiada.** A primeira run de cada jogador é uma Tutorial Run: o Dealer ensina, passo a passo, o que já existe no jogo (cartas, combo de conceitos, Executar × Entregar, risco, Bust e vidas, dicas, loja e boss). Cada passo só avança com a ação real; as regras são as de sempre. Terminar a run (vencendo, perdendo ou abandonando) encerra o tutorial para sempre.
- **Progressão.** XP e nível só desbloqueiam cartas nas lojas e recompensas. Perfil e run em andamento são salvos no `localStorage` do navegador, inclusive o resultado da última run até você começar outra. **Abandonar run** está disponível em qualquer etapa.

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

### Testes de navegador (e2e)

Os scripts em `e2e/` dirigem o jogo real no Chromium via `playwright-core` (devDependency; nada global, sem `NODE_PATH`). Requisitos: Node >= 22.18 (lê as soluções de referência direto de `src/content/challenges.ts`) e um Chromium.

```bash
npm run build && npx next start -p 3100 &           # servidor de produção local
npx playwright-core install chromium                # ou: export PLAYWRIGHT_CHROMIUM_PATH=/caminho/do/chromium
npm run e2e:tutorial            # Tutorial Run completa, desktop 1280x900
npm run e2e:tutorial:mobile     # idem, 390x844
npm run e2e:edge                # loja, seguro, última vida, reload   (mobile: npm run e2e:edge -- mobile)
npm run e2e:integrity -- 4      # executar/entregar, reload, abandono (argumentos: <cpu 1|4|8> [mobile])
npm run e2e:tabs                # duas abas / run encerrada
npm run e2e:sandbox             # recursos bloqueados, mensagens de erro, código > 4000 caracteres
npm run e2e:keyboard            # fluxo completo só por teclado (foco, modais, risco, loja)
npm run e2e:persist -- 120      # reload <ms> após cada ação; hidratação sem escrita
npm run e2e:screens             # screenshots desktop/mobile + checagem de overflow e alvos de toque
```

Variáveis: `DEVBET_URL` (padrão `http://localhost:3100`), `PLAYWRIGHT_CHROMIUM_PATH`, `E2E_OUT` (screenshots; padrão `e2e/.out`, ignorado pelo git). Cada script termina com `ERRORS []`; os que fazem asserções (`integrity`, `sandbox`, `keyboard`, `persist`) terminam com `RESULT: ALL PASS`.

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
