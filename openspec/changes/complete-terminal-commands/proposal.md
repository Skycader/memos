# Proposal

## Why

Memos is an alpha app whose whole interface is a unix-like terminal, but the command set is thin:
17 commands, no way to move, copy, rename or edit anything, no search, no way to look at a card in
full, and two commands (`touch ?...`, `rmdir <name>`) that `help` already announces as "Planned".
The repetition itself (`study`) does not exist, so the app cannot yet do what it is for.
The owner wants every missing command listed, scoped and built, cheapest and most useful first.

## What Changes

The work is split into **five stages ordered by dependency**; each stage ends with something usable
and keeps the in-app `test` green.

**Stage 1: cheap commands on the existing model** (no schema change)
- `rmdir <name>`: remove a directory by title or id (today only the id works). Moves out of `PLANNED`.
- `cat <id>`: show one card in full, with the names of its sides.
- `tree [path]`: the directory tree.
- `find <text>` and `grep <text>`: search titles and card sides under the current directory.
- `wc` and `du`: counts of directories and cards.
- `mv <what> <to>`, `cp <what> <to>`, `rename <what> <new title>`: move, copy, rename.
- `edit <id> <side> <value>`: change one side of a card (cards cannot be edited at all today).
- Shell utilities: `echo`, `history`, `whoami`, `date`, `exit`, `alias`, and `man` as an alias of `help`.

**Stage 2: field kinds**
- `mkdir` accepts `name:kind` (`original:ro`, `original:tip`). Storage moves from `string[]` to
  `{ name, kind, for? }` through a new Dexie version (old data converts to `kind: 'normal'`).
- `touch ?`...`` marks a side as question only (read-only). Moves out of `PLANNED`.
- `tag` / `untag` and tags in `find`.

**Stage 3: several databases**
- `db`, `db use <name>`, `db drop <name>`, `db ls`; the database becomes swappable.
- The fate of the existing `drop` is settled here (see design).
- `test` gets a throw-away database instead of the reserved `/__test__` directory.

**Stage 4: the repetition engine**
- Pure `schedule(card, grade, now, { tipsUsed })` (SM-2 first), a review log table, and the
  `study` command: today's queue, show sides, answer, grade, tip key.

**Stage 5: safety, looks, customisation**
- Full JSON backup (`backup` / `restore`, command names to confirm) with the review log and settings.
- `style emoji|plain` for the look of `ls`.
- Config file and `alias` persistence. **Deferred, not in this change:** pipes (`ls | grep`) and
  plugins; they only get a placeholder in the roadmap.

## Capabilities

### New Capabilities
- `terminal-inspection`: `cat`, `tree`, `find`, `grep`, `wc`, `du`: read-only commands that show or count what is stored.
- `card-and-directory-editing`: `rmdir` by name, `mv`, `cp`, `rename`, `edit`: commands that change existing data.
- `shell-utilities`: `echo`, `history`, `whoami`, `date`, `exit`, `alias`, and the `man` alias of `help`.
- `field-kinds`: `name:kind` in `mkdir`, read-only and tip sides, `touch ?`, tags.
- `multi-database`: `db`, `db use`, `db drop`, `db ls`, and the new role of `drop`.
- `study-session`: the scheduler, the review log and the `study` command.
- `backup-and-style`: full JSON backup and restore, and the `style` setting for `ls`.

### Modified Capabilities
<!-- None: openspec/specs/ is empty, nothing is covered yet. -->

## Impact

- **Code:** `src/app/modules/terminal/commands/` (new files per group, `index.ts`, `system.ts`
  `PLANNED` list), `core/services/core.service.ts` (move, copy, rename, edit, search, tree),
  `database/services/` (get / add / remove / update; `db.ts` for new Dexie versions and a swappable
  database), `core/models/spec.model.ts`, `exchange/` (CSV must learn field kinds), `debug/` (`test`
  and `doctor` checks), new modules `repeat` (scheduler) and `backup`.
- **Data:** two new Dexie versions (field kinds, review log). Old versions are never edited.
- **Docs:** `docs/terminal.md`, `domain.md`, `roadmap.md`, `testing.md`, `exchange.md`, and `help`
  (`PLANNED`) must follow the code.
- **No new dependencies**, nothing loaded from outside (self-hosted rule).
- **BREAKING (stage 2):** the stored shape of `Directory.fields` changes; the CSV format of
  `export` / `import` gains the field kinds and must still read old files.
