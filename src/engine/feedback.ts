import type { ExecutionReport, TestResult } from '@/runner/types';
import type { Challenge } from './challenge';
import { FAILURES_FOR_SOLUTION } from './scoring';

export interface Feedback {
  /** Título curto do problema. */
  title: string;
  /** Explicação do que aconteceu, sempre presente. */
  cause: string;
  canViewSolution: boolean;
  passed: number;
  total: number;
}

const TYPE_LABEL: Record<string, string> = {
  number: 'número',
  string: 'texto (str)',
  array: 'lista',
  object: 'dicionário',
  boolean: 'bool',
  null: 'None',
  tuple: 'tupla',
  set: 'conjunto',
  function: 'função',
  nan: 'NaN',
};
const typeLabel = (type: string) => TYPE_LABEL[type] ?? type;

const atLine = (line?: number | null) => (line ? ` (linha ${line})` : '');

/** Tradução curta das mensagens mais comuns do parser do Python. */
export function explainSyntax(error: { name: string; message: string }): string {
  const message = error.message;
  if (error.name === 'IndentationError' || /indent/i.test(message)) {
    return 'A indentação está errada. Em Python, o bloco depois de `:` precisa estar recuado (4 espaços) e todas as linhas do mesmo bloco ficam alinhadas.';
  }
  if (/expected ':'/.test(message)) {
    return 'Faltou `:` no fim da linha de `def`, `if`, `for` ou `while`.';
  }
  if (/never closed|unmatched|was never/.test(message)) {
    return 'Há parêntese, colchete, chave ou aspas que abriram e não fecharam.';
  }
  if (/unterminated string/.test(message)) return 'Há um texto com aspas sem fechar.';
  if (/invalid syntax|expected/.test(message)) {
    return 'Python não entendeu essa linha. Confira `:`, parênteses, vírgulas e se não sobrou ou faltou algum símbolo.';
  }
  return 'Python não conseguiu ler o código. Releia a linha indicada.';
}

function explainTest(challenge: Challenge, test: TestResult): { title: string; cause: string } {
  const label = test.hidden ? `no teste oculto \`${test.expr}\`` : `em \`${test.expr}\``;

  if (test.timedOut) {
    return {
      title: 'Seu código travou',
      cause: `Ele não terminou ${label}. Isso costuma ser um loop infinito: confira se a condição do loop um dia fica falsa e se a variável de controle muda a cada volta.`,
    };
  }

  const error = test.error;
  if (error) {
    const where = atLine(error.line);
    if (error.name === 'NameError') {
      if (error.message.includes(challenge.functionName)) {
        return {
          title: 'Função não encontrada',
          cause: `Não encontrei \`${challenge.functionName}\`. Crie com \`def ${challenge.functionName}(...):\` e confira o nome (maiúsculas e underscores importam).`,
        };
      }
      return {
        title: `Nome não definido${where}`,
        cause: `${error.message}. Atribua um valor à variável antes de usá-la, ou corrija o nome digitado.`,
      };
    }
    if (error.name === 'TypeError') {
      return {
        title: `Uso inválido de um valor${where}`,
        cause: `${error.message}. Isso acontece ao misturar tipos (ex.: texto + número), chamar algo que não é função ou passar argumentos demais ou de menos.`,
      };
    }
    if (error.name === 'IndexError' || error.name === 'KeyError') {
      return {
        title: `${error.name === 'IndexError' ? 'Índice fora da lista' : 'Chave inexistente'}${where}`,
        cause: `${error.name}: ${error.message}. ${error.name === 'IndexError' ? 'Os índices vão de 0 até len(lista) - 1.' : 'Use `d.get(chave, padrão)` para evitar esse erro.'}`,
      };
    }
    if (error.name === 'ZeroDivisionError') {
      return {
        title: `Divisão por zero${where}`,
        cause: `${error.message}. Confira o valor do divisor antes de dividir.`,
      };
    }
    if (error.name === 'RecursionError') {
      return {
        title: 'Recursão sem fim',
        cause: `${error.message}. Uma função que chama a si mesma precisa de um caso base que a faça parar.`,
      };
    }
    if (error.name === 'ImportError') {
      return { title: 'Módulo indisponível', cause: error.message };
    }
    return { title: `${error.name}${where}`, cause: error.message };
  }

  if (test.actualType === 'null' && test.expectedType !== 'null') {
    return {
      title: 'A função devolveu None',
      cause: `${label}, esperávamos ${test.expectedText}, mas a função não devolveu nada (\`None\`). Falta um \`return\`?`,
    };
  }

  if (test.actualType !== test.expectedType) {
    return {
      title: 'Tipo diferente do esperado',
      cause: `${label}, esperávamos ${test.expectedText} (${typeLabel(test.expectedType)}), mas recebemos ${test.actualText} (${typeLabel(test.actualType)}).`,
    };
  }

  return {
    title: 'Resultado diferente do esperado',
    cause: `${label}, esperávamos ${test.expectedText}, mas recebemos ${test.actualText}.`,
  };
}

/**
 * Monta o feedback educativo para uma execução que falhou.
 * `failures` é o total de tentativas falhas do desafio, incluindo esta.
 */
export function buildFeedback(
  challenge: Challenge,
  report: ExecutionReport,
  failures: number,
): Feedback {
  const total = report.tests.length;
  const passed = report.tests.filter((t) => t.passed).length;
  const base = {
    passed,
    total,
    canViewSolution: failures >= FAILURES_FOR_SOLUTION,
  };

  switch (report.status) {
    case 'syntax-error':
      return {
        ...base,
        title: `${report.error?.name ?? 'Erro de sintaxe'}${atLine(report.error?.line)}`,
        cause: `${explainSyntax(report.error ?? { name: 'SyntaxError', message: '' })} (Python diz: ${report.error?.message ?? 'sintaxe inválida'}.)`,
      };
    case 'rejected':
      return {
        ...base,
        title: 'Execução recusada',
        cause: report.error?.message ?? 'Limite excedido.',
      };
    case 'crash':
      return {
        ...base,
        title: 'O executor falhou',
        cause:
          'Algo inesperado aconteceu ao rodar seu código. Tente de novo; se persistir, simplifique a solução.',
      };
    default: {
      const firstFailure = report.tests.find((t) => !t.passed && !t.skipped);
      if (!firstFailure) {
        return { ...base, title: 'Algo não passou', cause: 'Confira novamente os testes.' };
      }
      return { ...base, ...explainTest(challenge, firstFailure) };
    }
  }
}
