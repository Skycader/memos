# Roadmap

Plans, including far ones. Ordered by **dependency**, not by dates: each stage ends with
something that can be used, and the core never learns about the interface.
This is a sketch to steer by, not a promise; change it freely.

## 0. Done

Core on Dexie, directories and cards, transactional `rmdir`, unique titles, id collision
retries, `doctor`, `test` (self-test), terminal with a command registry, themes, docs.

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

- Export and import (JSON), the `backup` module.
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

## Standing rules

- Core first, shell second: new features start in `core`, the terminal only calls them.
- Every change keeps `test` green and adds checks for what it must keep true.
- Never edit an old Dexie `version(n)`, add a new one.
- `doctor` stays able to find anything that hangs without a parent.
