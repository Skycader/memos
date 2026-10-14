# Roadmap

Plans, including far ones. Ordered by **dependency**, not by dates: each stage ends with
something that can be used, and the core never learns about the interface.
This is a sketch to steer by, not a promise; change it freely.

## 0. Done

Core on Dexie, directories and cards, transactional `rmdir`, unique titles, id collision
retries, `doctor`, `test` (self-test), terminal with a command registry, themes and fonts,
`export` / `import` in CSV, docs.

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

## Standing rules

- Core first, shell second: new features start in `core`, the terminal only calls them.
- Every change keeps `test` green and adds checks for what it must keep true.
- Never edit an old Dexie `version(n)`, add a new one.
- `doctor` stays able to find anything that hangs without a parent.
