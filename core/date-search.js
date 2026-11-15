// The "Search the web" link beside a date box: a question worded so that a
// web search answers it without editing (PLAN.md, "Original dates", "Search
// the web"). Only the address is built here; the browser does the search.

// The one place the search address lives. If it ever changes, change it here.
const SEARCH_ADDRESS = 'https://www.google.com/search?q=';

const ARTICLE = /^(the|a|an)\s/i;

// "Plato", "Plato and Aristotle", "Plato, Aristotle and Cicero".
function namesText(names) {
  const list = names.map(name => String(name || '').trim()).filter(Boolean);
  if (list.length < 2) return list.join('');
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

const VOLUME_WORDS = /\b(?:volume|vol|v|band|bd)\.?\s*(\d{1,3})\b/i;
const plain = text => String(text || '').trim();

/**
 * The name a search should use for a book, so it finds this volume and not
 * the whole set: "Selected Psalms I (Luther's Works, volume 12)". A record
 * that calls a volume by its set's name and puts the number and the volume's
 * own title in the subtitle ("Luther's Works", "Volume 12 - (Selected Psalms
 * I)") is read the same way.
 * @param {{ title?: string, subtitle?: string, set?: string, volume?: string }} book
 * @returns {string}
 */
export function searchTitle({ title = '', subtitle = '', set = '', volume = '' }) {
  const name = plain(title);
  if (plain(set) && plain(volume)) {
    const isSetName = name.toLowerCase() === plain(set).toLowerCase();
    return name && !isSetName ? `${name} (${plain(set)}, volume ${plain(volume)})` : `${plain(set)}, volume ${plain(volume)}`;
  }
  const number = (plain(subtitle).match(VOLUME_WORDS) || [])[1];
  if (!number) return name;
  // What is left of the subtitle once the volume number and its dashes and brackets are taken out.
  const rest = plain(subtitle).replace(VOLUME_WORDS, ' ').replace(/[()[\]]/g, ' ').replace(/^[\s\-–—:,.]+|[\s\-–—:,.]+$/g, '').replace(/\s+/g, ' ');
  return rest ? `${rest} (${name}, volume ${number})` : `${name}, volume ${number}`;
}

/**
 * The question asked about a work's original date. It asks for both the
 * written and the published date, which the working-date rule needs.
 * @param {string} title the work's title, as the catalog gives it
 * @param {string[]} authorNames its authors' names (may be empty)
 * @returns {string} "When was Pride and Prejudice by Jane Austen written and first published?"
 */
export function workDateQuestion(title, authorNames) {
  const name = String(title || '').trim();
  const authors = namesText(authorNames || []);
  // A work with no author is usually named with "the" (the Didache), unless its title has an article already.
  const subject = authors ? `${name} by ${authors}` : ARTICLE.test(name) ? name : `the ${name}`;
  return `When was ${subject} written and first published?`;
}

/**
 * The web address that searches for a question.
 * @param {string} question
 * @returns {string}
 */
export function webSearchUrl(question) {
  return SEARCH_ADDRESS + encodeURIComponent(question);
}
