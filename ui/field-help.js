// Plain explanations of the fields people wonder about, shown by a small "i"
// beside the field's label, and the short guide in Settings ("How the catalog
// is organized"). Kept in one place so a field is explained the same way on
// every screen. Loaded only with the screens that use it.

import { escapeHtml } from '../core/html.js';

/** One or two sentences per field, by the field's name in the forms. */
export const FIELD_HELP = {
  originalTitle: 'The title in the language the work was written in, such as Confessiones for Augustine\'s Confessions. Search finds the book under either title.',
  originalLanguage: 'The language the work was first written in, not the language of this book: Latin for a translation of Augustine, English for a book written in English.',
  category: 'One broad grouping for the work, such as Patristics, Philosophy or Fiction, shared by every edition of it. Keep to a short list; tags carry the details.',
  tags: 'Topics the work is about, as many as help, such as Christology or Stoicism, separated by commas. Every edition of the work shares them.',
  editionStatement: 'The edition as printed on the title page or its back, such as "2nd ed." or "Revised edition".',
  translationFirstPublished: 'For a translation, the year this translation first appeared, which may be long before this printing (the Maude translation of Anna Karenina: 1918).',
  series: 'A publisher\'s numbered line of different works, such as Loeb Classical Library 36 or Everyman\'s Library 112. The number goes in Number.',
  set: 'One work or collection in several volumes, such as Luther\'s Works or Great Books of the Western World. Each volume is its own book here; its volume goes in Volume.',
  pages: 'Copied as printed, roman numerals and all, such as "xxviii, 311". The app works out the total.',
  languages: 'Every language the text is printed in. "Greek, English" marks a book with the original and a translation side by side.',
  binding: 'How this copy is bound: hardcover, paperback, mass-market paperback. It also helps the shelf view draw the book at about the right size. The choices are kept in Settings › Rename and merge.',
  material: 'What the cover is made of, when it matters: cloth, leather or bonded leather. Leave it empty for an ordinary printed cover.',
  extras: 'What came with this copy, such as a dust jacket or a slipcase. Tap each that applies.',
  shortTitle: 'The set\'s usual abbreviation, used to cite a volume: LW or AE for Luther\'s Works. Searching "LW 31" finds volume 31.',
  valueAsSet: 'On: only the set\'s own value counts, once, as for a set bought whole. The volumes keep their own prices and values, which are not counted while this is on. Off: each volume counts its own value, and the set\'s value counts for the volumes bought with it.',
};

/**
 * The "i" button for a field, to sit inside its label, and the explanation it
 * shows, hidden until asked for. A button inside a label does not move the
 * cursor into the box, so tapping it only opens the explanation.
 * @param {string} name a key of FIELD_HELP
 */
export function helpHtml(name) {
  return {
    button: `<button type="button" class="help" data-help="${escapeHtml(name)}" aria-expanded="false" aria-label="What is this?">i</button>`,
    text: `<span class="help-text" data-help-text="${escapeHtml(name)}" hidden>${escapeHtml(FIELD_HELP[name])}</span>`,
  };
}

/**
 * Open or close the explanation for a tapped "i" button. Only one is open at
 * a time, so a form never fills up with text.
 * @param {HTMLElement} container the screen
 * @param {HTMLElement} button the tapped button
 */
export function toggleHelp(container, button) {
  const name = button.dataset.help;
  const isOpening = button.getAttribute('aria-expanded') !== 'true';
  for (const other of container.querySelectorAll('[data-help]')) other.setAttribute('aria-expanded', 'false');
  for (const text of container.querySelectorAll('[data-help-text]')) text.hidden = true;
  if (!isOpening) return;
  button.setAttribute('aria-expanded', 'true');
  const text = button.closest('label').querySelector(`[data-help-text="${name}"]`);
  if (text) text.hidden = false;
}

// The guide in Settings: what the catalog's parts mean and how to use them.
const GUIDE = [
  {
    title: 'Work, edition and copy',
    paragraphs: [
      'Every book is kept in three layers. The work is the writing itself, such as Augustine\'s Confessions: its original title, language and date, its category and its tags belong to it. An edition is one printing or translation of it, with its publisher, year, translator, series and pages. A copy is the book on our shelf: its binding, where it stands, what we paid, what it is worth, and our notes.',
      'Two translations of the Confessions are two editions of one work, so they share the work\'s date and tags, and each book page lists the other editions.',
    ],
  },
  {
    title: 'Series and sets',
    paragraphs: [
      'A series is a publisher\'s numbered line of different works, such as the Loeb Classical Library, where Plato and Cicero stand side by side. A set is one work or collection in several volumes, bought and shelved together, such as Luther\'s Works or Great Books of the Western World.',
      'Each volume of a set is its own book here, with the set\'s name and its volume, so a set we own only part of shows exactly which volumes we have. A book can belong to a series and a set at once.',
    ],
  },
  {
    title: 'Categories and tags',
    paragraphs: [
      'A category is one broad grouping per work; tags are any number of topics. Both belong to the work, so every edition shares them, and the Library can be filtered by either. Search finds tags too.',
    ],
    points: [
      'Keep categories few, about ten to twenty, matched to how the shelves and our papers divide: Patristics, Reformation, Philosophy, Fiction.',
      'Use tags for topics you would look up or write on: Christology, Stoicism, Russian novel.',
      'Don\'t tag what a field already holds. Author, language, shelf and Logos have their own fields and filters.',
      'Choose one spelling and keep to it; names already used are suggested as you type.',
      'Rename or merge a category or tag at any time in Settings › Rename and merge. The change reaches every book.',
    ],
  },
  {
    title: 'Original dates',
    paragraphs: [
      'The original date is when the work was written or first published, not when this book was printed. Only a person sets it: online sources usually give the printing\'s year, so lookups never fill it.',
      'Type it as a scholar would: 1689, c. 397, 397–400, 4th c. BC, after 1517. A work whose date is disputed can have more than one dating, with one marked as ours for sorting.',
    ],
  },
  {
    title: 'Where the details come from',
    paragraphs: [
      'When a book is added, the phone asks Open Library and Google Books for its details and cover. Each night the laptop also asks the Library of Congress, which a phone cannot reach, and fills fields that are still empty: exact pages, height, translators and editors, call numbers. It never changes anything a person typed.',
      'What only a person knows is ours to fill in, and adding a book asks for it: the original date and language, category and tags, the translation, where the book stands, and why we own it.',
      'The Library\'s filter "Needs details", and the count in Settings, show the books still missing a publisher, year, pages or binding once the laptop has checked them. Each such book\'s page says what is missing. After a long scanning session, the laptop\'s check can be run at once with loci-enrich, rather than waiting for the night.',
    ],
  },
];

/** The guide page's sections, as markup. */
export function guideHtml() {
  return GUIDE.map(section => `<section class="block"><h2 class="block-title">${escapeHtml(section.title)}</h2>`
    + section.paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('')
    + (section.points ? `<ul class="guide-points">${section.points.map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul>` : '')
    + '</section>').join('');
}
