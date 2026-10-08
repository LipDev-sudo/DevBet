// Copia assets de terceiros (versões travadas no package-lock) para public/, para servir tudo do
// próprio domínio, sem CDN: Monaco Editor e Pyodide (Python em WebAssembly, usado pelo sandbox).
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function copyPackage({ name, target, files }) {
  const source = path.join(root, 'node_modules', name);
  const dest = path.join(root, 'public', target);
  if (!existsSync(source)) {
    console.warn(`[copy-assets] ${name} não instalado; pulando.`);
    return;
  }
  const { version } = JSON.parse(readFileSync(path.join(source, 'package.json'), 'utf8'));
  const marker = path.join(dest, '.version');
  if (existsSync(marker) && readFileSync(marker, 'utf8') === version) return;

  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  for (const [from, to] of files) {
    cpSync(path.join(source, from), path.join(dest, to), { recursive: true });
  }
  writeFileSync(marker, version);
  console.log(`[copy-assets] ${name}@${version} copiado para public/${target}`);
}

copyPackage({ name: 'monaco-editor', target: 'monaco', files: [['min/vs', 'vs']] });
copyPackage({
  name: 'pyodide',
  target: 'pyodide',
  files: [
    ['pyodide.js', 'pyodide.js'],
    ['pyodide.asm.mjs', 'pyodide.asm.mjs'],
    ['pyodide.asm.wasm', 'pyodide.asm.wasm'],
    ['python_stdlib.zip', 'python_stdlib.zip'],
    ['pyodide-lock.json', 'pyodide-lock.json'],
  ],
});
