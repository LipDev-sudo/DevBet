'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dealer } from '@/components/dealer/Dealer';
import { DealerDialogue } from '@/components/dealer/DealerDialogue';
import { DealerHint } from '@/components/dealer/DealerHint';
import { TableEnvironment } from '@/components/tables/TableEnvironment';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { RichText } from '@/components/ui/RichText';
import { getExercise } from '@/content/exercises';
import { getTableByArea } from '@/content/tables';
import { briefChallenge, reactToRun, restingMood, type DealerLine } from '@/engine/dealer';
import { playSfx } from '@/lib/sfx';
import { buildFeedback, TOP_LEVEL_ERROR_PREFIX, type Feedback } from '@/engine/feedback';
import { isRealExecution, tutorialGate } from '@/engine/tutorial';
import { hintBlockedReason, HINT_LABEL, hintCost, nextHintLevel } from '@/engine/hints';
import { ANTES, handLevel, playedCards } from '@/engine/blind';
import { FAIL_PENALTY, previewPlay, SOLUTION_FACTOR } from '@/engine/handscore';
import { TOPIC_LABEL } from '@/engine/types';
import { createBrowserExecutor } from '@/runner/browser-executor';
import { checkRunAllowed, DENIAL_MESSAGE } from '@/runner/guard';
import { RUN_LIMITS, type ExecutionReport, type TestResult } from '@/runner/types';
import { CodeEditor } from '../CodeEditor';
import { useGame } from '../GameProvider';

function errorText(result: TestResult): string {
  const error = result.error;
  return error
    ? `${error.name}${error.line ? ` (linha ${error.line})` : ''}: ${error.message}`
    : '';
}

