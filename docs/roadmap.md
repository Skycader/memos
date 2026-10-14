# Roadmap

Plans, including far ones. Ordered by **dependency**, not by dates: each stage ends with
something that can be used, and the core never learns about the interface.
This is a sketch to steer by, not a promise; change it freely.

## 0. Done

Core on Dexie, directories and cards, transactional `rmdir`, unique titles, id collision
retries, `doctor`, `test` (self-test), terminal with a command registry, themes and fonts,
`export` / `import` in CSV, docs.

## Now: make it fully operational (no new features)

The author's goal before more features: no flaws. An audit (2026-10-15) found these; each fix
comes with a check in `test`.

**Done**
- WebSQL leftovers removed: `FindService`, `QueryService`, `row.model`, `tx.model`,
  `window.openDatabase`, the old comments about a table of entities.
- Duplicates removed: the second server module (`app.server.module.ts`) and the second type for a
  directory (`Dir`, now `Directory` everywhere).
- **Kept until the author looks at them:** `src/assets/icons2/` and `src/favicon-angular.ico`.
  Nothing references them (the manifest uses `assets/icons`, `index.html` uses `favicon.ico`), they
  were deleted by mistake and restored. Decide together with the new icons.

- `drop` no longer leaves the app dead: the database is reopened, empty, right after the delete
  (`wipe` in `db.ts`; it was `DatabaseClosedError` on every command until a reload). `test` checks
  it on a scratch database, never on the real one.
- `ls` pages: `ls [d|c] [page]`, 20 items per page (directories first, then cards), and a line
  `page 1 of 3 (ls 2 for the next page)` when there is more than one page. While testing it a real
  bug turned up and was fixed: `cardsByOwner` called Dexie's `limit().offset()`, which takes first and
  skips after, so every page but the first came out wrong.

**Postponed (the author: "to the long drawer")**
- A failing database must be visible: say so when IndexedDB can not be opened (private mode),
  and handle `versionchange` / `blocked` so a schema upgrade does not hang when a second tab is open.

**Proposed, waiting for the author**
- `doctor` should also report directories with the same title in one directory (old data from
  before titles became unique); `cd` takes the first one it finds.
- Whether the service worker (offline loading and installing as an app) is wanted at all.

**Kept on purpose**
- The empty modules (`backup`, `browser`, `core`, `debug`, `math`, `menu`, `repeat`) are scaffolding
  for the future. Do not report them as dead code.
- SSR stays: it works and does no harm.

**Known broken**
- Karma tests (`ng test`): 14 default specs, 4 fail, the other 10 are empty "should create" skeletons.
  To be fixed later; `test` inside the app is the real suite.

**Candidates from the audit, not ordered yet**
- `src/extensions/debug.ts` is unused and replaces `String.prototype.at`; four leftover `console.log`;
  `BrowserAnimationsModule` is imported without being used; extra injections in `AppComponent`;
  Dexie tables are declared with the key type `number` while ids are strings (25 `as any`);
  the PWA icons and favicon are Angular's, the manifest colors are Angular's blue; README is a
  placeholder; no `.gitattributes` (line-ending warnings on every commit); no linter.

## 1. Finish the model

- Kinds of fields: `normal`, `readonly`, `tip`; the `name:kind` syntax in `mkdir`
  (see [domain.md](domain.md)).
- `touch ?"..."` for read-only sides; `rmdir <name>`.
- More checks in `doctor`: duplicate titles in one directory, cards whose number of values
  does not match the directory fields.

## 2. Repetition engine (the heart of the product)

- A pure function `schedule(card, grade, now, { tipsUsed })` with no dependencies, covered
  by `test`. Start with SM-2; FSRS may come later.
- A review log (a separate `review` table): without it there are no statistics and no FSRS.
- The price of a tip as a setting: for example the growth factor 2 -> 1.5
  (per directory or global).
- The `study` command: today's queue, show the sides, answer, grade, a key for the tip.

## 3. Better learning

- Modes: flip, or type the answer with a forgiving check (case, accents).
- Directions: `original -> translation` and back as separate states of one card
  (`spec.status` already has room for it).
- Daily limits, leeches (cards that are always forgotten), `maxInterval`.
- Search and organisation: `find`, tags, `mv`, `cp`.

## 4. Safety of data

- **Done:** `export` and `import` in CSV, see [exchange.md](exchange.md).
- A full backup (with the review log and settings) as a separate, later JSON format.
  The `backup` module is for that.
- Schema migrations with tests, so an old database always opens.
- Later: synchronisation between devices.

## 5. More clients

- A GUI on top of the same core (`TerminalService` is written to be callable from anywhere).
- PWA offline (the service worker is already wired), a phone-friendly view.

## 6. Content

- Images and audio in fields, text to speech.
- Templates of card types (a language card, a formula card, ...).

## 7. The "operating system" dream

- Aliases, a config file, pipes (`ls | grep`), commands as plugins. The command registry
  ([terminal.md](terminal.md)) is the base for this.

## 8. Far away

- Accounts, shared decks, statistics with charts.

## Parked ideas

Good ideas that are not scheduled yet. Written down so they are not lost.

### `db`: several databases

```
db              show the name of the current database
db use <name>   switch to another database, create it if it does not exist
db drop <name>  delete a database, no confirmation
```

Notes for when it is built:

- Today the database is the one module-level constant `db` (`database/services/db.ts`) with
  the fixed name `memos`, and the services import it directly. Switching needs a small provider
  that holds the current database and that services ask for it, instead of importing the constant.
- The current name is remembered between sessions the same way as the theme and the font
  (`localStorage`), and the terminal session path is reset on a switch.
- `Dexie.getDatabaseNames()` can list the databases, so a `db ls` is nearly free.
- It gives `test` what it lacked: a throw-away database (for example `memos-test`) that the real
  data can not be touched from, instead of the reserved `/__test__` directory.
- **Decided:** `db drop <name>` can not delete the current database. It refuses and says so; to
  remove it, switch to another one first (`db use ...`), then drop it. No confirmation otherwise.
- **Decided:** `db drop <name>` can not delete the last remaining database either. Usually this
  is already covered by the rule above (the only database is the current one), but the check stays
  on its own so it also holds when the current name points to a database that was not created yet.
- Open: the existing `drop` erases the current database, which the rule above forbids for
  `db drop`. Probably `drop` stays as "wipe the current database" under its own name, or goes away
  once `db` exists; to be decided when `db` is built.

### `ls` with emoji instead of words

The author's taste: emoji are read by the brain at once, so in the `ls` output

```
DIR  -> 📁
CARD -> 📄
```

(the directory's own icon, the one set by `mkdir`, is shown next to the title today; this would
replace the word `DIR`/`CARD` at the start of the line, not that icon). Not started, the author is not
ready to take it in yet. Things to think about when it is built:

- Emoji are wider than letters in a monospace font and differ between systems, so the columns
  (ids, titles, sides) may need fixed padding to stay aligned.
- It is a matter of taste: maybe a setting (`style emoji|plain`, remembered like the theme and the
  font) so the plain `DIR`/`CARD` look, which the author also likes ("hacker style"), stays available.
- Related idea: color the output (`DIR` and `CARD` in different colors, from the theme variables).

## Standing rules

- Core first, shell second: new features start in `core`, the terminal only calls them.
- Every change keeps `test` green and adds checks for what it must keep true.
- Never edit an old Dexie `version(n)`, add a new one.
- `doctor` stays able to find anything that hangs without a parent.
