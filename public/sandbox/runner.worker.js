/*
 * DevBet — runner do sandbox (Python via Pyodide).
 *
 * Roda DENTRO de um Web Worker dedicado (nunca no servidor e nunca na thread principal).
 * Camadas de isolamento:
 *   1. Worker próprio: sem DOM, sem cookies, sem localStorage.
 *   2. CSP deste arquivo (ver next.config.ts): sem conexões externas; só a própria origem,
 *      necessária para carregar o interpretador.
 *   3. Depois que o interpretador carrega, APIs de rede/armazenamento são removidas do escopo global
 *      e o código do jogador roda com builtins reduzidos e imports numa lista curta (sem `js`,
 *      `os`, `sys`, `subprocess`, `open`, `eval`, `exec`).
 *   4. A thread principal mata o worker (terminate) se o tempo estourar — cobre loops infinitos.
 *   5. Mensagens de resultado exigem um nonce que o código do jogador não consegue ler.
 *
 * O mesmo arquivo é carregado nos testes unitários (Node) via `module.exports`.
 */
(function (root) {
  'use strict';

  var MAX_CODE_LENGTH = 6000;
  var MAX_LOG_LINES = 30;
  var MAX_TEXT = 240;
  var PYODIDE_BASE = '/pyodide/';

  var BLOCKED_GLOBALS = [
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'EventSource',
    'WebTransport',
    'importScripts',
    'indexedDB',
    'caches',
    'Worker',
    'SharedWorker',
    'BroadcastChannel',
    'Notification',
  ];

  /* Harness em Python: compila o código do jogador e roda os testes num namespace restrito. */
  var HARNESS = String.raw`
import json, builtins, math, traceback

_ALLOWED_MODULES = {'math', 'itertools', 'functools', 'collections', 'heapq', 'bisect', 'string'}
_SAFE_NAMES = [
    'abs', 'all', 'any', 'bin', 'bool', 'callable', 'chr', 'classmethod', 'dict', 'divmod',
    'enumerate', 'filter', 'float', 'format', 'frozenset', 'hex', 'int', 'isinstance', 'iter',
    'len', 'list', 'map', 'max', 'min', 'next', 'object', 'oct', 'ord', 'pow', 'print',
    'property', 'range', 'repr', 'reversed', 'round', 'set', 'slice', 'sorted', 'staticmethod',
    'str', 'sum', 'super', 'tuple', 'type', 'zip',
    'BaseException', 'Exception', 'ArithmeticError', 'AssertionError', 'AttributeError',
    'IndexError', 'KeyError', 'LookupError', 'NameError', 'NotImplementedError', 'OverflowError',
    'RecursionError', 'RuntimeError', 'StopIteration', 'TypeError', 'ValueError',
    'ZeroDivisionError', 'ImportError', 'MemoryError',
]

def _guard_import(name, globals=None, locals=None, fromlist=(), level=0):
    if level != 0 or name.split('.')[0] not in _ALLOWED_MODULES:
        raise ImportError("O módulo '" + name + "' não está disponível nos desafios.")
    return builtins.__import__(name, globals, locals, fromlist, level)

def _no_input(*args, **kwargs):
    raise RuntimeError('input() não está disponível: os testes chamam suas funções diretamente.')

_SAFE = {n: getattr(builtins, n) for n in _SAFE_NAMES if hasattr(builtins, n)}
_SAFE['__import__'] = _guard_import
_SAFE['__build_class__'] = builtins.__build_class__
_SAFE['input'] = _no_input
_NS = None

def _short(text, limit=240):
    return text if len(text) <= limit else text[:limit] + '…'

def _tname(v):
    if v is None: return 'null'
    if isinstance(v, bool): return 'boolean'
    if isinstance(v, (int, float)): return 'nan' if v != v else 'number'
    if isinstance(v, str): return 'string'
    if isinstance(v, list): return 'array'
    if isinstance(v, dict): return 'object'
    if isinstance(v, tuple): return 'tuple'
    if isinstance(v, (set, frozenset)): return 'set'
    if callable(v): return 'function'
    return type(v).__name__

def _eq(a, b):
    if isinstance(a, bool) or isinstance(b, bool):
        return isinstance(a, bool) and isinstance(b, bool) and a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return a == b or (a != a and b != b)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_eq(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_eq(a[k], b[k]) for k in b)
    return type(a) is type(b) and a == b

def _user_line(exc):
    line = None
    tb = exc.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == '<codigo>':
            line = tb.tb_lineno
        tb = tb.tb_next
    return line

def _err(exc):
    return {'name': type(exc).__name__, 'message': _short(str(exc)), 'line': _user_line(exc)}

def compile_user(code):
    global _NS
    try:
        obj = compile(code, '<codigo>', 'exec')
    except SyntaxError as e:
        return json.dumps({'ok': False, 'error': {'name': type(e).__name__, 'message': _short(e.msg or 'invalid syntax'), 'line': e.lineno}})
    _NS = {'__builtins__': dict(_SAFE), '__name__': '__main__'}
    warning = None
    try:
        exec(obj, _NS)
    except BaseException as e:
        warning = _err(e)
    return json.dumps({'ok': True, 'warning': warning})

def run_test(expr, expected_json):
    expected = json.loads(expected_json)
    try:
        actual = eval(compile(expr, '<teste>', 'eval'), _NS)
    except BaseException as e:
        return json.dumps({'passed': False, 'actualText': '', 'actualType': 'error', 'error': _err(e)})
    try:
        text = _short(repr(actual))
    except BaseException:
        text = '<valor sem representação>'
    return json.dumps({'passed': bool(_eq(actual, expected)), 'actualText': text, 'actualType': _tname(actual)})
`;

  function lockDownGlobals() {
    BLOCKED_GLOBALS.forEach(function (name) {
      try {
        Object.defineProperty(root, name, {
          value: undefined,
          writable: false,
          configurable: false,
        });
      } catch (_) {
        try {
          root[name] = undefined;
        } catch (__) {
          /* já protegido */
        }
      }
    });
  }

  function truncate(text) {
    return text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) + '…' : text;
  }

  var session = null;

  /** Carrega o interpretador e o harness. Feito uma vez por worker, antes do código do jogador. */
  function initPython() {
    var loader =
      root.__devbetLoadPyodide ||
      function () {
        root.importScripts(PYODIDE_BASE + 'pyodide.js');
        return root.loadPyodide({ indexURL: PYODIDE_BASE });
      };
    return Promise.resolve(loader()).then(function (pyodide) {
      var logs = [];
      var capture = function (line) {
        if (logs.length < MAX_LOG_LINES) logs.push(truncate(String(line)));
      };
      pyodide.setStdout({ batched: capture });
      pyodide.setStderr({ batched: capture });
      pyodide.runPython(HARNESS);
      session = {
        logs: logs,
        compile: pyodide.globals.get('compile_user'),
        runTest: pyodide.globals.get('run_test'),
      };
      lockDownGlobals();
    });
  }

  /**
   * Executa o código e os testes, emitindo mensagens via `emit`.
   * request: { nonce, code, tests: [{ expr, expected }] }
   */
  function execute(request, emit) {
    var nonce = request.nonce;
    if (!session) {
      emit({
        nonce: nonce,
        type: 'compile',
        ok: false,
        error: { name: 'RunnerError', message: 'Interpretador não iniciado.' },
      });
      return;
    }
    if (typeof request.code !== 'string' || request.code.length > MAX_CODE_LENGTH) {
      emit({
        nonce: nonce,
        type: 'compile',
        ok: false,
        error: { name: 'LimitError', message: 'Código maior que o limite permitido.' },
      });
      return;
    }

    session.logs.length = 0;
    var compiled = JSON.parse(session.compile(request.code));
    if (!compiled.ok) {
      emit({ nonce: nonce, type: 'compile', ok: false, error: compiled.error });
      return;
    }
    if (compiled.warning) {
      session.logs.push(
        truncate(
          'Erro ao executar o código: ' + compiled.warning.name + ': ' + compiled.warning.message,
        ),
      );
    }
    emit({ nonce: nonce, type: 'compile', ok: true });

    for (var index = 0; index < request.tests.length; index++) {
      var test = request.tests[index];
      var out = JSON.parse(session.runTest(test.expr, JSON.stringify(test.expected)));
      emit({ nonce: nonce, type: 'test', result: Object.assign({ index: index }, out) });
    }
    emit({ nonce: nonce, type: 'done', logs: session.logs.slice() });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { execute: execute, initPython: initPython, BLOCKED_GLOBALS: BLOCKED_GLOBALS };
    return;
  }

  var post = root.postMessage.bind(root);
  root.onmessage = function (event) {
    var data = event.data;
    if (!data) return;
    if (data.type === 'init') {
      initPython().then(
        function () {
          post({ nonce: data.nonce, type: 'ready' });
        },
        function (error) {
          post({
            nonce: data.nonce,
            type: 'failed',
            error: {
              name: 'InitError',
              message: truncate(String((error && error.message) || error)),
            },
          });
        },
      );
    } else if (data.type === 'run') {
      root.onmessage = null; // um worker = uma execução
      execute(data, post);
    }
  };
})(typeof self !== 'undefined' ? self : globalThis);
