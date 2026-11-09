// Runs every test file listed below and prints one line per check.
// Each file exports `tests`, an array of { name, fn } objects; a test fails
// if its function throws (or returns a rejected promise). The core tests
// also run in Node: `node --test` (see tests/core.test.mjs).

const testFiles = [
  '../core/tests/dating.tests.js',
  '../core/tests/catalog.tests.js',
  '../core/tests/records.tests.js',
];

const out = document.getElementById('out');
const total = document.getElementById('total');

function line(text, cls) {
  const div = document.createElement('div');
  div.textContent = text;
  if (cls) div.className = cls;
  out.appendChild(div);
}

let count = 0;
let failures = 0;

for (const file of testFiles) {
  let mod;
  try {
    mod = await import(file);
  } catch (err) {
    failures++;
    line('FAIL  could not load ' + file + ': ' + err.message, 'fail');
    continue;
  }
  for (const t of mod.tests || []) {
    count++;
    try {
      await t.fn();
      line('pass  ' + file + ' > ' + t.name, 'pass');
    } catch (err) {
      failures++;
      line('FAIL  ' + file + ' > ' + t.name + ': ' + err.message, 'fail');
    }
  }
}

total.textContent = count + ' tests, ' + failures + ' failures';
total.className = failures ? 'fail' : 'pass';
