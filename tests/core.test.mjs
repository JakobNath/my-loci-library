// Runs the core tests (core/tests/*.tests.js) with Node's built-in test
// runner: `node --test` from the repository folder. The same test files run
// in the browser through tests/index.html.

import { test } from 'node:test';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const folder = join(dirname(fileURLToPath(import.meta.url)), '..', 'core', 'tests');

for (const file of readdirSync(folder).filter(name => name.endsWith('.tests.js')).sort()) {
  const { tests } = await import(pathToFileURL(join(folder, file)).href);
  for (const check of tests) test(`${file} > ${check.name}`, check.fn);
}