function TestRow({
  name,
  expr,
  hidden,
  result,
  ran,
  repeatedError = false,
}: {
  name: string;
  expr: string;
  hidden: boolean;
  result?: TestResult;
  ran: boolean;
  /** O mesmo erro de execução já apareceu no teste de cima: não repete a mensagem. */
  repeatedError?: boolean;
}) {
  const state = !result || result.skipped ? 'pending' : result.passed ? 'pass' : 'fail';
  const icon = state === 'pass' ? '✓' : state === 'fail' ? '✕' : hidden ? '🂠' : '○';
  const tone =
    state === 'pass' ? 'text-win' : state === 'fail' ? 'text-crimson-hot' : 'text-ivory-dim';
  const revealed = !hidden || (ran && result !== undefined);

  return (
    <li className="rounded-lg bg-black/35 px-3 py-2 ring-1 ring-white/5">
      <div className="flex items-start gap-2.5">
        <span
          key={state}
          aria-hidden="true"
          className={`mt-0.5 w-4 shrink-0 text-center font-bold ${tone} ${state === 'pass' ? 'bump' : ''}`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ivory">
            {hidden && !revealed ? 'Teste oculto' : name}
            <span className="sr-only">
              {' '}
              — {state === 'pass' ? 'passou' : state === 'fail' ? 'falhou' : 'ainda não executado'}
            </span>
          </p>
          {revealed && <p className="mt-0.5 font-mono text-xs break-all text-ivory-dim">{expr}</p>}
          {hidden && !revealed && (
            <p className="mt-0.5 text-xs text-ivory-dim">A casa vira esta carta na entrega.</p>
          )}
          {result && state === 'fail' && !result.skipped && (
            <p className="mt-1 font-mono text-xs break-all text-crimson-hot">
              {result.timedOut
                ? 'não terminou a tempo'
                : result.error
                  ? repeatedError
                    ? `${result.error.name}: mesmo erro do teste acima`
                    : errorText(result)
                  : `esperado ${result.expectedText} · recebido ${result.actualText}`}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export function ChallengeScreen() {
  const { state, dispatch } = useGame();
  const run = state.run;
  const encounter = run?.round?.play ?? null;
  const challenge = encounter ? getExercise(encounter.exerciseId) : null;

  const executor = useMemo(() => createBrowserExecutor(), []);
  // Começa a carregar o Python já ao abrir o desafio: a primeira execução não espera.
  useEffect(() => {
    executor.warmUp?.();
    return () => executor.dispose?.();
  }, [executor]);
  const [code, setCode] = useState(() => encounter?.draft ?? challenge?.starterCode ?? '');
  /** Muda quando o código é trocado de fora do editor ("Usar no editor"). */
  const [editorReset, setEditorReset] = useState(0);
  const [report, setReport] = useState<ExecutionReport | null>(null);
  const [lastKind, setLastKind] = useState<'run' | 'submit' | null>(null);
  const [running, setRunning] = useState(false);
  /** Reação do Dealer à última execução; `null` = fala de repouso. */
  const [reaction, setReaction] = useState<{ line: DealerLine; feedback: Feedback | null } | null>(
    null,
  );
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [confirmSolution, setConfirmSolution] = useState(false);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const hintLevelNow = encounter?.hintLevel ?? 0;
  const previousHintLevel = useRef(hintLevelNow);
  /** O jogador digitou há pouco: o Dealer acompanha o código. */
  const [typing, setTyping] = useState(false);
  const typedOnce = useRef(false);
  const lastRunAt = useRef<number | null>(null);
  const dealerRef = useRef<HTMLDivElement>(null);

  // Referências para callbacks estáveis (atalho do editor) sempre enxergarem o valor mais novo.
  const latest = useRef({ code, encounter, running });
  useEffect(() => {
    latest.current = { code, encounter, running };
  });

  // Uma reação nova do Dealer (erro, parcial…) fica à vista, perto do editor que a causou.
  useEffect(() => {
    if (reaction) dealerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [reaction]);

  // Ao chegar ao nível 5, a explicação completa abre sozinha uma vez.
  useEffect(() => {
    if (hintLevelNow === 5 && previousHintLevel.current < 5) setSolutionOpen(true);
    previousHintLevel.current = hintLevelNow;
  }, [hintLevelNow]);

  useEffect(() => {
    if (!typedOnce.current) {
      typedOnce.current = true;
      return;
    }
    setTyping(true);
    const timer = setTimeout(() => setTyping(false), 2500);
    return () => clearTimeout(timer);
  }, [code]);

  // Rascunho persistido com debounce: recarregar a página não perde o código.
  useEffect(() => {
    const timer = setTimeout(() => dispatch({ type: 'draft', code }), 600);
    return () => clearTimeout(timer);
  }, [code, dispatch]);

  const execute = useCallback(
    async (kind: 'run' | 'submit') => {
      const { code: current, encounter: enc, running: busy } = latest.current;
      if (!enc || busy) return;
      const target = getExercise(enc.exerciseId);

      const denial = checkRunAllowed({
        kind,
        code: current,
        runsUsed: enc.runsUsed,
        lastRunAt: lastRunAt.current,
        now: Date.now(),
      });
      if (denial) {
        setReaction({
          line: { mood: 'error', kind: 'limit', text: DENIAL_MESSAGE[denial] },
          feedback: null,
        });
        return;
      }

      lastRunAt.current = Date.now();
      setRunning(true);
      // Só Executar gasta uma das execuções de teste; Entregar nunca fica sem saída por causa delas.
      if (kind === 'run') dispatch({ type: 'ran' });

      const tests = kind === 'submit' ? target.tests : target.tests.filter((t) => !t.hidden);
      const result = await executor.run({ code: current, tests });
      setRunning(false);
      // Para o tutorial: só conta como execução quando o executor Python realmente devolveu um relatório.
      if (kind === 'run' && isRealExecution(result)) {
        dispatch({ type: 'tutorial', event: { kind: 'executed' } });
      }
      setReport(result);
      setLastKind(kind);

      const allPassed = result.status === 'ok' && result.tests.every((t) => t.passed);
      if (allPassed && kind === 'submit') {
        playSfx('correct');
        dispatch({ type: 'submit', code: current });
        return;
      }
      const failures = enc.failedRuns + (allPassed ? 0 : 1);
      const line = reactToRun({
        report: result,
        allPassed,
        hasHidden: target.tests.some((t) => t.hidden),
        failures,
        hintLevel: enc.hintLevel,
      });
      if (allPassed) {
        setReaction({ line, feedback: null });
        return;
      }
      playSfx('error');
      dispatch({ type: 'failed', kind });
      setReaction({ line, feedback: buildFeedback(target, result, failures) });
    },
    [dispatch, executor],
  );

  if (!run || !encounter || !challenge) return null;

  const hand = playedCards(run);
  const preview = previewPlay(
    hand,
    challenge.concepts,
    handLevel(run, previewPlay(hand, []).rank.id),
  );
  const table = getTableByArea(ANTES[run.ante]?.areaId ?? 'fundamentos');
  const hintLevel = encounter.hintLevel;
  const nextHint = nextHintLevel(challenge, hintLevel);
  const cost = hintCost(challenge, hintLevel);
  const hintBlocked = hintBlockedReason(challenge, hintLevel, encounter.failedRuns);
  const hintTitle = hintBlocked ?? (cost ? `Custo desta dica: ${cost.label}.` : undefined);
  const runsLeft = RUN_LIMITS.maxRunsPerChallenge - encounter.runsUsed;
  const gate = tutorialGate(run);
  const restMood = restingMood(table.tone, challenge);
  const idleLine: DealerLine = { mood: restMood, kind: 'brief', text: briefChallenge(challenge) };
  const dealerLine = reaction?.line ?? idleLine;
  const watching = !reaction && (typing || running);
  const sceneMood = reaction ? reaction.line.mood : watching ? 'thinking' : restMood;
  const isBoss = Boolean(challenge.boss);
  const visibleTests = challenge.tests.filter((t) => !t.hidden);
  const hiddenTests = challenge.tests.filter((t) => t.hidden);
  const resultByName = new Map(report?.tests.map((t) => [t.name, t] as const));
  // Um erro de execução igual em vários testes aparece uma vez só; o Dealer explica a causa.
  const repeatedErrors = new Set<string>();
  const seenErrors = new Set<string>();
  for (const test of [...visibleTests, ...hiddenTests]) {
    const result = resultByName.get(test.name);
    if (!result || result.passed || result.skipped || result.timedOut || !result.error) continue;
    const text = errorText(result);
    if (seenErrors.has(text)) repeatedErrors.add(test.name);
    seenErrors.add(text);
  }
  const tooLong = code.length > RUN_LIMITS.maxCodeLength;
  // O erro de carregamento já aparece no Dealer e nos testes: o console mostra só o que o código imprimiu.
  const consoleLogs = (report?.logs ?? []).filter((log) => !log.startsWith(TOP_LEVEL_ERROR_PREFIX));
  const passedCount = report ? report.tests.filter((t) => t.passed).length : 0;

  return (
    <div className="screen-focus space-y-4">
      <TableEnvironment table={table} feltHeight="8.5rem" inlay={false}>
        <div className="grid gap-4 p-4 pt-2 sm:p-5 sm:pt-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className={`table-label ${isBoss ? '!text-crimson-hot' : ''}`}>
              {challenge.id.startsWith('mini-') ? 'Mini-desafio' : 'Desafio'} ·{' '}
              {TOPIC_LABEL[challenge.topic]}
            </p>
            <h1
              id="desafio-titulo"
              className={`mt-1 text-2xl font-black tracking-tight sm:text-3xl ${isBoss ? 'text-crimson-hot' : 'text-ivory'}`}
            >
              {challenge.title}
            </h1>
            <p className="mt-2 text-sm text-ivory-dim italic">{challenge.context}</p>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-ivory/90 sm:text-[0.95rem]">
              {challenge.objective.map((paragraph, index) => (
                <p key={index}>
                  <RichText text={paragraph} />
                </p>
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Conceitos usados neste desafio">
              {challenge.concepts.map((id) => {
                const inHand = hand.some((card) => card.cardId === id);
                return (
                  <li
                    key={id}
                    title={
                      inHand
                        ? 'Você jogou esta carta: efeito dobrado.'
                        : 'Conceito do exercício (sem carta jogada)'
                    }
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[0.7rem] ring-1 ${inHand ? 'text-gold-light ring-gold/60' : 'text-ivory-dim ring-white/15'}`}
                  >
                    {id.toUpperCase()}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex flex-col items-center lg:w-[26rem]">
            <div className="hidden lg:block">
              <Dealer
                mood={sceneMood}
                tone={table.tone}
                lamp={table.scene.lamp}
                className="h-36 w-[7.2rem]"
              />
            </div>
            <ul className="relative flex gap-1.5 lg:-mt-9" aria-label="Cartas jogadas">
              {hand.map((card) => (
                <li key={card.uid}>
                  <PlayingCard
                    cardId={card.cardId}
                    upgrade={card.upgrade}
                    size="xs"
                    boosted={challenge.concepts.includes(card.cardId)}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ivory-dim">
              <span className="font-bold text-ivory">{preview.rank.name}</span> · {preview.chips}{' '}
              fichas × {preview.mult} mult
              <span className="sr-only"> (mínimo, sem jokers)</span>
            </p>
          </div>
        </div>
      </TableEnvironment>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <section
          aria-label="Editor"
          data-tutorial="editor"
          className="panel flex min-h-[22rem] flex-col overflow-hidden rounded-lg lg:h-[34rem]"
        >
          <div className="flex items-center justify-between border-b border-white/15 bg-black/40 px-4 py-2 text-xs">
            <span className="font-mono text-ivory-dim">solucao.py</span>
            <span
              className={`font-mono tabular-nums ${tooLong ? 'text-crimson-hot' : 'text-ivory-dim'}`}
            >
              {code.length}/{RUN_LIMITS.maxCodeLength}
            </span>
          </div>
          {tooLong && (
            <p
              role="alert"
              className="border-b border-crimson-hot/40 bg-wine/40 px-4 py-1.5 text-xs text-crimson-hot"
            >
              O código passou do limite de {RUN_LIMITS.maxCodeLength} caracteres: Executar e
              Entregar ficam indisponíveis até você reduzi-lo.
            </p>
          )}
          <div className="min-h-0 flex-1">
            <CodeEditor
              value={code}
              resetKey={editorReset}
              onChange={setCode}
              onRun={() => void execute('run')}
            />
          </div>
        </section>

        <aside aria-label="Testes e feedback" className="space-y-4">
          <div ref={dealerRef}>
            <DealerDialogue
              text={dealerLine.text}
              nudge={dealerLine.nudge}
              kind={dealerLine.kind}
              mood={sceneMood}
              tone={table.tone}
              lamp={table.scene.lamp}
              avatarClass="hidden sm:block lg:hidden"
              extra={
                <DealerHint
                  challenge={challenge}
                  level={hintLevel}
                  onOpenExplanation={() => setSolutionOpen(true)}
                />
              }
              detail={
                reaction?.feedback ? (
                  <>
                    <strong className="font-semibold text-ivory">{reaction.feedback.title}.</strong>{' '}
                    <RichText text={reaction.feedback.cause} />
                  </>
                ) : undefined
              }
            >
              {reaction && (
                <Button size="sm" variant="ghost" onClick={() => setReaction(null)}>
                  Entendi
                </Button>
              )}
              <Button
                size="sm"
                variant="felt"
                data-tutorial="hint"
                disabled={running || !nextHint}
                title={hintTitle}
                onClick={() => {
                  playSfx('select');
                  // A solução custa caro: confirma antes (quando já está liberada).
                  if (
                    cost?.solution &&
                    !hintBlockedReason(challenge, hintLevel, encounter.failedRuns)
                  ) {
                    setConfirmSolution(true);
                  } else {
                    dispatch({ type: 'hint' });
                  }
                }}
              >
                {nextHint
                  ? `Dica · ${HINT_LABEL[nextHint]} (${cost?.label})`
                  : 'Dica · sem mais ajuda'}
              </Button>
            </DealerDialogue>
          </div>

          <section className="panel rounded-lg p-4" aria-labelledby="testes-titulo">
            <div className="flex items-baseline justify-between">
              <h2 id="testes-titulo" className="table-label">
                Testes
              </h2>
              <p role="status" className="text-xs text-ivory-dim">
                {report
                  ? `${passedCount}/${report.tests.length} ${lastKind === 'submit' ? 'na entrega' : 'na execução'}`
                  : 'Nenhuma execução ainda'}
              </p>
            </div>
            <ul className="mt-3 space-y-2">
              {visibleTests.map((test) => (
                <TestRow
                  key={test.name}
                  name={test.name}
                  expr={test.expr}
                  hidden={false}
                  result={resultByName.get(test.name)}
                  ran={report !== null}
                  repeatedError={repeatedErrors.has(test.name)}
                />
              ))}
              {hiddenTests.map((test) => (
                <TestRow
                  key={test.name}
                  name={test.name}
                  expr={test.expr}
                  hidden
                  result={resultByName.get(test.name)}
                  ran={lastKind === 'submit'}
                  repeatedError={repeatedErrors.has(test.name)}
                />
              ))}
            </ul>
          </section>

          {consoleLogs.length > 0 && (
            <section className="panel rounded-lg p-4" aria-label="Console">
              <h2 className="table-label">Console</h2>
              <pre className="mt-2 max-h-32 overflow-auto font-mono text-xs whitespace-pre-wrap text-ivory-dim">
                {consoleLogs.join('\n')}
              </pre>
            </section>
          )}
        </aside>
      </div>

      <div className="wood sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-center gap-2 px-4 py-3 sm:mx-0 sm:gap-3 sm:rounded-lg">
        <Button
          className="flex-1 !px-3 sm:flex-none sm:!px-6"
          onClick={() => void execute('run')}
          disabled={running || tooLong || runsLeft <= 0}
          variant="felt"
          data-tutorial="run"
        >
          {running ? 'Executando…' : runsLeft <= 0 ? 'Sem execuções' : 'Executar'}
        </Button>
        <Button
          className="flex-1 !px-3 sm:flex-none sm:!px-6"
          onClick={() => void execute('submit')}
          disabled={running || tooLong || gate === 'deliver'}
          title={gate === 'deliver' ? 'Primeiro teste sua solução com Executar.' : undefined}
          data-tutorial="deliver"
          variant={isBoss ? 'crimson' : 'brass'}
        >
          Entregar
        </Button>
        <Button
          className="flex-1 !px-3 sm:flex-none sm:!px-6"
          variant="ghost"
          disabled={running}
          onClick={() => setConfirmForfeit(true)}
        >
          Desistir
        </Button>
        <span className="basis-full text-center text-xs text-ivory-dim sm:ml-2 sm:basis-auto">
          Execuções {encounter.runsUsed}/{RUN_LIMITS.maxRunsPerChallenge}
          <span className="hidden sm:inline">
            {' '}
            · Ctrl+Enter executa · Ctrl+M libera o Tab do editor (Mac: Ctrl+Shift+M)
          </span>
          {runsLeft <= 0 && ' · acabaram: você ainda pode Entregar ou Desistir'}
        </span>
        <p className="hidden basis-full text-center text-xs text-ivory-dim sm:block">
          Executar testa sem custo (só os testes visíveis). Entregar roda todos, inclusive os
          ocultos: entrega errada custa {Math.round(FAIL_PENALTY * 100)}% de precisão.
        </p>
        <details className="basis-full text-center text-xs text-ivory-dim sm:hidden">
          <summary className="min-h-10 cursor-pointer leading-10">Executar × Entregar</summary>
          Executar testa sem custo (só os testes visíveis). Entregar roda todos, inclusive os
          ocultos: entrega errada custa {Math.round(FAIL_PENALTY * 100)}% de precisão.
        </details>
      </div>

      <Modal
        open={solutionOpen}
        onClose={() => setSolutionOpen(false)}
        title="Solução explicada"
        wide
      >
        <p className="text-sm text-ivory-dim">
          Ver a solução reduz sua pontuação em {Math.round((1 - SOLUTION_FACTOR) * 100)}%, mas o
          importante é entender <em>por quê</em> ela funciona. Este custo já foi aplicado.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-black/60 p-4 font-mono text-sm text-ivory ring-1 ring-white/25">
          {challenge.solution.code}
        </pre>
        <p className="mt-4 text-sm leading-relaxed text-ivory/90">
          <RichText text={challenge.solution.explanation} />
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSolutionOpen(false)}>
            Fechar
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setCode(challenge.solution.code);
              setEditorReset((n) => n + 1);
              setSolutionOpen(false);
            }}
          >
            Usar no editor
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmSolution}
        onClose={() => setConfirmSolution(false)}
        title="Ver a solução explicada?"
      >
        <p className="text-sm leading-relaxed text-ivory/90">
          Custo: {cost?.label}. A pontuação desta mão cai para {Math.round(SOLUTION_FACTOR * 100)}%
          do que seria.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            data-autofocus
            onClick={() => setConfirmSolution(false)}
          >
            Voltar
          </Button>
          <Button
            size="sm"
            variant="crimson"
            onClick={() => {
              setConfirmSolution(false);
              dispatch({ type: 'hint' });
            }}
          >
            Ver a solução
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmForfeit}
        onClose={() => setConfirmForfeit(false)}
        title="Desistir desta mão?"
      >
        <p className="text-sm leading-relaxed text-ivory/90">
          A mão é gasta e vale 0 pontos: você perde uma das suas mãos desta blind, e as cartas
          jogadas vão para o descarte.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" size="sm" data-autofocus onClick={() => setConfirmForfeit(false)}>
            Continuar jogando
          </Button>
          <Button
            size="sm"
            variant="crimson"
            onClick={() => {
              setConfirmForfeit(false);
              dispatch({ type: 'forfeit' });
            }}
          >
            Desistir
          </Button>
        </div>
      </Modal>
    </div>
  );
}
