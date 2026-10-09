# DEVBet

**Bet on your skills.**

Programming roguelike where you bet on your coding skills. Um jogo de cartas no estilo **Balatro** com tema de programação: você monta mãos de pôquer com cartas de conceitos de Python, responde a uma pergunta rápida a cada mão e aprende jogando. As perguntas seguem a apresentação **Fábrica de software** (software, programação, Python/Java/PHP, bibliotecas, frameworks, no-code, jogos e filmes).

As fichas são virtuais: não há dinheiro real, apostas reais nem compras dentro do jogo.

## Gameplay

O loop é o de um roguelike de cartas (blinds, mãos, descartes, jokers, loja). Cada mão que você joga traz **uma pergunta rápida** sobre o assunto da apresentação.

```
Blind (meta) → comprar 8 cartas → escolher 1–5 → Jogar mão → pergunta rápida → placar (fichas × mult) → … → blind vencida → loja → próxima blind → Boss
```

- **Blinds.** Uma run tem 5 antes (FUNDAMENTALS, LOGIC, LOOPS, DATA, HIGH TABLE) com 2 blinds cada: a blind normal e um boss que muda uma regra (máx. 3 cartas, cartas de CONTROLE anuladas, 1 mão a menos, sem descartes, e o boss final THE INFINITE LOOP). Cada blind dá **4 mãos** e **3 descartes**; bata a meta de pontos antes de as mãos acabarem.
- **Cartas são conceitos de Python** (VARIABLE, CONDITION, FOR, LIST, DICTIONARY, FUNCTION, RECURSION…). Você tem um baralho de 24 cartas e compra 8 a cada blind. As cartas jogadas formam mãos (PAIR, FLUSH, STRAIGHT, FULL HOUSE, ROYAL HAND) e combos de conceitos (LIST + FOR = ITERATOR…). A **primeira carta escolhida** decide o tema da pergunta (cada carta tem um tema) e vale o dobro; mãos de 4–5 cartas puxam as perguntas difíceis, e de 1–3 as fáceis.
- **Pergunta rápida.** Cada mão traz uma pergunta de múltipla escolha sobre o tema da primeira carta. Errar não trava: a alternativa errada some e a mão perde 15% de precisão por erro (mínimo 40%). Depois de acertar, o jogo mostra a explicação.
- **Placar.** Cada mão pontua (fichas × multiplicador): a mão certa, cada carta (a primeira carta da mão vale o dobro), combos e jokers, e por fim a precisão.
- **Jokers são idiomas de Python** (list comprehension, ternário, f-string, any/all…). Cada um dispara quando a sua mão tem as cartas daquele assunto (por exemplo, LIST + FOR) e mostra o que ensina, com um exemplo. A ordem dos jokers importa.
- **Loja.** Entre as blinds: jokers, cartas e aulas de mão (nível +10 fichas, +1 mult); fichas ganhas pela blind, pelas mãos que sobraram e juros.
- **Dealer.** Mentor ocasional que reage às respostas e acompanha a mesa. Nunca revela a resposta certa.
- **Primeira run guiada.** A primeira run é uma Tutorial Run: o Dealer ensina, passo a passo, o que existe no jogo (blind, mão, pergunta, placar, descartes, loja e jokers, boss). Cada passo só avança com a ação real. Terminar a run (vencendo, perdendo ou abandonando) encerra o tutorial para sempre.
- **Progressão.** XP e nível só desbloqueiam cartas nas lojas. Perfil e run em andamento são salvos no `localStorage`, inclusive o resultado da última run. **Abandonar run** está disponível em qualquer etapa.

## Desenvolvimento

Requer Node.js 20.9 ou superior (testado com Node 22).

```bash
npm install
npm run dev     # http://localhost:3000
```

| Comando              | O que faz                                 |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento               |
| `npm run build`      | Build de produção                         |
| `npm start`          | Serve o build de produção                 |
| `npm test`           | Testes (Vitest)                           |
| `npm run test:watch` | Testes em modo watch                      |
| `npm run lint`       | ESLint                                    |
| `npm run typecheck`  | TypeScript                                |
| `npm run format`     | Prettier (`format:check` apenas verifica) |
| `npm run check`      | lint + typecheck + testes + build         |

### Estrutura

