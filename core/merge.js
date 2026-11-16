// Merging two versions of one record edited on different devices (DATA_FORMAT.md,
// "Merging"). Given the version both started from, a field changed on one side
// only keeps that change, and a list changed on both sides keeps both sides' items;
// any other field changed on both sides comes from whichever side changed it last.

import { FIELDS, migrate, recordToFileText } from './records.js';

// Lists merged item by item, each with what makes two items the same item.
// Other lists (authors, contributors, datings, location, ...) are taken whole:
// their order carries meaning, and a mix of two sides would be neither side's.
const SAME_TEXT = text => text;
const ITEM_KEYS = {
  images: image => image.id,
  valueHistory: point => point.date, // one value per day, as the app keeps it
  contents: entry => (entry.work ? `work ${entry.work}` : `piece ${entry.piece ? entry.piece.title : ''}`),
  tags: SAME_TEXT,
  otherTitles: SAME_TEXT,
  languages: SAME_TEXT,
  subjects: SAME_TEXT,
  otherIsbns: SAME_TEXT,
  extras: SAME_TEXT,
  otherNames: SAME_TEXT,
};

/**
 * Merge two versions of the same record. Both devices get the same result
 * whichever order they merge in.
 * @param {object} mineAsRead this device's version
 * @param {object} theirsAsRead the other device's version
 * @param {object|null} [baseAsRead] the version both started from (the one this
 *   device last synced); without it every field comes whole from one side
 * @returns {object} a new record
 */
export function mergeRecords(mineAsRead, theirsAsRead, baseAsRead = null) {
  // Each side as it would be stored: this app's data format, keys in file order,
  // so a field one side lacks is not taken as empty, nor key order as a change.
  const mine = asStored(mineAsRead);
  const theirs = asStored(theirsAsRead);
  const base = baseAsRead && asStored(baseAsRead);
  for (const other of base ? [theirs, base] : [theirs]) {
    if (mine.id !== other.id || mine.type !== other.type) {
      throw new Error(`Cannot merge different records: ${mine.type} ${mine.id} and ${other.type} ${other.id}.`);
    }
  }
  const merged = { ...mine, format: Math.max(mine.format, theirs.format), changed: {} };
  for (const name of [...Object.keys(FIELDS[mine.type]), 'trashed']) {
    const mineAt = mine.changed[name] || '';
    const theirsAt = theirs.changed[name] || '';
    // The side that changed it last; at the same moment (or neither stamped),
    // settled by the values themselves, the same way on every device.
    const theirsLater = theirsAt > mineAt || (theirsAt === mineAt && text(theirs[name]) > text(mine[name]));
    let value = theirsLater ? theirs[name] : mine[name];
    let at = theirsLater ? theirsAt : mineAt;
    if (base) {
      const mineChanged = text(mine[name]) !== text(base[name]);
      const theirsChanged = text(theirs[name]) !== text(base[name]);
      if (mineChanged && !theirsChanged) [value, at] = [mine[name], mineAt];
      else if (theirsChanged && !mineChanged) [value, at] = [theirs[name], theirsAt];
      else if (mineChanged && ITEM_KEYS[name]) value = mergedList(name, base[name], mine[name], theirs[name], theirsLater);
    }
    merged[name] = value;
    if (at) merged.changed[name] = at;
  }
  return merged;
}

const asStored = record => JSON.parse(recordToFileText(migrate(record)));
const text = value => JSON.stringify(value);

// A list both sides changed: an item removed on either side goes, an item added
// on either side stays, and an item changed on both takes the later side's change.
// The later side's order comes first, the other side's new items after.
function mergedList(name, baseList, mineList, theirsList, theirsLater) {
  const keyOf = ITEM_KEYS[name];
  const before = itemsByKey(baseList, keyOf);
  const later = itemsByKey(theirsLater ? theirsList : mineList, keyOf);
  const earlier = itemsByKey(theirsLater ? mineList : theirsList, keyOf);
  const result = [];
  for (const [key, item] of later) {
    if (before.has(key) && !earlier.has(key)) continue; // removed on the earlier side
    const changedOnlyEarlier = earlier.has(key) && text(item) === text(before.get(key));
    result.push(changedOnlyEarlier ? earlier.get(key) : item);
  }
  for (const [key, item] of earlier) {
    if (!later.has(key) && !before.has(key)) result.push(item); // added on the earlier side
  }
  if (name === 'images') return oneCoverOneSpine(result);
  if (name === 'valueHistory') return result.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return result;
}

// Items by their key, in order. A key met again (the same work twice in one
// book) is numbered, so each item is still matched with its own counterpart.
function itemsByKey(list, keyOf) {
  const items = new Map();
  for (const item of list || []) {
    const key = keyOf(item);
    let numbered = key;
    for (let n = 2; items.has(numbered); n++) numbered = `${key} (${n})`;
    items.set(numbered, item);
  }
  return items;
}

// A book shows one cover and one spine (withNewImage in records.js). If both
// sides put in a new one, the later side's comes first and is kept. Contents-page
// photos are all kept. The cover goes first, since the first cover is shown.
function oneCoverOneSpine(images) {
  const seen = new Set();
  const kept = images.filter(image => {
    if (image.kind !== 'cover' && image.kind !== 'spine') return true;
    if (seen.has(image.kind)) return false;
    seen.add(image.kind);
    return true;
  });
  return [...kept.filter(image => image.kind === 'cover'), ...kept.filter(image => image.kind !== 'cover')];
}
