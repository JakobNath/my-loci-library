// Pasting a printed contents page into a contents box (Add and Edit book):
// the copied text is tidied as it goes in (core/contents.js), so page numbers
// and dotted leaders never have to be deleted by hand. Each paste goes on its
// own lines, so a list running over several pages is pasted a page at a time.

import { tidyPastedContents } from '../core/contents.js';

/**
 * Tidy what is pasted into any `textarea[data-tidy-paste]` inside the element.
 * @param {HTMLElement} container
 */
export function wireTidyPaste(container) {
  container.addEventListener('paste', event => {
    const box = event.target;
    if (!box.matches || !box.matches('textarea[data-tidy-paste]')) return;
    const text = event.clipboardData ? event.clipboardData.getData('text/plain') : '';
    if (!text) return; // nothing readable: the browser pastes as it would
    event.preventDefault();
    const before = box.value.slice(0, box.selectionStart);
    const glue = before && !before.endsWith('\n') ? '\n' : '';
    box.setRangeText(glue + tidyPastedContents(text), box.selectionStart, box.selectionEnd, 'end');
    box.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
