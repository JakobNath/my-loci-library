// Speed targets from PLAN.md, checked in the browser with 10,000 generated
// books (6,000 physical, 4,000 Logos). On a laptop the tighter laptop
// budgets apply, so a phone about five times slower still meets the
// targets. On a slow device (a phone, or a browser slowed down while in the
// background) the phone targets from PLAN.md apply instead. Which set was
// used is shown on each line. Open this page on a phone to check the phone.

import { newRecord } from '../core/records.js';
import { buildLibrary, withSearchText, viewEntries, searchEntries } from '../core/library.js';
import { openStorage, deleteStorage } from '../edges/storage.js';
import * as libraryScreen from '../ui/library.js';
import * as bookScreen from '../ui/book.js';

const BOOKS = 10000;
const NOW = '2026-11-09T12:00:00Z';
const WORDS = ['grace', 'faith', 'church', 'λόγος', 'history', 'sermons', 'letters', 'commentary', 'theology', 'confessions', 'psalms', 'prayer'];

// A believable catalog: each book has one work, an author shared with a few
// others, a copy, and a dating.
export function generateCatalog(count = BOOKS) {
  const records = [];
  const id = (prefix, n) => (prefix + n.toString(32).padStart(11, '0')).slice(0, 12).replace(/[ilou]/g, 'x');
  for (let n = 0; n < count / 5; n++) records.push(newRecord('author', id('a', n), NOW, { name: `Author ${n} Name` }));
  for (let n = 0; n < count; n++) {
    const year = 100 + (n * 7) % 1900;
    const work = newRecord('work', id('w', n), NOW, {
      title: `${WORDS[n % WORDS.length]} ${WORDS[(n * 7) % WORDS.length]} volume ${n}`,
      authors: [id('a', n % (count / 5))],
      datings: [{ text: String(year), earliest: year, latest: year, certainty: 'exact', kind: null, note: '', working: true }],
    });
    const edition = newRecord('edition', id('e', n), NOW, {
      title: work.title, contents: [{ work: work.id, extent: 'complete', translator: null, pages: null }],
      year: 1900 + (n % 120), medium: n < count * 0.6 ? 'physical' : 'logos', pages: String(150 + (n % 600)),
    });
    const copy = newRecord('copy', id('c', n), NOW, {
      edition: edition.id, added: '2026-11-09', location: ['Home', 'Office', `Case ${n % 9}`, `Shelf ${n % 6}`], notes: n % 10 ? '' : 'A gift.',
    });
    records.push(work, edition, copy);
  }
  return records;
}

function time(action) {
  const start = performance.now();
  const result = action();
  return { ms: performance.now() - start, result };
}

function fakeState(library, route = { name: '', id: '' }) {
  return { library, route, query: '', device: { view: 'grid', sort: 'title', coverSize: 'medium', medium: 'physical' }, settings: { dateStyle: 'AD', currency: '$' } };
}

function hiddenBox() {
  const box = document.createElement('main');
  box.style.cssText = 'position:absolute;left:-10000px;top:0;width:1100px';
  document.body.append(box);
  return box;
}

// How fast is this device? Ten million additions take about 10 ms on a
// current laptop; more than 40 ms means a slow phone or a slowed browser.
function deviceIsSlow() {
  const start = performance.now();
  let sum = 0;
  for (let i = 0; i < 1e7; i++) sum += i % 7;
  return performance.now() - start + (sum < 0 ? 1 : 0) > 40;
}
// A phone's processor can be as quick as a laptop's while its storage is
// much slower, so any touch-screen device gets the phone targets
// (found on Jakob's phone, 2026-11-09: laptop-fast loop, 485 ms to open).
const IS_PHONE = matchMedia('(pointer: coarse)').matches;
const SLOW = IS_PHONE || deviceIsSlow();
const BUDGET = SLOW
  ? { label: 'phone targets', start: 1000, search: 100, book: 100, sort: 500, scroll: 50 }
  : { label: 'laptop budgets', start: 300, search: 10, book: 16, sort: 100, scroll: 16 };

function check(ms, limit, what) {
  if (ms > limit) throw new Error(`${what} took ${ms.toFixed(1)} ms; the limit is ${limit} ms (${BUDGET.label})`);
  return `${ms.toFixed(1)} ms, ${BUDGET.label}`;
}

const catalog = generateCatalog();
let library = null;

export const tests = [
  {
    name: 'opening: reading 10,000 books from storage and drawing the library (300 ms laptop, 1 s phone)',
    async fn() {
      const storage = await openStorage('loci-speed-test');
      await storage.replaceRecords(catalog);
      const start = performance.now();
      const records = await storage.allRecords();
      library = buildLibrary(records, { searchText: false }); // as the app does: search text comes after the first screen
      const box = hiddenBox();
      const stop = libraryScreen.render(box, fakeState(library), { setDevice() {} });
      const ms = performance.now() - start;
      stop(); box.remove(); storage.close();
      await deleteStorage('loci-speed-test');
      return check(ms, BUDGET.start, 'opening');
    },
  },
  {
    name: 'searching 10,000 books, per keystroke (10 ms laptop, 100 ms phone)',
    fn() {
      library = withSearchText(library || buildLibrary(catalog));
      const queries = ['g', 'gr', 'gra', 'grace', 'grace ps', 'logos', 'volume 9999', 'author 12'];
      const slowest = Math.max(...queries.map(query => time(() => searchEntries(library, query)).ms));
      return check(slowest, BUDGET.search, 'the slowest search');
    },
  },
  {
    name: 'sorting 10,000 books by any field (100 ms laptop, 500 ms phone)',
    fn() {
      library = library || buildLibrary(catalog);
      const slowest = Math.max(...['title', 'author', 'originalDate', 'added', 'location'].map(sort => time(() => viewEntries(library.entries, { sort })).ms));
      return check(slowest, BUDGET.sort, 'the slowest sort');
    },
  },
  {
    name: 'opening a book page (16 ms laptop, 100 ms phone)',
    fn() {
      library = library || buildLibrary(catalog);
      const box = hiddenBox();
      const id = library.entries[4321].id;
      const { ms } = time(() => bookScreen.render(box, fakeState(library, { name: 'book', id }), {}));
      box.remove();
      return check(ms, BUDGET.book, 'the book page');
    },
  },
  {
    name: 'scrolling the library, per redraw (16 ms laptop, 50 ms phone)',
    fn() {
      library = library || buildLibrary(catalog);
      const box = hiddenBox();
      box.style.left = '0';
      box.style.opacity = '0';
      const stop = libraryScreen.render(box, fakeState(library), { setDevice() {} });
      const list = box.querySelector('.long-list');
      let slowest = 0;
      // Scroll the list past the top of the window, step by step, timing each redraw.
      for (let step = 0; step < 40; step++) {
        list.style.marginTop = `${-step * 400}px`;
        const { ms } = time(() => { dispatchEvent(new Event('scroll')); list.getBoundingClientRect(); });
        slowest = Math.max(slowest, ms);
      }
      stop(); box.remove();
      return check(slowest, BUDGET.scroll, 'the slowest redraw');
    },
  },
];
