// The one exception to "render the whole screen" (CODE_STYLE.md, section 6):
// long lists draw only the rows on screen, so 10,000 books scroll as
// smoothly as 50. Rows all have the same height, measured once.

/**
 * Show `count` items in rows of equal height, drawing only the visible ones.
 * @param {HTMLElement} container
 * @param {number} count
 * @param {object} options
 * @param {(index: number) => string} options.itemHtml markup for one item (escaped by the caller)
 * @param {number} options.minWidth smallest item width in pixels; 0 for one item per row
 * @param {string} options.className class of each row ("grid" or "list")
 * @returns {() => void} call to stop following the scroll when the screen changes
 */
export function showLongList(container, count, { itemHtml, minWidth, className }) {
  container.innerHTML = '<div class="long-list"><div class="long-list-window"></div></div>';
  const list = container.firstChild;
  const window_ = list.firstChild;
  if (!count) return () => {};
  const style = getComputedStyle(list);
  const gapX = parseFloat(style.getPropertyValue('--grid-gap-x')) || 0;
  const gapY = className === 'grid' ? parseFloat(style.getPropertyValue('--grid-gap-y')) || 0 : 0;
  let columns = 1;
  let rowHeight = 0;
  let drawn = '';

  function measure() {
    const width = list.clientWidth;
    columns = minWidth ? Math.max(1, Math.floor((width + gapX) / (minWidth + gapX))) : 1;
    // One sample row tells the height of every row.
    window_.innerHTML = rowHtml(0);
    rowHeight = window_.firstChild.offsetHeight + gapY;
    list.style.height = `${Math.ceil(count / columns) * rowHeight}px`;
    drawn = '';
  }

  function rowHtml(row) {
    let items = '';
    for (let i = row * columns; i < Math.min(count, (row + 1) * columns); i++) items += itemHtml(i);
    return `<div class="${className}" style="grid-template-columns:repeat(${columns},minmax(0,1fr));margin-bottom:${gapY}px">${items}</div>`;
  }

  function draw() {
    const top = list.getBoundingClientRect().top;
    const first = Math.max(0, Math.floor(-top / rowHeight) - 2);
    const last = Math.min(Math.ceil(count / columns), first + Math.ceil(innerHeight / rowHeight) + 5);
    const key = `${first}-${last}-${columns}`;
    if (key === drawn) return;
    drawn = key;
    let rows = '';
    for (let row = first; row < last; row++) rows += rowHtml(row);
    window_.style.transform = `translateY(${first * rowHeight}px)`;
    window_.innerHTML = rows;
  }

  // Browsers send at most one scroll event per frame, and draw() returns at
  // once when the visible rows have not changed, so no further throttling.
  const onScroll = () => draw();
  const onResize = () => { measure(); draw(); };
  measure();
  draw();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize);
  return () => {
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onResize);
  };
}
