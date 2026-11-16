# How My Loci Library is built and kept

My Loci Library is a lightweight, open-source catalog of Jakob and his wife's physical books and Logos library. It has to keep working for 40+ years, so these rules favor simple, durable choices over clever ones. Created by Jakob Nath.

This file holds every rule for working on the project: the app (this repository) and the laptop tools (`my-loci-library-tools`), which follow the same rules and point here. Whoever works on either, by hand or with whatever tools exist then, reads this file in full before changing anything. If a rule here disagrees with `docs/plan/PLAN.md`, follow PLAN.md and record the conflict as a decision.

---

## Where things are

- `docs/plan/STATUS.md`: where the project stands and what comes next.
- `docs/plan/PLAN.md`: the master plan and the source of truth. Finished build phases are in `docs/plan/archive/`.
- `docs/decisions/`: every choice the plan did not settle, with its reason, one file per topic.
- `DATA_FORMAT.md`: every field of a record.
- `HOW_IT_WORKS.md`: the parts and how to fix each one.
- `DEVICE_CHECKS.md`: the few things only a real phone can show.
- The tools' `README.md`: each laptop tool and how to run it.

The catalog lives in a private repository, `my-loci-library-data`. Automated tests never touch it: they use temporary folders and the sample books in `core/tests/samples.js`. While the app is still being tried out, trials may run against the catalog, after checking that its daily backup is recent.

## What to read before each kind of work

Read these in full before starting. Paths are in this repository.

| Doing this | Read first |
|---|---|
| Any code | This file |
| Anything touching records | `DATA_FORMAT.md`, `docs/decisions/data-format.md` |
| A screen | `docs/plan/DESIGN.md`, `docs/plan/INTERFACE_NOTES.md`, `docs/decisions/screens.md` and `design.md` |
| Lookups or search | `docs/decisions/book-data.md`; PLAN.md "Book data"; `SOURCES.md` |
| Photos, covers, scanning | `docs/decisions/photos-and-scanning.md`; PLAN.md "Covers and images" |
| Sync | `docs/decisions/sync.md`; `edges/sync-github.js` |
| Speed, offline, size | `docs/decisions/speed-offline-size.md` |
| Laptop tools | the tools' `README.md`, `docs/decisions/laptop-tools.md`; PLAN.md "Laptop tools" |
| Zotero or citations | `docs/decisions/zotero-and-citations.md`; PLAN.md "How Loci, Zotero and Obsidian work together" |
| Fixing something broken | `HOW_IT_WORKS.md` |
| Test data | `docs/plan/SAMPLE_BOOKS.md` |
| Whether a feature belongs | PLAN.md "Purpose and principles" and "Deferred and out of scope" |

## How to work

- Start each working session by running the tests (below), and take the next task from `STATUS.md`. Keep `STATUS.md` current as you go.
- If something is not covered by the plan, choose the lightest option that fits the plan, then record the choice and the reason at the end of the right file in `docs/decisions/`.
- If something fails, use the fallback the plan names. If none is named, choose the simplest one and record it.
- Don't add features that aren't in `PLAN.md`.
- Risky work (a data format change, a migration, a large restructuring) goes on a branch and is merged once the tests pass. Small fixes go straight to `main`.
- Before calling a change to a screen done, use it in a browser at phone width as a person would. Anything only a real phone can show, and that daily use would never show (setting up a device, storage, offline, a rare failure), goes on `DEVICE_CHECKS.md` as a short item: what to try and what should happen. Everything else is checked by using the app.
- Every change meets the definition of done (section 12).

## Hard rules

**Code**

- Plain HTML, CSS and JavaScript (ES modules). No frameworks, no build step, no bundler, no TypeScript, no npm packages, no CDNs.
- Tools run on Node using only built-in modules (`node:fs`, `node:path`, `node:test`, global `fetch`, and so on).
- Third-party code goes only in a `vendor/` folder, each file with its version, license and source URL in `vendor/README.md`. One library is expected (the barcode decoder). Another is added only when it is clearly warranted, with a recorded decision.
- Use only web features that are "Baseline widely available". Anything newer must sit behind a feature check with a working fallback. No Chromium-only APIs, no push notifications, nothing experimental.
- The app stays small, but no size number is enforced: the speed tests in `PLAN.md` are the guard, and a test prints the start-up size so slow growth is seen. The vendored barcode decoder loads only on the scan screen. Heavy work (bulk covers, re-cropping, the HTML catalog, building `catalog.json`) belongs on the laptop, never in the phone app.
- All styling comes from the design tokens file (`styles/tokens.css`). Don't hard-code colors, fonts or spacing elsewhere.
- All GitHub-specific code lives in one sync module. No other file talks to GitHub.
- The app never talks to Zotero, Obsidian, Logos or any AI service. Its only outside calls are the optional Open Library, Google Books, HathiTrust and Wikidata lookups, and GitHub through the sync module. Each lookup is optional, identifies the app, backs off when refused, and never stops a book being entered by hand (`SOURCES.md`).
- Tools must run on Windows and Linux: use `node:path` for paths, and ship any launcher as a matching `.cmd` and `.sh` pair.

