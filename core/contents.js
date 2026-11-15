// Pasting a table of contents: one work per line, as "Author — Title",
// "Title", or "Author — Title — date" (PLAN.md, "Anthologies"), with the
// work's own translator anywhere after the title ("— trans. Edward Sittler").
// An em dash, a double hyphen or a bar separates the parts; ordinary hyphens
// and en dashes stay part of titles ("Romans 1–8").

import { parseDating, workingDating } from './dating.js';

const SEPARATOR = /\s+(?:—|--|\|)\s+|\s*—\s*/;
// "trans. Edward Sittler" or "translated by Edward Sittler", as a part of its own.
const TRANSLATOR_PART = /^(?:trans\.|translated by)\s+(.+)$/i;

/**
 * The names typed in a box of people (authors, translators, editors) or on a
 * contents line: separated by ";", or by "and" or "&" between two names
 * ("Pevear and Volokhonsky", "Karl Marx; Friedrich Engels"), as people write them.
 * @param {string|null} text
 * @returns {string[]}
 */
export function typedNames(text) {
  return String(text || '').split(/;|\s+(?:and|&)\s+/i).map(name => name.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/**
 * Read pasted contents.
 * @param {string} text one work per line
 * @returns {{ author: string|null, title: string, date: string|null, translator: string|null }[]}
 */
export function parseContentsLines(text) {
  const pieces = [];
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const all = line.split(SEPARATOR).map(part => part.trim()).filter(Boolean);
    // The translator part may come before or after a date ("Use these dates" adds the date at the end).
    const translatorPart = all.slice(1).find(part => TRANSLATOR_PART.test(part));
    const translator = translatorPart ? translatorPart.match(TRANSLATOR_PART)[1].trim() : null;
    const parts = all.filter(part => part !== translatorPart);
    if (!parts.length) continue;
    if (parts.length === 1) pieces.push({ author: null, title: parts[0], date: null, translator });
    else if (parts.length === 2 && parseDating(parts[1]).ok) pieces.push({ author: null, title: parts[0], date: parts[1], translator });
    else if (parts.length === 2) pieces.push({ author: parts[0], title: parts[1], date: null, translator });
    else {
      // Three parts or more: the last is the date only if it reads as one;
      // otherwise it belongs to the title ("Author — Title — Subtitle").
      const last = parts[parts.length - 1];
      const hasDate = parseDating(last).ok;
      pieces.push({ author: parts[0], title: parts.slice(1, hasDate ? -1 : undefined).join(' — '), date: hasDate ? last : null, translator });
    }
  }
  return pieces;
}

// A heading the page prints above its list, in the languages of this library.
const HEADINGS = /^(contents|table of contents|inhalt|inhaltsverzeichnis|index|conspectus|sommaire|indice)$/i;
// A page number as printed: 12, xvii.
const PAGE_NUMBER = /^(\d{1,4}|[ivxlc]{1,8})$/i;
const TRAILING_PAGE = /\s+(\d{1,4}|[ivxlc]{1,8})$/i;

/**
 * Text copied from a printed contents page (a phone's text reading, or a
 * web page), made into one work per line: dotted leaders, a heading such as
 * "Contents", lines that are only a page number, and blank lines go; a page
 * number at the end of a line goes when most lines end in one (a page column),
 * so a title such as "Psalm 23" on its own keeps its number. A translator the
 * page names ("Psalm 117 translated by Edward Sittler", or "translated by …"
 * on a line of its own under the title) is kept as "— trans. Edward Sittler".
 * The result is shown in the box to be corrected, never saved unseen.
 * @param {string} text as pasted
 * @returns {string} the tidied lines, joined by line breaks
 */
export function tidyPastedContents(text) {
  const lines = String(text ?? '').split(/\r?\n/)
    .map(line => line.replace(/(\s*[.·…_]\s*){3,}/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(line => line && !HEADINGS.test(line) && !PAGE_NUMBER.test(line));
  const numbered = lines.filter(line => TRAILING_PAGE.test(line)).length;
  const stripped = lines.map(line => line.replace(TRAILING_PAGE, ''));
  // Taking the numbers off must not make lines alike: "Psalm 23" and "Psalm 51" are titles, not pages.
  const pageColumn = lines.length > 1 && numbered / lines.length >= 0.6 && new Set(stripped).size === stripped.length;
  const works = [];
  for (const line of pageColumn ? stripped : lines) {
    const translated = line.replace(/\s+translated by\s+/i, ' — trans. ');
    // A "translated by" line belongs to the title above it.
    if (/^translated by\s/i.test(line) && works.length) works[works.length - 1] += ` — trans. ${line.replace(/^translated by\s+/i, '')}`;
    else works.push(translated);
  }
  return works.join('\n');
}

/**
 * One work as a contents line, for editing contents that already exist.
 * @param {string|null} [translator] the work's own translator in this book, from its contents entry
 */
export function contentsLine(work, authorNames, translator = null) {
  const dating = workingDating(work);
  return [authorNames.join(' and '), work.title, dating ? dating.text : '', translator ? `trans. ${translator}` : ''].filter(Boolean).join(' — ');
}
