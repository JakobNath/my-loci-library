// Running a sync on this device (PLAN.md, "Sync"): download what changed,
// merge it with changes made here, send this device's changes, and keep the
// thumbnails; and the checks before a device moves to another catalog. Part
// of main.js, kept in its own file so it loads just after the first screen
// appears, not with it, which keeps the start-up code within its budget.
// `app` is what main.js lends it: { state, storage, render, showNote, showUnsent }.

import { connectToGitHub } from './edges/sync-github.js';
import { buildLibrary, withSearchText } from './core/library.js';
import { withDefaults, settingsToFileText } from './core/settings.js';

/**
 * Bring this device and GitHub up to date: download what changed, merge it
 * with changes made here, then send this device's changes as one commit.
 * If another device committed in between, try again (at most three times).
 * main.js has already checked that no other sync is running.
 */
export async function runSync(app, github, quiet) {
  const { state, storage } = app;
  let brought = false; // whether the download changed anything the screen shows
  let settled = false; // whether this device's changes arrived, or there were none
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const outboxIds = (await storage.outbox()).map(item => item.id);
      const pulled = await github.pull({
        known: new Map((await storage.meta('known')) || []), local: state.records, outbox: new Set(outboxIds),
        onProgress: (done, total) => { if (!quiet) app.showNote(`Downloading ${done} of ${total}…`); },
      });
      await storage.saveRecords(pulled.records);
      for (const record of pulled.records) state.records.set(record.id, record);
      // Settings changed here win over the other device's: the file is small and changed rarely.
      const settingsUnsent = await storage.meta('settingsUnsent');
      if (pulled.backupStatus) { await storage.saveMeta('backupStatus', pulled.backupStatus); state.backupStatus = pulled.backupStatus; }
      if (pulled.settings && !settingsUnsent) { await storage.saveMeta('settings', pulled.settings); state.settings = withDefaults(pulled.settings); }
      if (pulled.records.length || pulled.backupStatus || (pulled.settings && !settingsUnsent)) brought = true;
      await storage.saveMeta('known', [...pulled.known]);
      const records = outboxIds.map(id => state.records.get(id)).filter(Boolean);
      const imageIds = (await storage.meta('imageOutbox')) || [];
      const sentSettings = state.settings;
      if (!records.length && !imageIds.length && !settingsUnsent) { settled = true; break; }
      const images = [];
      for (const id of imageIds) {
        for (const size of ['thumb', 'detail', 'master']) {
          const blob = await storage.image(`${id}/${size}`);
          if (blob) images.push({ path: `images/${size}/${id}.jpg`, base64: await base64Of(blob) });
        }
      }
      try {
        const files = settingsUnsent ? [{ path: 'settings.json', text: settingsToFileText(state.settings) }] : [];
        const sent = await github.push({ records, files, images, base: pulled.commit, message: `Save ${records.length} changed records${images.length ? ` and ${imageIds.length} pictures` : ''}` });
        // Sending takes seconds, and a person may save again meanwhile. Only what
        // was sent is taken off the lists: a record changed since stays queued
        // (every save puts a new object in state.records), and so does a
        // picture added since, and settings changed since.
        await storage.clearOutbox(records.filter(record => state.records.get(record.id) === record).map(record => record.id));
        const sentImages = new Set(imageIds);
        await storage.saveMeta('imageOutbox', ((await storage.meta('imageOutbox')) || []).filter(id => !sentImages.has(id)));
        if (state.settings === sentSettings) await storage.saveMeta('settingsUnsent', false);
        await storage.saveMeta('known', [...pulled.known, ...sent.known]);
        settled = true;
        break;
      } catch (error) {
        if (!error.conflict) throw error; // another device saved first: go round again, merging its changes
      }
    }
    if (!settled) throw new Error('Other devices kept saving at the same moment, so this device\'s changes are still waiting. They are kept here and sent with the next sync.');
    state.library = withSearchText(buildLibrary([...state.records.values()]));
    state.syncStatus = `Synced at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
    keepThumbnails(github, app);
    // The screen is drawn again only when the download changed what it shows, and
    // batch add and the entry form are never redrawn under the person's hands.
    // Settings always shows the new sync time.
    const isForm = ['add', 'new', 'edit'].includes(state.route.name);
    if ((brought && !isForm) || state.route.name === 'settings') app.render();
    return true;
  } catch (error) {
    state.syncStatus = error.message;
    if (!quiet) app.showNote(error.message);
    if (state.route.name === 'settings') app.render();
    return false;
  }
}

async function base64Of(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}

// Physical books' thumbnails are kept on every device, so the grid works
// offline (PLAN.md, "Sync"); Logos thumbnails only once seen. Fetched a few
// at a time after a sync, in the background.
async function keepThumbnails(github, { state, storage }) {
  const keys = state.library.entries.filter(entry => !entry.isDigital)
    .flatMap(entry => entry.edition.images.filter(image => image.kind === 'cover' && !image.waiting).map(image => `${image.id}/thumb`));
  const queue = [];
  for (const key of keys) if (!(await storage.image(key))) queue.push(key);
  const worker = async () => {
    while (queue.length && navigator.onLine) {
      const key = queue.shift();
      const blob = await github.image(`images/thumb/${key.split('/')[0]}.jpg`).catch(() => null);
      if (blob) await storage.saveImage(key, blob).catch(() => {});
    }
  };
  await Promise.all([worker(), worker(), worker()]);
}

/**
 * Before moving to another repository: check the new one works (so a typo
 * never empties the device), then ask. The old catalog stays on GitHub.
 * Returns whether to go on: main.js then empties this device's copy.
 */
export async function mayMoveToAnotherCatalog(app, syncRepo, syncKey) {
  const { state, storage } = app;
  const oldRepo = state.device.syncRepo;
  const repoName = syncRepo.split('/').pop();
  // Each key opens only the repositories chosen when it was made, so the old
  // key never opens the new catalog: say so, rather than let GitHub refuse it.
  if (syncKey === state.device.syncKey) {
    return refuseSwitch(app, `This device's key was made for ${oldRepo}. Make a new key for ${syncRepo} (Settings › Advanced › Sync, step 2), paste it in step 3, and tap "Connect and download" again.`);
  }
  try {
    await connectToGitHub({ repo: syncRepo, key: syncKey }).check();
  } catch (error) {
    if (error.status === 403 || error.status === 404) {
      return refuseSwitch(app, `GitHub did not let this key open ${syncRepo}. Check the name, then make the key again: under "Repository access", choose "Only select repositories" and pick ${repoName}.`);
    }
    return refuseSwitch(app, error.message);
  }
  const unsent = (await storage.outbox()).length + ((await storage.meta('imageOutbox')) || []).length
    + ((await storage.meta('settingsUnsent')) ? 1 : 0);
  const lost = unsent ? ` ${unsent} changes made here were never sent to it and will be lost.` : '';
  const question = `This device holds ${state.records.size} records from ${oldRepo}. `
    + `They will be removed from this device; they stay in that repository.${lost}\n\n`
    + `Connect to ${syncRepo} and start from its catalog?`;
  return confirm(question);
}

// Moving to another repository did not happen: say why, and that nothing changed.
function refuseSwitch(app, reason) {
  app.state.syncStatus = `${reason} Nothing was changed; still connected to ${app.state.device.syncRepo}.`;
  app.showNote(reason);
  app.render();
  return false;
}
