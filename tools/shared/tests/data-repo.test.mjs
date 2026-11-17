// Reading and writing records in a data repository, in a temporary folder.
// Run with `node --test` in the tools folder.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { newRecord, FORMAT_VERSION } from '../../core/records.js';
import { readRecords, writeRecord, localDate, FOLDERS } from '../data-repo.mjs';

const NOW = '2026-11-12T10:00:00Z';

test('a date written into a record is the day on this computer\'s calendar, not in UTC', () => {
  // 9 pm on 14 November where the computer is; in Minnesota that moment is already the 15th in UTC.
  const evening = new Date(2026, 10, 14, 21, 0, 0).toISOString();
  assert.equal(localDate(evening), '2026-11-14');
  assert.equal(localDate(new Date(2026, 0, 1, 0, 30, 0).toISOString()), '2026-01-01', 'just after midnight');
});

test('a record newer than the tools stops every tool that writes, but not the backup', () => {
  const folder = mkdtempSync(join(tmpdir(), 'loci-data-repo-'));
  try {
    for (const name of Object.values(FOLDERS)) mkdirSync(join(folder, name));
    const work = newRecord('work', 'w0rk00000001', NOW, { title: 'Confessions' });
    writeRecord(folder, work);
    assert.equal(readRecords(folder).length, 1);
    // A record from an app one format ahead, with a field these tools do not know.
    const newer = { ...work, id: 'w0rk00000002', format: FORMAT_VERSION + 1, unknownField: 'kept' };
    writeFileSync(join(folder, 'works', `${newer.id}.json`), JSON.stringify(newer, null, 2) + '\n');
    assert.throws(() => readRecords(folder), /Update the tools first/);
    assert.throws(() => writeRecord(folder, newer), /Update the tools first/);
    assert.equal(readRecords(folder, { allowNewer: true }).length, 2, 'the backup still reads every record');
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
