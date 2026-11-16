// Asking Wikidata when works were written (PLAN.md, "Original dates"): the
// question for one book, as a SPARQL query, and the reading of its answer.
// The question is sent by edges/lookup-wikidata.js. Only standard SPARQL 1.1
// is used, with every prefix written out and no label service, because the
// Wikidata Query Service is moving to a backend without them (SOURCES.md).
// A date found here is only offered: a person accepts it with one tap. A date
// after the author's death is a posthumous first printing, which the
// working-date rule does not use (PLAN.md, "Which date is the working date"),
// so it is marked and never offered for one tap.

import { normalizeForSearch } from './search.js';


// A title as Wikidata's English label may give it: as it stands, without a leading
// article, and with or without "On" before "the" (Luther's "On the Bondage of the
// Will" is often printed "The Bondage of the Will").
function labelsFor(title) {
  const clean = String(title || '').trim();
  const bare = clean.replace(/^(the|a|an)\s+/i, '');
  const withOn = /^the\s/i.test(clean) ? `On t${clean.slice(1)}` : '';
  const withoutOn = /^on\s+the\s/i.test(clean) ? clean.replace(/^on\s+t/i, 'T') : '';
  return [...new Set([clean, bare, bare.charAt(0).toUpperCase() + bare.slice(1), withOn, withoutOn])].filter(Boolean);
}

const literal = text => `"${String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"@en`;

/**
 * The query for one book: every work title, by its author, at once (Wikidata
 * refuses many quick queries, so a book is never asked work by work). Editions
 * and translations, which have their own items, are left out.
 * @param {string[]} titles the works' English titles
 * @param {string|string[]} author the author's name, as the book gives it ("Plato", "Edgar Allan Poe"), or
 *   several (a reader of Marx and Engels): a work by any of them is found
 * @param {string} [prefixes] the PREFIX lines naming Wikidata's vocabularies, which the query service needs
 *   written out; they name Wikidata's address, so they are kept in edges/lookup-wikidata.js
 * @param {string[]} [authorIds] authors' Wikidata IDs, when known ("Q991"): a work by one of them is found
 *   however the name is spelt ("Fiódor Dostoievski" for Wikidata's "Fyodor Dostoyevsky")
 * @returns {string} the query, or '' when there is nothing to ask (no author: a title alone matches too much)
 */
export function worksQuery(titles, author, prefixes = '', authorIds = []) {
  const names = Array.isArray(author) ? author : [author];
  const surnames = [...new Set(names.map(name => normalizeForSearch(name || '').split(' ').pop()).filter(Boolean))];
  const ids = [...new Set(authorIds)].filter(id => /^Q\d+$/.test(id));
  const labels = [...new Set(titles.flatMap(labelsFor))];
  if (!(surnames.length || ids.length) || !labels.length) return '';
  const byName = [...surnames.map(surname => `CONTAINS(LCASE(?authorName), ${JSON.stringify(surname)})`), ...ids.map(id => `?author = wd:${id}`)].join(' || ');
  // ?kind tells a first publication (P577) from when the work was written (P571), which the working-date rule treats apart.
  return `${prefixes}
SELECT ?title ?work ?authorName ?kind ?time ?precision ?original ?other ?died WHERE {
  VALUES ?title { ${labels.map(literal).join(' ')} }
  ?work rdfs:label ?title ; wdt:P50 ?author .
  ?author rdfs:label ?authorName .
  FILTER(LANG(?authorName) = "en" && (${byName}))
  FILTER NOT EXISTS { ?work wdt:P629 ?editionOf }
  OPTIONAL {
    VALUES (?kind ?valueOf) { (p:P571 psv:P571) (p:P577 psv:P577) }
    ?work ?kind ?statement . ?statement ?valueOf ?value . ?value wikibase:timeValue ?time ; wikibase:timePrecision ?precision .
  }
  OPTIONAL { ?work wdt:P1476 ?original }
  OPTIONAL { ?work skos:altLabel ?other . FILTER(LANG(?other) = "en") }
  OPTIONAL { ?author wdt:P570 ?died }
}`;
}

// The year of a Wikidata time: "-0360-01-01T00:00:00Z" is -360 (360 BC).
function yearOf(time) {
  const [, sign, digits] = String(time).match(/^([+-]?)(\d+)-/) || ['', '', '0'];
  return (sign === '-' ? -1 : 1) * Number(digits);
}

