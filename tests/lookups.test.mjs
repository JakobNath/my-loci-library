// The lookups made when adding a book (edges/lookup-openlibrary.js and
// edges/lookup-googlebooks.js), against a stand-in for the two services that
// answers with the recorded answers in core/tests/answers/. Run by `node --test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookUpOpenLibrary, lookUpWork, searchWork } from '../edges/lookup-openlibrary.js';
import { lookUpGoogleBooks } from '../edges/lookup-googlebooks.js';
import { mergeFound } from '../core/book-data.js';
import * as lewis from '../core/tests/answers/9780060652920.js';
import * as anna from '../core/tests/answers/9781857150582.js';
import * as plato from '../core/tests/answers/9780872203495.js';

// A fetch that answers as Open Library and Google Books did, and lists what it was asked.
function recordedServices(books) {
  const asked = [];
  const fetchFn = async url => {
    asked.push(url);
    const book = books.find(item => url.includes(item.isbn) || url.includes(JSON.parse(item.googleBooksSearch).items[0].id));
    const text = !book ? null
      : url.includes('jscmd=details') ? book.openLibraryDetails
        : url.includes('/search.json') ? book.openLibraryWorkSearch
          : url.includes('volumes?q=') ? book.googleBooksSearch
            : url.includes('/volumes/') ? book.googleBooksVolume : null;
    return { ok: text !== null, status: text === null ? 404 : 200, json: async () => JSON.parse(text) };
  };
  return { fetchFn, asked };
}

test('adding Mere Christianity fills pages as printed, edition, place, height, binding and the contents to offer, in one request', async () => {
  const { fetchFn, asked } = recordedServices([lewis]);
  const found = await lookUpOpenLibrary(lewis.isbn, fetchFn);
  assert.equal(asked.length, 1);
  assert.deepEqual(found.authors, ['C. S. Lewis']);
  assert.deepEqual([found.pages, found.editionStatement, found.place, found.height, found.binding], ['xx, 227', '1st HarperCollins ed.', 'San Francisco', 220, 'Paperback']);
  assert.equal(found.contents.length, 4);
});

test('an edition record without authors takes them from the work search made for dates, without asking again', async () => {
  const { fetchFn, asked } = recordedServices([plato]);
  const workSearch = searchWork(plato.isbn, fetchFn);
  const [found, work] = await Promise.all([lookUpOpenLibrary(plato.isbn, fetchFn, workSearch), lookUpWork(plato.isbn, fetchFn, workSearch)]);
  assert.deepEqual(found.authors, ['Plato']);
  assert.equal(work.workTitle, 'Complete works');
  assert.equal(asked.filter(url => url.includes('/search.json')).length, 1);
});

test('with a key, Google Books adds the volume record: thickness and a larger cover', async () => {
  const { fetchFn, asked } = recordedServices([anna]);
  const google = await lookUpGoogleBooks(anna.isbn, 'test-key', fetchFn);
  assert.equal(asked.length, 2);
  assert.ok(asked.every(url => url.includes('key=test-key')));
  assert.deepEqual([google.height, google.thickness], [210, 47]);
  assert.ok(google.cover.waiting);
  const found = mergeFound([await lookUpOpenLibrary(anna.isbn, fetchFn), google]);
  assert.deepEqual([found.height, found.thickness, found.binding], [213, 46, 'Hardcover'], "Open Library's sizes come first");
});

test('without a key Google Books is asked once, and a failed work search still finds the book', async () => {
  const { fetchFn, asked } = recordedServices([plato]);
  await lookUpGoogleBooks(plato.isbn, '', fetchFn);
  assert.equal(asked.length, 1);
  const found = await lookUpOpenLibrary(plato.isbn, fetchFn, Promise.resolve(null));
  assert.deepEqual([found.title, found.authors], ['Complete Works', []]);
});
