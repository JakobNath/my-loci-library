// Architecture checks (CODE_STYLE.md, section 8): short scans of the app's
// own source files. Run with `node --test` from the repository folder.
// Each rule is a small function; the last tests prove each rule catches a
// deliberate break, so a rule can never silently stop working.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIZE_BUDGET = 100 * 1024; // PLAN.md, "Small and fast"

// The app's own files: everything except prototypes, vendor code, tests and docs.
function appFiles() {
  const files = [];
  const skip = new Set(['prototypes', 'vendor', 'tests', 'docs', '.git', '.claude', 'node_modules']);
  function walk(folder) {
    for (const name of readdirSync(folder)) {
      const path = join(folder, name);
      if (statSync(path).isDirectory()) {
        if (!skip.has(name)) walk(path);
      } else if (/\.(js|mjs|html|css)$/.test(name) && !(name === 'review.html')) {
        files.push(relative(root, path).split(sep).join('/'));
      }
    }
  }
  walk(root);
  return files.filter(file => !file.startsWith('core/tests/'));
}
const read = file => readFileSync(join(root, file), 'utf8');

// ---------- the rules ----------

const FORBIDDEN_IN_CORE = ['window', 'document', 'localStorage', 'indexedDB', 'fetch', 'navigator', 'process', 'require',
  'Date.now', 'new Date', 'Math.random', 'crypto', 'structuredClone'];

/** Problems with one core file: imports from outside core, or browser and Node globals. */
export function coreProblems(file, text) {
  const problems = [];
  for (const [, path] of text.matchAll(/\bimport\s[^'"]*['"]([^'"]+)['"]/g)) {
    if (!path.startsWith('./')) problems.push(`${file} imports "${path}", outside core/`);
  }
  const code = text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/'[^'\n]*'|"[^"\n]*"/g, "''");
  for (const name of FORBIDDEN_IN_CORE) {
    if (new RegExp(`(^|[^.\\w])${name.replace('.', '\\.')}\\b`).test(code)) problems.push(`${file} uses ${name}`);
  }
  return problems;
}

// Each outside service may be named in one file only.
const SERVICES = [
  ['api.github.com', 'edges/sync-github.js'],
  ['openlibrary.org', 'edges/lookup-openlibrary.js'],
  ['googleapis.com/books', 'edges/lookup-googlebooks.js'],
  ['indexedDB', 'edges/storage.js'],
];
export function serviceProblems(file, text) {
  return SERVICES.filter(([word, owner]) => file !== owner && text.includes(word)).map(([word, owner]) => `${file} mentions ${word}; only ${owner} may`);
}

/** Every ${...} in a template assigned to innerHTML must be escaped, a number, or another *Html piece. */
export function innerHtmlProblems(file, text) {
  const problems = [];
  for (const match of text.matchAll(/\.innerHTML\s*[+]?=\s*`/g)) {
    const start = match.index + match[0].length;
    let depth = 0;
    let end = start;
    for (; end < text.length; end++) {
      if (text[end] === '`' && depth === 0) break;
      if (text.startsWith('${', end)) depth++;
      else if (text[end] === '}' && depth > 0) depth--;
    }
    for (const [, inside] of text.slice(start, end).matchAll(/\$\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) {
      const safe = /^\s*escapeHtml\(/.test(inside) || /^\s*[\w.]*Html\(/.test(inside) || /^\s*-?\d+(\.\d+)?\s*$/.test(inside);
      if (!safe) problems.push(`${file}: innerHTML uses \${${inside.trim()}} without escapeHtml`);
    }
  }
  return problems;
}

// ---------- the checks against the real files ----------

test('core imports nothing outside core and uses no browser or Node globals', () => {
  const problems = appFiles().filter(file => file.startsWith('core/')).flatMap(file => coreProblems(file, read(file)));
  assert.deepEqual(problems, []);
});

test('each outside service, and IndexedDB, is used by one edge file only', () => {
  assert.deepEqual(appFiles().flatMap(file => serviceProblems(file, read(file))), []);
});

test('every innerHTML assignment escapes its data', () => {
  assert.deepEqual(appFiles().filter(file => /\.m?js$/.test(file)).flatMap(file => innerHtmlProblems(file, read(file))), []);
});

test('the app\'s own files stay within the size budget', () => {
  const total = appFiles().reduce((sum, file) => sum + statSync(join(root, file)).size, 0);
  assert.ok(total <= SIZE_BUDGET, `the app's own files are ${Math.round(total / 1024)} KB; the budget is ${SIZE_BUDGET / 1024} KB`);
});

test('the rule folders, once they exist, sit at the repository root', () => {
  for (const folder of ['core', 'edges', 'ui']) {
    if (existsSync(join(root, 'app', folder))) assert.fail(`${folder}/ belongs at the repository root, not inside app/`);
  }
});

// ---------- each rule catches a deliberate break ----------

test('the core rule catches an outside import and a clock read', () => {
  assert.equal(coreProblems('core/x.js', "import { save } from '../edges/storage.js';").length, 1);
  assert.equal(coreProblems('core/x.js', 'const today = new Date();').length, 1);
  assert.equal(coreProblems('core/x.js', "// new Date() in a comment is fine\nconst a = 'fetch';").length, 0);
});

test('the service rule catches GitHub named outside the sync module', () => {
  assert.equal(serviceProblems('ui/library.js', "fetch('https://api.github.com/repos')").length, 1);
  assert.equal(serviceProblems('edges/sync-github.js', "fetch('https://api.github.com/repos')").length, 0);
});

test('the innerHTML rule catches unescaped data', () => {
  assert.equal(innerHtmlProblems('ui/x.js', 'box.innerHTML = `<h1>${book.title}</h1>`;').length, 1);
  assert.equal(innerHtmlProblems('ui/x.js', 'box.innerHTML = `<h1>${escapeHtml(book.title)}</h1>${coverHtml(book)}${2}`;').length, 0);
});