const ordinal = n => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;

/**
 * A Wikidata date as a person would type it, so the date parser reads it:
 * a year ("1845", "369 BC"), a decade as "c." ("c. 360 BC"), a century
 * ("4th c. BC"). Years before Christ are written without a minus.
 * @param {string} time "-0360-01-01T00:00:00Z"
 * @param {number} precision Wikidata's: 7 century, 8 decade, 9 year, 10 month, 11 day
 * @returns {string} '' when the precision is coarser than a century
 */
export function wikidataDateText(time, precision) {
  const match = String(time).match(/^([+-]?)0*(\d+)-/);
  if (!match || precision < 7) return '';
  const year = Number(match[2]);
  const bc = match[1] === '-' ? ' BC' : '';
  if (precision === 7) return `${ordinal(Math.ceil(year / 100))} c.${bc}`;
  if (precision === 8) return `c. ${year}${bc}`;
  return `${year}${bc}`;
}

// The language of an original title, from the code Wikidata tags it with, in
// the names this catalog uses ("Greek" for both ancient and modern, as the add
// screen's chips do). A code not listed gives no language.
const LANGUAGES_BY_CODE = {
  en: 'English', la: 'Latin', grc: 'Greek', el: 'Greek', he: 'Hebrew', hbo: 'Hebrew', de: 'German', fr: 'French',
  it: 'Italian', es: 'Spanish', pt: 'Portuguese', nl: 'Dutch', da: 'Danish', sv: 'Swedish', nb: 'Norwegian', no: 'Norwegian',
  ru: 'Russian', pl: 'Polish', cs: 'Czech', fi: 'Finnish', hu: 'Hungarian', is: 'Icelandic', ar: 'Arabic', fa: 'Persian',
  arc: 'Aramaic', syc: 'Syriac', cop: 'Coptic', sa: 'Sanskrit', zh: 'Chinese', ja: 'Japanese', ang: 'Old English',
};

// An item's number: Q170583 is 170583. Long-known works got low numbers early on.
const itemNumber = work => Number(work.wikidata.slice(1));

/**
 * Of several dated items with one title and author, the work itself when it
 * clearly stands out, else null. Jane Austen's "Pride and Prejudice" (Q170583,
 * with its original title and other names) beside a 2015 item of the same
 * name (Q108809625): the one with an original title or other names, if it is
 * the only one; otherwise one whose number is under a tenth of every other's.
 */
function clearlyTheWork(dated) {
  const described = dated.filter(work => work.originalTitle || work.otherTitles.size);
  if (described.length === 1) return described[0];
  const [first, ...rest] = [...dated].sort((a, b) => itemNumber(a) - itemNumber(b));
  return rest.every(other => itemNumber(first) * 10 < itemNumber(other)) ? first : null;
}

/**
 * Of a work's dates, the one the working-date rule picks (PLAN.md, "Which date
 * is the working date"): the first publication when it was in the author's
 * lifetime (Pride and Prejudice 1813, though written c. 1800; Frankenstein
 * 1818, though written 1816); otherwise when it was written (Augustine's
 * Confessions); otherwise the earliest date, which is then a posthumous
 * printing. A date of unknown kind counts as written, as answers asked
 * before the kinds were told apart had it.
 */
function workingDate(work) {
  const dates = work.dates.map(date => ({ ...date, year: yearOf(date.time) }));
  const earliest = list => [...list].sort((a, b) => a.year - b.year)[0];
  const inLifetime = date => work.died === null || date.year <= work.died;
  return earliest(dates.filter(date => date.kind === 'published' && inLifetime(date)))
    || earliest(dates.filter(date => date.kind !== 'published'))
    || earliest(dates);
}

/**
 * What Wikidata's answer says about each title asked: its item, the date the
 * working-date rule picks (workingDate), its original title and that
 * title's language, its other English titles, and its authors as Wikidata
 * names them (those whose names matched the query). posthumous: the date is
 * after the author died (the 1844 Manuscripts, first printed 1932). A title
 * matching more than one dated work is left out, since Wikidata cannot tell
 * which is meant, unless one clearly stands out (clearlyTheWork).
 * @param {object} answer the query's JSON answer
 * @param {string[]} titles the titles asked (as in worksQuery)
 * dateKind: 'published', 'written', or '' when Wikidata did not say.
 * @returns {Map<string, { wikidata: string, date: string, dateKind: string, posthumous: boolean, originalTitle: string, originalLanguage: string, otherTitles: string[], authors: string[] }>} by the asked title
 */