```
src/engine      Regras puras do jogo (cartas, combos, mãos, jokers, placar, blinds, loja, Dealer)
src/content     Perguntas (quiz), áreas e mesas (dados)
src/lib         Persistência (SaveRepository), reducer do jogo e placar de líderes
src/components  Interface (ui/ = base, game/ = telas, dealer/, tables/, leaderboard/)
```

### Testes de navegador (e2e)

Os scripts em `e2e/` dirigem o jogo real no Chromium via `playwright-core` (devDependency; nada global, sem `NODE_PATH`). Requisitos: Node >= 22.18 (lê as respostas certas direto de `src/content/quiz.ts`) e um Chromium.

```bash
npm run build && npx next start -p 3100 &           # servidor de produção local
npx playwright-core install chromium                # ou: export PLAYWRIGHT_CHROMIUM_PATH=/caminho/do/chromium
npm run e2e:flow                # blind → mão → pergunta → placar → loja → boss   (mobile: npm run e2e:flow -- mobile)
npm run e2e:tutorial            # Tutorial Run completa, desktop 1280x900
npm run e2e:tutorial:mobile     # idem, 390x844
npm run e2e:edge                # regras de boss, loja, derrota e vitória        (mobile: npm run e2e:edge -- mobile)
npm run e2e:tabs                # duas abas / run encerrada
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

**Moderação.** `/admin` (sem link no site, fora dos buscadores) lista os registros e permite apagar um nome impróprio, ou apagar e bloquear o jogador. Entra com a conta de e-mail e senha criada no console do Firebase (Authentication → Users); o UID dela vai em `isAdmin()` no `firestore.rules`. Só essa conta apaga: as regras do Firestore é que decidem, não a interface.

A aba **Respostas** do `/admin` mostra, para cada pergunta, o percentual de cada alternativa e os apelidos de quem a marcou (toque na pergunta para ver os nomes). O jogo grava cada alternativa marcada em `answers/{pergunta}__{uid}`; só o administrador lê essa coleção.

Teste da interface: `node e2e/leaderboard.js off` (build sem as variáveis) e `node e2e/leaderboard.js configured` (build com valores de teste em `NEXT_PUBLIC_FIREBASE_*`). O login real e a gravação no Firestore dependem do seu projeto e precisam de teste manual.

### Variáveis de ambiente

Nenhuma é obrigatória (veja `.env.example`).

| Variável               | Padrão                  | Uso                           |
| ---------------------- | ----------------------- | ----------------------------- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Base dos metadados Open Graph |

## Deploy

O projeto é um app Next.js sem backend próprio e pode ser conectado à Vercel pelo GitHub:

1. Na Vercel, **Add New → Project** e importe este repositório (o framework Next.js é detectado; `vercel.json` já define `npm ci` e `npm run build`).
2. Opcional: defina `NEXT_PUBLIC_SITE_URL` com a URL de produção.
3. Cada push na branch de produção gera um deploy; pull requests geram previews.

A integração contínua (`.github/workflows/ci.yml`) roda format, lint, typecheck, testes e build a cada push na `main` e em pull requests.

## Evolução prevista

A persistência fica atrás de `SaveRepository` (`src/lib/storage.ts`), o que permite adicionar cloud saves sem mexer nas regras do jogo. Mais perguntas e novos jokers entram só como dados (`src/content/quiz.ts`, `src/engine/jokers.ts`).

## Créditos de arte

- **Fonte:** PixelAE (Ahmed Essam), em `public/fonts`. Licença de uso confirmada pelo autor do projeto.
- **Ícones:** Lucid Icons, de Midhil ([Leo Red]), licença CC0, em `public/icons` (licença em `public/icons/LICENSE-Lucid.txt`).
- **Dealer:** folha de emojis em pixel art (`public/sprites/dealer.png`, 16 quadros de 24 px) fornecida pelo autor do projeto; a folha original traz a assinatura "ihib". Licença de uso confirmada pelo autor do projeto.
- **Botões, caça-níqueis, fichas e verso das cartas:** Pixel UI pack (Kenney, CC0), Casino Tileset (Jephed, Game Between The Lines; uso livre com crédito), Poker Pack (Screaming Brain Studios, CC0) e pacote de botões fornecido pelo autor do projeto (licença de uso confirmada por ele). Arquivos em `public/ui` e `public/sprites`.
- Cartas, naipes e jokers são desenhados em código (`src/components/ui/PixelSuit.tsx`, `jokerArt.ts`).
