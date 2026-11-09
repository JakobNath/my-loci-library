// The Wishlist tab: books we want, with their notes. Buying one, and adding
// new items, arrive in phase 8.

import { escapeHtml } from '../core/html.js';

export function render(container, state) {
  const items = state.library.wishlist.map(wish => wish.item).sort((a, b) => a.title.localeCompare(b.title));
  const itemsHtml = items.map(item => `<div class="block"><h2 class="block-title">${escapeHtml(item.title)}</h2>`
    + `<p class="detail-author">${escapeHtml([item.subtitle, item.authors.join(', '), item.publisher].filter(Boolean).join(' · '))}</p>`
    + (item.notes ? `<div class="notes"><p>${escapeHtml(item.notes)}</p></div>` : '') + '</div>').join('');
  container.innerHTML = `<div class="page-head"><h1 class="page-title">Wishlist</h1><p class="page-meta">${escapeHtml(`${items.length} wanted`)}</p></div>`
    + (itemsHtml || '<p class="empty">Nothing on the wishlist yet.</p>');
}