export function worksFromWikidata(answer, titles) {
  const byLabel = new Map();
  for (const row of (answer && answer.results && answer.results.bindings) || []) {
    const label = row.title.value;
    const id = row.work.value.split('/').pop();
    const works = byLabel.get(label) || new Map();
    const work = works.get(id) || { wikidata: id, dates: [], originalTitle: '', originalLanguage: '', otherTitles: new Set(), authors: new Set(), died: null };
    if (row.authorName) work.authors.add(row.authorName.value);
    if (row.time) {
      const kind = !row.kind ? '' : row.kind.value.endsWith('P577') ? 'published' : 'written';
      work.dates.push({ time: row.time.value, precision: Number(row.precision.value), kind });
    }
    if (row.original) {
      work.originalTitle = row.original.value;
      work.originalLanguage = LANGUAGES_BY_CODE[String(row.original['xml:lang'] || '').toLowerCase()] || work.originalLanguage;
    }
    // With two authors, the later death: a work printed while either lived was printed in an author's lifetime.
    if (row.died) work.died = Math.max(work.died ?? -Infinity, yearOf(row.died.value));
    if (row.other) work.otherTitles.add(row.other.value);
    works.set(id, work);
    byLabel.set(label, works);
  }
  const found = new Map();
  for (const title of titles) {
    const candidates = labelsFor(title).flatMap(label => [...(byLabel.get(label) || new Map()).values()]);
    const dated = candidates.filter(work => work.dates.length);
    const work = dated.length === 1 ? dated[0] : dated.length > 1 ? clearlyTheWork(dated) : candidates.length === 1 ? candidates[0] : null;
    if (!work) continue;
    const chosen = workingDate(work);
    found.set(title, {
      wikidata: work.wikidata,
      date: chosen ? wikidataDateText(chosen.time, chosen.precision) : '',
      dateKind: chosen ? chosen.kind : '',
      posthumous: Boolean(chosen && work.died !== null && chosen.year > work.died),
      originalTitle: work.originalTitle && work.originalTitle !== title ? work.originalTitle : '',
      originalLanguage: work.originalLanguage,
      otherTitles: [...work.otherTitles].filter(other => other !== title).slice(0, 5),
      authors: [...work.authors],
    });
  }
  return found;
}

// An item's ID, the last part of its address ("…/entity/Q68").
const itemId = address => (String(address).match(/Q\d+$/) || [''])[0];

/**
 * The query that checks stored Wikidata IDs (the laptop's loci-enrich, from
 * time to time): Wikidata merges items, and a merged item points to the one
 * it became; a deleted item answers nothing.
 * @param {string[]} ids "Q1059449"
 * @param {string} [prefixes] the PREFIX lines for owl, wd and wikibase
 */
export function idsQuery(ids, prefixes = '') {
  const valid = ids.filter(id => /^Q\d+$/.test(id));
  if (!valid.length) return '';
  return `${prefixes}
SELECT ?item ?target ?sitelinks WHERE {
  VALUES ?item { ${valid.map(id => `wd:${id}`).join(' ')} }
  OPTIONAL { ?item owl:sameAs ?target }
  OPTIONAL { ?item wikibase:sitelinks ?sitelinks }
}`;
}

/**
 * Read the answer to idsQuery: only the IDs that changed.
 * @returns {Map<string, { mergedInto: string } | { missing: true }>} by the ID asked
 */
export function readIdChecks(json, ids) {
  const seen = new Map();
  for (const row of (json && json.results && json.results.bindings) || []) {
    const id = itemId(row.item.value);
    if (row.target) seen.set(id, { mergedInto: itemId(row.target.value) });
    else if (row.sitelinks && !seen.has(id)) seen.set(id, null);
  }
  const changes = new Map();
  for (const id of ids) {
    const seenAs = seen.get(id);
    if (seenAs) changes.set(id, seenAs);
    else if (seenAs === undefined) changes.set(id, { missing: true });
  }
  return changes;
}
