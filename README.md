# DEVBet

**Bet on your skills.**

Programming roguelike where you bet on your coding skills. Você aprende **Python** resolvendo desafios de programação,
enquanto monta um deck de cartas que representam conceitos reais da linguagem.

As fichas são virtuais: não há dinheiro real, apostas reais nem compras dentro do jogo.

## Gameplay

O loop é o de um roguelike de cartas (blinds, mãos, descartes, jokers, loja), com uma diferença: **cada mão que você joga vira um exercício de Python**.

```
Blind (meta) → comprar 8 cartas → escolher 1–5 → Jogar mão → exercício de código → placar (fichas × mult) → … → blind vencida → loja → próxima blind → Boss
```

- **Blinds.** Uma run tem 5 antes (FUNDAMENTALS, LOGIC, LOOPS, DATA, HIGH TABLE) com 2 blinds cada: a blind normal e um boss que muda uma regra (máx. 3 cartas, cartas de CONTROLE anuladas, 1 mão a menos, sem descartes, e o boss final THE INFINITE LOOP). Cada blind dá **4 mãos** e **3 descartes**; bata a meta de pontos antes de as mãos acabarem.
- **Cartas são conceitos de Python** (VARIABLE, CONDITION, FOR, LIST, DICTIONARY, FUNCTION, RECURSION…). Você tem um baralho de 24 cartas e compra 8 a cada blind. As cartas jogadas formam mãos (PAIR, FLUSH, STRAIGHT, FULL HOUSE, ROYAL HAND) e combos de conceitos (LIST + FOR = ITERATOR…). A **primeira carta escolhida** decide o assunto do exercício; mãos de 4–5 cartas pedem um desafio completo, e de 1–3 um mini-desafio.
- **Python de verdade.** Você escreve código no editor (Monaco). **Executar** testa à vontade (só os testes visíveis, sem custo, até 60 vezes por exercício). **Entregar** roda também os testes ocultos; entrega errada custa 10% de precisão e nunca é bloqueado. **Desistir** gasta a mão e vale 0.
- **Placar.** Cada mão pontua (fichas × multiplicador): a mão certa, cada carta (o efeito dobra quando o exercício usa o conceito dela), combos e jokers, e por fim a precisão (erros e dicas pagas).
- **Jokers são idiomas de Python** (list comprehension, ternário, f-string, any/all, builtins…) e só disparam quando o código que você **entrega** realmente usa o idioma. Cada joker mostra o que ensina e um exemplo.
- **Loja.** Entre as blinds: jokers, cartas e aulas de mão (nível +10 fichas, +1 mult); fichas ganhas pela blind, pelas mãos que sobraram e juros.
- **Dealer.** Mentor ocasional que reage ao tipo real do erro e oferece dicas em cinco níveis (Pergunta → Pista → Conceito → Exemplo parcial → Explicação), sempre a pedido do jogador. O custo de cada dica aparece antes de pedir.
- **Primeira run guiada.** A primeira run é uma Tutorial Run: o Dealer ensina, passo a passo, o que existe no jogo (blind, mão, exercício, placar, descartes, loja e jokers, boss). Cada passo só avança com a ação real. Terminar a run (vencendo, perdendo ou abandonando) encerra o tutorial para sempre.
- **Progressão.** XP e nível só desbloqueiam cartas nas lojas. Perfil e run em andamento são salvos no `localStorage`, inclusive o resultado da última run. **Abandonar run** está disponível em qualquer etapa.

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
src/engine      Regras puras do jogo (cartas, combos, mãos, jokers, placar, blinds, loja, dicas, Dealer)
src/content     Desafios, mini-desafios, áreas e mesas (dados)
src/runner      Fronteira de execução de código (CodeExecutor) e limites
src/lib         Persistência (SaveRepository) e reducer do jogo
src/components  Interface (ui/ = base, game/ = telas, dealer/, tables/)
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
npm run e2e:flow                # blind → mão → exercício → placar → loja → boss   (mobile: npm run e2e:flow -- mobile)
npm run e2e:tutorial            # Tutorial Run completa, desktop 1280x900
npm run e2e:tutorial:mobile     # idem, 390x844
npm run e2e:edge                # regras de boss, loja, derrota e vitória        (mobile: npm run e2e:edge -- mobile)
npm run e2e:integrity -- 4      # editor, Executar/Entregar, reload, abandono    (argumentos: <cpu 1|4|8> [mobile])
npm run e2e:limits              # 60 execuções e Desistir
npm run e2e:tabs                # duas abas / run encerrada
npm run e2e:sandbox             # recursos bloqueados, mensagens de erro, código > 4000 caracteres
npm run e2e:keyboard            # fluxo completo só por teclado (foco, modais, cartas, loja)
npm run e2e:persist -- 120      # reload <ms> após cada ação; hidratação sem escrita
npm run e2e:leaderboard -- off  # placar desligado/ligado (veja a seção do placar)
npm run e2e:screens             # screenshots desktop/mobile + checagem de overflow e alvos de toque
```

Variáveis: `DEVBET_URL` (padrão `http://localhost:3100`), `PLAYWRIGHT_CHROMIUM_PATH`, `E2E_OUT` (screenshots; padrão `e2e/.out`, ignorado pelo git). Cada script termina com `ERRORS []`; os que fazem asserções terminam com `RESULT: ALL PASS`.

### Placar de líderes (Firebase)

Top 20 em tempo real. É **opcional**: sem as variáveis `NEXT_PUBLIC_FIREBASE_*` o placar fica desligado e o jogo funciona normalmente. Para entrar no placar é **obrigatório** entrar com Google; só o apelido (2–16 caracteres) aparece, nunca e-mail ou nome.

1. Console do Firebase → crie o projeto → **Authentication** → ative o provedor **Google** → em _Authorized domains_ adicione o domínio do jogo.
2. **Firestore Database** → crie o banco (modo de produção) → em _Regras_, publique o conteúdo de `firestore.rules`. Elas permitem leitura pública do ranking e só deixam o próprio jogador (login Google) gravar o próprio registro, com campos e limites fixos e só para um resultado melhor que o anterior.
3. _Configurações do projeto → Seus apps → Web_: copie `apiKey`, `authDomain`, `projectId` e `appId` para as variáveis de `.env.example` (localmente em `.env.local`; na Vercel em _Settings → Environment Variables_). Essas chaves não são secretas; as regras protegem os dados.
4. Faça um novo deploy. Os números do ranking vêm da pontuação total da run (`score`), um registro por jogador.

Limitação: o jogo roda no navegador, então as regras só barram valores impossíveis (pontuação máxima, campos inválidos); não provam que a run foi jogada de verdade. Modere pelo console do Firestore se precisar.

Teste da interface: `node e2e/leaderboard.js off` (build sem as variáveis) e `node e2e/leaderboard.js configured` (build com valores de teste em `NEXT_PUBLIC_FIREBASE_*`). O login real e a gravação no Firestore dependem do seu projeto e precisam de teste manual.

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
