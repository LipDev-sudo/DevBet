'use client';

import Editor, { loader, type BeforeMount, type OnMount } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import { RUN_LIMITS } from '@/runner/types';

/** Por padrão o Monaco é servido do próprio domínio (public/monaco, ver scripts/copy-monaco.mjs). */
const MONACO_BASE = process.env.NEXT_PUBLIC_MONACO_BASE_URL || '/monaco/vs';
loader.config({ paths: { vs: MONACO_BASE } });

const THEME = 'devbet';
/** Se o Monaco não carregar a tempo (CDN bloqueado, rede ruim), cai para um <textarea> simples. */
const LOAD_TIMEOUT_MS = 9000;

const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'D4A84B', fontStyle: 'bold' },
      { token: 'string', foreground: '5FD6A0' },
      { token: 'number', foreground: 'F2D98C' },
      { token: 'comment', foreground: '7D705A', fontStyle: 'italic' },
      { token: 'identifier', foreground: 'EFE6D2' },
      { token: 'delimiter', foreground: 'B9AD94' },
    ],
    colors: {
      'editor.background': '#0b0807',
      'editor.foreground': '#efe6d2',
      'editorLineNumber.foreground': '#5b4b30',
      'editorLineNumber.activeForeground': '#d4a84b',
      'editorCursor.foreground': '#f2d98c',
      'editor.selectionBackground': '#d4a84b38',
      'editor.lineHighlightBackground': '#ffffff09',
      'editorIndentGuide.background1': '#ffffff10',
      'editorWidget.background': '#17100d',
      'editorSuggestWidget.background': '#17100d',
      'editorSuggestWidget.selectedBackground': '#4a0f1c',
      'scrollbarSlider.background': '#d4a84b22',
    },
  });
};

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Atalho Ctrl/Cmd + Enter. */
  onRun?: () => void;
  readOnly?: boolean;
  label?: string;
}

export function CodeEditor({
  value,
  onChange,
  onRun,
  readOnly = false,
  label = 'Editor de código',
}: CodeEditorProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const runRef = useRef(onRun);
  useEffect(() => {
    runRef.current = onRun;
  });

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('fallback'), LOAD_TIMEOUT_MS);
    loader.init().catch((error: { type?: string }) => {
      if (error?.type !== 'cancelation') setStatus('fallback');
    });
    return () => clearTimeout(timer);
  }, [status]);

  const handleMount: OnMount = (editor, monaco) => {
    setStatus('ready');
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.());
  };

  if (status === 'fallback') {
    return (
      <textarea
        aria-label={label}
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value.slice(0, RUN_LIMITS.maxCodeLength + 200))}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') runRef.current?.();
        }}
        className="h-full min-h-[18rem] w-full resize-none bg-[#0b0807] p-4 font-mono text-sm leading-relaxed text-ivory outline-none"
      />
    );
  }

  return (
    <div className="h-full min-h-[18rem]" aria-label={label}>
      <Editor
        height="100%"
        defaultLanguage="python"
        value={value}
        theme={THEME}
        beforeMount={defineTheme}
        onMount={handleMount}
        onChange={(next) => onChange(next ?? '')}
        loading={<p className="table-label animate-pulse">Carregando editor…</p>}
        options={{
          readOnly,
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 15,
          lineHeight: 24,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbersMinChars: 3,
          padding: { top: 14, bottom: 14 },
          tabSize: 4,
          insertSpaces: true,
          detectIndentation: false,
          wordWrap: 'on',
          automaticLayout: true,
          renderLineHighlight: 'line',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          fixedOverflowWidgets: true,
          accessibilitySupport: 'auto',
          ariaLabel: label,
        }}
      />
    </div>
  );
}
