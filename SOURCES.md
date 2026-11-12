# Sources

The outside services My Loci Library asks for book details: what each is used for, where it is asked from, its limits and terms, and when they were last checked. Nothing in the catalog depends on any of them: if one changes or closes, the fields it filled stay as they are and books can still be entered by hand.

Check this file once a year, in the yearly ten-minute check (`HOW_IT_WORKS.md`): open each source's pages below, compare, run the contract tests, and update "Last checked". Where something could not be confirmed, it says so.

The phone asks only sources that allow calls from a web page. The laptop tools (`loci-enrich`) ask all of them, keep each raw answer in the private data repository, and record which source filled which field.

## Library of Congress

- **Used for:** the most exact cataloguing: pages as printed, height, translators and editors, series, original title and language, contents notes, subject headings, call numbers.
- **Asked from:** the laptop only (`loci-enrich/sources.mjs`).
- **Address:** `http://lx2.loc.gov:210/lcdb` (SRU, MARC XML), searched by `bath.isbn` and `bath.lccn`. A title search there returns unrelated records; search by number only.
- **Why not the phone:** the service has no encrypted connection and does not allow calls from web pages. The newer JSON site (`www.loc.gov/books/?fo=json`) does not search the catalog by ISBN (checked 11 November 2026).
- **Terms:** the records are the work of the US government and free to reuse.
- **Watch:** the Library is moving its cataloguing to BIBFRAME gradually and keeps MARC alongside it; plan for both for years.
- **Contract test:** recorded answers in `core/tests/answers/` read by `core/marc.js`.
- **Last checked:** 11 November 2026 (answers live; Loeb set records with contents; no record for the UK Everyman Montaigne or the Loeb Plato I).

## HathiTrust

- **Used for:** university library records (often copied from the Library of Congress) with the contents of Loeb volumes and Great Books, original titles, set records listing each volume's works, and links to free full-view scans of older books.
- **Asked from:** the phone while adding, and the laptop.
- **Address:** the Bibliographic API, `https://catalog.hathitrust.org/api/volumes/full/isbn/<isbn>.json` (also `/lccn/` and `/oclc/`; `/brief/` gives no MARC record). The answer holds each record's MARC XML and the scanned items with their rights ("Full view").
- **Calls from web pages:** allowed (`access-control-allow-origin: *`, checked 11 November 2026).
- **Limits:** meant for looking up a few known items at a time; it is not a search service. Bulk work belongs to the HathiFiles or OAI. No number of requests per second is published.
- **Coverage:** only books university libraries have scanned, so most new books are missing.
- **Terms:** HathiTrust's acceptable use policy (`https://www.hathitrust.org/acceptable-use`). The API's own page could not be read on 11 November 2026 (it asked for a browser check), so its current wording is not confirmed; the description above comes from library guides and HathiTrust's earlier documentation.
- **Watch:** HathiTrust retired its Data API (page images) in 2024 and its Research Center services in September 2026; the Bibliographic API was not affected.
- **Contract test:** recorded answers read by the MARC reader (from phase 15, step 3).
- **Last checked:** 11 November 2026.

## Open Library

- **Used for:** the widest free coverage, covers, pages, series, edition, binding, sometimes height and a table of contents, title search for the Wishlist and Add.
- **Asked from:** the phone while adding, and the laptop.
- **Addresses:** `https://openlibrary.org/api/books?bibkeys=ISBN:<isbn>&jscmd=details&format=json`, `https://openlibrary.org/isbn/<isbn>.json`, `https://openlibrary.org/search.json`, and covers from `https://covers.openlibrary.org/`.
- **Limits (checked 11 November 2026, `https://openlibrary.org/developers/api`):** 1 request a second without identification, 3 a second with a User-Agent naming the app and a contact. Not for bulk downloads: use the monthly data dumps. Covers looked up by ISBN are limited more tightly than covers by cover ID.
- **Identity:** the laptop tools send a User-Agent naming the app; a phone's browser cannot set one.
- **Terms:** the Internet Archive asserts no new copyright over the catalog data, but notes that some contributions may carry existing rights (`https://openlibrary.org/developers/licensing`). Covers are not separately addressed.
- **Watch:** search is the least reliable part during outages; fetches by ISBN or ID are steadier.
- **Contract test:** recorded answers in `core/tests/answers/`.
- **Last checked:** 11 November 2026.

## Google Books

- **Used for:** newer books, covers, thickness and height, total page count.
- **Asked from:** the phone (with the key on that device) and the laptop (with the key in `config.json`). The key is never committed.
- **Address:** `https://www.googleapis.com/books/v1/volumes`.
- **Limits:** a free key; without one, most requests are refused. The daily quota is shown in each key's Google Cloud project (the developer pages checked on 11 November 2026 give no number; an outside review reported about 1,000 a day by default; not confirmed).
- **Terms (`https://developers.google.com/books/branding`, checked 11 November 2026):** Google asks for attribution wherever its results are shown, and that results not be reordered or mixed with other services' results. Loci names Google Books among the sources a book was found on, and merges its facts into our own records; whether that merging fits the branding rules is an open question for Jakob (see `docs/decisions/book-data.md`). No new raw Google answers are added to a public repository; the nine recorded for tests in 2026 stay, by Jakob's choice.
- **Contract test:** recorded answers in `core/tests/answers/`; "Test the key" in Settings › Advanced.
- **Last checked:** 11 November 2026.

## Wikidata

- **Used for:** when a work was written or first published, its original title and other titles, and a lasting ID (Phaedo is Q244161) that tells one work from another across editions.
- **Asked from:** the phone, once per book while adding (never once per work), and the laptop, which also checks stored IDs again, since Wikidata merges items.
- **Address:** the query service, `https://query.wikidata.org/sparql`, asked with standard SPARQL 1.1 only.
- **Changing (checked 11 November 2026, `https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/WDQS_backend_update/Migrate`):** the query service is moving to a new backend. The new address is `query-next.wikidata.org`, open to everyone from about the week of 16 November 2026 (until then it refuses unknown callers); the old one stays until at least February 2027. The new one has no label service (`wikibase:label`) and no `wikibase:mwapi`: labels are asked with `rdfs:label` and a language filter. So Loci uses neither, and keeps the address in one place.
- **Calls from web pages:** allowed, including the `Api-User-Agent` header (checked 11 November 2026).
- **Identity (`https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy`):** scripts must send a User-Agent naming the client and a way to contact its operator; a browser, which cannot set one, should send `Api-User-Agent` instead. Unidentified or rapid requests are refused: the action API refused a quick series of lookups during testing on 11 November 2026.
- **Terms:** Wikidata's data is free to reuse (CC0).
- **Watch:** API rate limits introduced by Wikimedia in 2026 are new and may change; the query service move above.
- **Contract test:** recorded answers read by the Wikidata reader (from phase 15, step 7).
- **Last checked:** 11 November 2026.
