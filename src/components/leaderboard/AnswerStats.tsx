'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { RichText } from '@/components/ui/RichText';
import { aggregateAnswers, type QuestionStat } from '@/lib/answers';
import { listAnswers } from '@/lib/leaderboard-client';

/** Moderação: para cada pergunta, o percentual de cada alternativa e os apelidos de quem a marcou. */
export function AnswerStats() {
  const [stats, setStats] = useState<QuestionStat[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    listAnswers()
      .then((docs) => {
        setError('');
        setStats(aggregateAnswers(docs));
      })
      .catch((e: { code?: string }) =>
        setError(
          e.code === 'permission-denied'
            ? 'Sem permissão: só o administrador das regras do Firestore lê as respostas (e as regras de "answers" precisam estar publicadas).'
            : `Não foi possível carregar as respostas. (${e.code ?? 'erro'})`,
        ),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ivory-dim">
          {stats ? `${stats.length} perguntas com respostas` : 'carregando…'}
        </p>
        <Button size="sm" variant="ghost" onClick={load}>
          Atualizar
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-crimson-hot">
          {error}
        </p>
      )}
      {stats !== null && stats.length === 0 && !error && (
        <p className="text-sm text-ivory-dim">Ninguém respondeu ainda.</p>
      )}
      <ol aria-label="Perguntas respondidas" className="space-y-3">
        {(stats ?? []).map((question) => {
          const expanded = open === question.id;
          return (
            <li key={question.id} className="panel p-4">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : question.id)}
                className="flex w-full flex-wrap items-baseline justify-between gap-2 text-left"
              >
                <span className="min-w-0 flex-1 text-sm text-ivory">
                  <span className="table-label mr-2">{question.topic}</span>
                  <RichText text={question.prompt} />
                </span>
                <span className="font-mono text-xs text-ivory-dim tabular-nums">
                  {question.total} marcações · {question.players} jogadores
                </span>
              </button>
              <ul className="mt-3 space-y-2">
                {question.options.map((option) => (
                  <li key={option.index} className="text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className={option.correct ? 'text-win' : 'text-ivory'}>
                        {String.fromCharCode(65 + option.index)} · <RichText text={option.text} />
                        {option.correct && <span className="sr-only"> (certa)</span>}
                      </span>
                      <span className="font-mono text-xs text-gold tabular-nums">
                        {option.percent}% ({option.count})
                      </span>
                    </div>
                    <div className="mt-1 h-2 bg-black/60 ring-1 ring-white/20">
                      <div
                        className={`h-full ${option.correct ? 'bg-win' : 'bg-crimson-hot'}`}
                        style={{ width: `${option.percent}%` }}
                      />
                    </div>
                    {expanded && (
                      <p className="mt-1 text-xs text-ivory-dim">
                        {option.nicknames.length === 0
                          ? 'Ninguém marcou.'
                          : option.nicknames
                              .map((n) => (n.count > 1 ? `${n.name} (×${n.count})` : n.name))
                              .join(', ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {!expanded && (
                <p className="mt-2 text-xs text-ivory-dim">
                  Toque na pergunta para ver os apelidos.
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
