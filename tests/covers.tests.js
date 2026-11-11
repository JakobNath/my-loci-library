// Cover pictures keep their own shape (ui/pieces.js): a squarer cover stands
// at the foot of its book-shaped slot instead of leaving a band of color.
// Runs on the self-test page only, since it checks screen markup.

import { coverHtml } from '../ui/pieces.js';
import { ok } from '../core/tests/check.js';

const entryWithCover = (ratio, color = '#262a45') => ({
  id: 'lsj000000001', owned: true, authorLine: 'Liddell and Scott',
  edition: { title: 'A Greek-English Lexicon', images: [{ id: 'img000000001', kind: 'cover', source: 'photo', color, ratio, master: false, waiting: null }] },
});

export const tests = [
  {
    name: 'a cover wider than 2:3 fills the slot\'s width and keeps its own shape, with no colored band',
    fn() {
      const html = coverHtml(entryWithCover(0.78));
      ok(html.includes('cover-slot') && html.includes('cover-picture is-wide'), html);
      ok(html.includes('aspect-ratio:0.78'), 'the picture has its own shape');
      ok(!/class="cover cover-slot[^"]*" style="background/.test(html), 'the slot itself has no color');
    },
  },
  {
    name: 'on the book page the cover box takes the picture\'s shape, so a spine beside it is as tall',
    fn() {
      ok(/class="cover cover-slot" style="aspect-ratio:0.78"/.test(coverHtml(entryWithCover(0.78), 'l')), 'the box has the picture\'s shape');
    },
  },
  {
    name: 'a cover with no stored shape is drawn as before',
    fn() {
      ok(coverHtml(entryWithCover(null)).includes('cover has-image'), 'the old drawing is kept');
    },
  },
];