**Data**

- One pretty-printed JSON file per record, keys always in the same order, UTF-8, newline at the end of the file.
- Record IDs are random, permanent, and never changed or reused.
- Never change the data format without updating `DATA_FORMAT.md`, raising the format version, and keeping older records readable.
- Original dates are set by a person: typed, chosen, or confirmed with one tap from a suggestion or a checked known-set list. They are never saved from a lookup without that.
- Never commit keys, tokens or personal data. Sync keys live only on our devices and in the setup links we send each other; never in a repository or in the app's code.

**Tests**

- Run the self-tests before and after every change: the browser test page (`tests/index.html`) and `node --test` in this repository (the same core tests, plus the sync tests and the architecture checks), and `node --test` in the tools.
- Tests are short and plain, so a person can read and fix them with no special tool.
- Keep the speed targets from `PLAN.md` covered by tests.

**Credits and writing style**

- Credit goes only to Jakob Nath ("Created by Jakob Nath"). No attribution to any assistant or code-writing tool anywhere: no co-author lines, no "generated with" notes, and no such tool or product named in code, comments, docs or commit messages, so nothing here dates when a product disappears.
- Commit messages are short and plain, in the imperative ("Add date parser tests").
- Docs and comments read as written by a person for a person: plain sentences, no hype, no emoji, no filler. Write for a reader in 2045 who remembers nothing about this project.

---

The numbered sections below are how the code itself is written. Code comments cite them by number.

Every rule serves one question:

> **Could someone who knows basic JavaScript, and nothing else about this project, open any one file, understand it, and change it safely, with the tests telling them if they broke something?**

When a rule here seems to conflict with that question, the question wins. Record the exception in `docs/decisions/`.

---

## 1. What "lightweight" means here

Weight is everything a future reader must know, trust or keep running for the code to work. In order of how much it costs over ten years:

1. **Outside dependencies:** libraries, build tools, services. They change and disappear. That's why there are none except the vendored barcode decoder.
2. **Concepts:** every pattern, convention or abstraction the reader must learn before reading the code.
3. **Indirection:** every layer between "where it's called" and "where it happens".
4. **Hidden behavior:** anything that works because of a convention, global state or a file somewhere else.
5. **Process:** any step needed to run, test or deploy. Here: open the page, or run `node --test`. Nothing else.

Small code size is a side effect, not the goal. A longer, plain function beats a short, clever one.

---

## 2. Architecture: one rule, no ceremony

From *Clean Architecture* we keep the **dependency rule** and **single responsibility**. We deliberately skip the rest of the ceremony (interface layers, dependency-injection containers, use-case classes, presenters), because for a two-person app it adds more weight than it removes.

### The three rings

```
core/        Pure rules of the library. No browser, no Node, no network, no storage.
             Imports only other core files.

edges/       One small module per outside thing. Each talks to exactly one outside
             system and nothing else.

ui/ + main   Screens. They call core for rules and edges for the outside world.
             main.js wires it all together.
```

**Dependencies point inward only.** `ui` may import `edges` and `core`. `edges` may import `core`. `core` imports nothing outside `core`. A test enforces this (see section 8).

### The edge modules (app)

| Module | Talks to | Nothing else may |
| --- | --- | --- |
| `edges/storage.js` | IndexedDB | touch IndexedDB |
| `edges/sync-github.js` | GitHub API | call GitHub |
| `edges/lookup-openlibrary.js` | Open Library | call Open Library |
| `edges/lookup-googlebooks.js` | Google Books | call Google Books |
| `edges/lookup-hathitrust.js` | HathiTrust | call HathiTrust |
| `edges/lookup-wikidata.js` | Wikidata | call Wikidata |
| `edges/camera.js` | camera, barcode decoder | use `getUserMedia` or the decoder |
| `edges/photo.js` | canvas (detect, straighten, enhance, compress) | use canvas for photos |
| `edges/device.js` | settings stored on this device | read device settings directly |

