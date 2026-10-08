'use client';

import { useEffect } from 'react';
import { Dealer } from '@/components/dealer/Dealer';
import { Button } from '@/components/ui/Button';
import { currentLesson } from '@/engine/tutorial';
import type { LessonId } from '@/engine/tutorial-state';
import { useGame } from './GameProvider';

/**
 * O Dealer guiando a primeira run. Ele só lê o estado real do jogo (`currentLesson`) e destaca o elemento
 * da lição; quem avança o tutorial são as ações de verdade (escolher, executar, entregar, comprar…).
 * Não há botão "próximo": só as lições informativas têm "Entendi".
 */
export function TutorialCoach() {
  const { state, dispatch } = useGame();
  const lesson = currentLesson(state.run, state.profile.tutorialCompleted);
  const lessonId = lesson?.id;
  const target = lesson?.target;

  // Destaca os elementos da lição (e os reaplica se a tela re-renderizar).
  useEffect(() => {
    if (!target) return;
    const root = document.getElementById('conteudo') ?? document.body;
    const marked = new Set<Element>();
    let frame = 0;
    const apply = () => {
      const found = new Set(document.querySelectorAll(target));
      for (const el of marked) {
        if (!found.has(el)) {
          el.classList.remove('tutorial-spot');
          marked.delete(el);
        }
      }
      for (const el of found) {
        if (!marked.has(el)) {
          el.classList.add('tutorial-spot');
          marked.add(el);
        }
      }
    };
    apply();
    const first = document.querySelector(target);
    first?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      for (const el of marked) el.classList.remove('tutorial-spot');
    };
  }, [lessonId, target]);

  if (!lesson) return null;
  return (
    <section
      aria-label="Guia do Dealer"
      data-lesson={lesson.id}
      className="screen-enter z-30 mb-5 flex items-start gap-3 rounded-lg bg-ink-2/95 p-3 ring-1 ring-white/25 backdrop-blur-sm sm:sticky sm:top-2 sm:p-4"
    >
      <Dealer mood={lesson.mood} className="hidden h-20 w-16 shrink-0 sm:block" />
      <div className="min-w-0 flex-1">
        <p className="table-label flex flex-wrap items-center gap-x-2">
          Dealer · primeira run
          <span className="text-ivory">{lesson.title}</span>
        </p>
        <p key={lesson.id} className="mt-1 animate-rise text-sm leading-relaxed text-ivory">
          {lesson.text}
        </p>
        {lesson.detail && (
          <p className="mt-1.5 text-sm leading-relaxed text-ivory-dim">{lesson.detail}</p>
        )}
        {lesson.ack ? (
          <div className="mt-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                dispatch({
                  type: 'tutorial',
                  event: { kind: 'ack', lesson: lesson.id as LessonId },
                })
              }
            >
              Entendi
            </Button>
          </div>
        ) : (
          lesson.action && (
            <p className="mt-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-ivory uppercase">
              <span aria-hidden="true" className="tutorial-dot" />
              {lesson.action}
            </p>
          )
        )}
      </div>
    </section>
  );
}