**Why this matters for this project:** in ten years GitHub's API, iOS camera rules, and Zotero will each have changed at least once. Each change should mean rewriting one edge file, with core and screens untouched.

### The laptop tools

The tools follow the same shape: `core/` (a copy of the app's), and per tool an `edges/` for the outside system it touches (Logos CSV files, Zotero, the file system) plus a thin `main.js`.

- Never edit the tools' `core/` or `sets/`: change them in the app, then run `update-core` (`.cmd` or `.sh`) in the tools and run the tools' tests. A test there fails if the copies differ.
- Use `node:path` for every path. Each launcher is a `.cmd` and `.sh` pair; the tools' `.gitattributes` gives `.cmd` Windows line endings and `.sh` Linux ones.
- The tools read `config.json`, which is never committed because it holds keys. Never print a key.
- Tests use temporary folders and recorded answers, never the real catalog or the network.
- Jakob's Zotero library holds real items he cites. A trial never changes an existing item, and goes into a test collection only.

### Dependency inversion, the plain way

Don't create interfaces or classes for it. Pass functions. A screen that needs to save receives `save` from `main.js`. A core function that needs "today" takes the date as an argument instead of reading the clock. Core functions never reach out; things are handed to them.

---

## 3. Core: pure, plain, total

- **Pure functions only.** Same input, same output, no side effects. No `Date.now()`, no `Math.random()`, no `crypto`, no I/O inside core. Pass those values in.
- **Plain data only.** Records are plain JSON objects, exactly as stored on disk. No classes, no prototypes, no methods on records. What's in memory is what's in the file.
- **Never mutate inputs.** Return new objects.
- **Total functions.** Handle every input the data format allows. If input is invalid, return a clear result (validation returns a list of problems) or throw an `Error` whose message says what was wrong and what was expected.
- **Format changes go through migrations.** When the data format version rises, core gets a function `migrate(record)` that upgrades old records one version at a time, with tests for each step. Old records are never silently reinterpreted. A format change goes on a branch.
- A new file in the app, in core or anywhere else it loads, is added to `FILES` in `sw.js` (the offline test checks this).

---

## 4. One vocabulary everywhere

Use the same words in the data, the code, the UI and the docs. They are defined once in `DATA_FORMAT.md`:

> work, edition, copy, author, contents (of an anthology), dating, working dating, sort year, earliest, latest, certainty, location, binding, series, set, wishlist item, status, value, value history, cover, spine, thumbnail, detail image, cover inbox

- Never invent synonyms (`book`, `item`, `entry`, `volume`) for these in code. "Book" is fine in UI text, where it means what a person means.
- Names say what something **is**: `sortYear`, `parseDating`, `editionsOfWork`. Not `data`, `info`, `handle`, `process`, `util`, `manager`, `helper`.
- Booleans read as yes/no questions: `isDigital`, `hasMarkings`.
- Functions are verbs, values are nouns. No abbreviations beyond common ones (`id`, `isbn`, `url`).

---

## 5. Files and functions

- **One responsibility per file**, stated in a header comment of 1–3 lines: what this file is for, and which outside system it touches, if any.
- **Length is a guide, not a rule.** A file is judged by whether it causes bugs and whether the tests catch a mistake in it, not by its line count (loosened on 13 November 2026). Split by responsibility, not by length: a 60-line function that reads top to bottom is better than four 15-line functions that bounce between each other.
- **Flat and searchable.** Shallow folders. Searching the project for a word in the UI or a field name should land on the code that handles it. No string-built property names, no dynamic imports except loading code on demand (the camera, the photo editor, screens opened later).
- **No metaprogramming, no generated code, no global variables** (one exception: `main.js` holds the app's top-level state, and it says so).
- **One way to do each thing.** Before writing a helper, search for an existing one. If a pattern exists, follow it, even if you would have chosen differently.
- **Don't abstract early.** Write it plainly the first time. Write it again the second time. Extract a shared function only when the third use proves what is actually shared.

---

## 6. The user interface without a framework

The usual failure of framework-free code is accidentally building a worse framework. Avoid that with one deliberately simple pattern, used everywhere:

- Each screen is one file exporting `render(container, state, actions)`. It builds the screen's HTML, puts it in the container, and wires events (one delegated listener per screen, using `data-action` attributes).
- State changes go through `actions` from `main.js`, which updates state and calls `render` again for the affected screen. No two-way binding, no observers, no virtual DOM.
- **Long lists are the one exception:** the library grid draws only visible rows, in one clearly named module.
- **Escape all text from data before it goes into HTML**, using the single `escapeHtml` helper. Titles, notes and anything from a lookup are data, never markup. This is a security rule, not a style preference.
- All look and feel comes from `styles/tokens.css`. Screens use token variables, never raw colors, fonts or sizes.
- Only the Library and the book page load at start; other screens and `styles/screens.css` load when first opened.

---

## 7. Errors and the outside world

- **Never fail silently.** No empty `catch` blocks. No fallbacks that hide a problem without telling anyone.
- **Edges translate failures into plain messages** a person can act on: "Your sync key has expired. Here's how to make a new one." Not "Error 401".
- **Feature checks live in the edge that needs them,** each with a working fallback and a comment naming the feature and why it's checked.
- **Check inputs at the edges, trust them in core.** Data from lookups, files, cameras or users is validated once, at the edge where it enters.
- **Don't scatter defensive checks.** One validation at the boundary beats a null check in every function.

---

## 8. Tests are the specification

- Every core function has tests. Test names are sentences that state the rule: `"early 2nd century gives 101 to 133"`, `"a disputed work sorts by its working dating"`.
- **Tests use the sample books** from `SAMPLE_BOOKS.md` wherever possible, so the specification is written in real cases.
- **No mocking libraries.** Edges are tested with small hand-written fakes (`tests/fake-github.js`), or real browser APIs where they work in a test page. Never the real services or the real catalog.
- **Architecture tests**, which are short scans of the source files:
  - `core/` imports nothing outside `core/` and uses no browser or Node globals.
  - Only `edges/sync-github.js` mentions `api.github.com`, and only each lookup edge mentions its service.
  - No file outside `edges/storage.js` uses `indexedDB`.
  - Every `innerHTML` assignment uses `escapeHtml` for data.
  - The start-up size is printed, not limited, so slow growth is seen.
- **Speed targets from `PLAN.md` are tests**, not hopes.
- A failing test is never deleted or weakened to make a change pass. Either the change is wrong, or the rule changed and `PLAN.md` says so.

---

## 9. Comments and decisions

- **Comments explain why, never what.** The code says what. Example: `// BC years are negative so sorting works across the era boundary.`
- Every non-obvious number gets a comment with its reason: `600 // detail cover height in px, chosen in the photo prototype round 2`.
- Exported core functions get a short JSDoc block (purpose, parameters, return value). It gives types and hints to any editor, with no build step. Nothing more elaborate.
- **Decisions go in `docs/decisions/`**, at the end of the file for their topic: date, what was decided, what was rejected, and why. One short paragraph each. In ten years, *why* is worth more than *what*.
- No commented-out code, no `TODO` without a matching item in `docs/plan/STATUS.md`, no dead code. Git remembers deleted code.

---

## 10. Formatting

There is no formatter tool (it would be an npm dependency), so the rules are short and followed by hand:

- 2-space indents, semicolons, single quotes, trailing commas in multi-line lists.
- `const` by default, `let` when reassigned, never `var`. Always `===`.
- `async`/`await` rather than `.then` chains.
- ES modules with explicit `.js` extensions in imports.
- Lines under about 100 characters.

---

## 11. Habits to watch for

Code written in a hurry, or with the help of code-writing tools, drifts in predictable ways. Watch for and avoid:

- **Over-abstraction:** factories, wrappers and "flexible" options nobody asked for.
- **Narrating comments** that restate the code line by line.
- **Defensive clutter:** null checks and try/catch everywhere instead of validating once at the edge.
- **Reinvented helpers:** a new date or escape function written when one already exists. Search first.
- **Silent fallbacks** that swallow errors to make something "work".
- **Inconsistent names** for the same thing across files.
- **Big-bang changes:** prefer small steps, each one leaving all tests passing.

The goal is code that reads as if one careful person wrote it, in one consistent voice.

---

## 12. Definition of done (every step)

- [ ] Follows the three rings; architecture tests pass.
- [ ] All tests pass in the browser test page and `node --test`, in the app and the tools.
- [ ] Uses the vocabulary in `DATA_FORMAT.md`; no new synonyms.
- [ ] Every file has its header comment; comments explain why.
- [ ] No new dependency, global, or abstraction without a recorded decision.
- [ ] Any data format change has a migration, a test, and an updated `DATA_FORMAT.md`.
- [ ] A screen change was used in a browser at phone width; anything only a phone can show is on `DEVICE_CHECKS.md`.
- [ ] Someone new could understand and safely change what was just written.
