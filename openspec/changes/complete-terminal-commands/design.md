# Design

## Context

See proposal.md for the motivation and the stage list. State of the code that shapes the approach:

- One command is one `TerminalCommand` object in `terminal/commands/*.ts`, listed in `COMMANDS`
  (`index.ts`). `ShellService.run` tokenizes a line and calls `command.run(args, ctx)`; `help`, Tab
  completion and the registry checks of `test` come from the registry for free.
- Commands call `CoreService`; the core calls `DatabaseService` (`add`, `get`, `remove`), which
  imports the module-level constant `db` (`database/services/db.ts`, Dexie name `memos`, versions 1 and 2).
- `Directory.fields` is `string[]`, `Card.contents` is `string[]` (positional), `Card.spec` is
  `{ status, qfields?, maxInterval? }`. Ids are random 4 characters; a title is unique inside its directory.
- The shell is **one line in, text out**: no stdin, no command can ask a follow-up question.
  History lives in `TerminalComponent`, not in the shell.
- Settings (theme, font) live in `localStorage`, so `drop` keeps them.

## Goals / Non-Goals

**Goals:**
- Every command of the proposal exists, follows the registry pattern, has `why` and `examples`, and is covered by `test`.
- Each stage can be merged and used on its own; a later stage never forces a rewrite of an earlier one.
- Existing user data always opens (numbered Dexie upgrades, old CSV files still import).

**Non-Goals:**
- Pipes (`ls | grep`) and plugins: the registry is their base, but they are not designed here.
- A GUI, sync between devices, accounts, FSRS (SM-2 only), images and audio.
- Replacing Karma with a bigger suite; `test` inside the app stays the real suite.

## Decisions

### D1. Stage order is by dependency, not by size
Stage 1 touches no schema, so it ships first and gives the owner immediate value. Field kinds (stage 2)
change the stored shape of `fields`, and `study` (stage 4) needs read-only and tip sides, so kinds must
come before `study`. `db` (stage 3) comes before `study` and `backup` so the swappable database is
done once and `test` stops using `/__test__`. *Alternative:* build `study` first because it is the heart
of the product. Rejected: without `edit` and kinds a studied card cannot be fixed or hinted.

### D2. Core first, commands thin
New operations (`move`, `copy`, `rename`, `editCard`, `tree`, `search`, `count`) are methods of `CoreService`
backed by small additions to `AddService`, `GetService` and a new `UpdateService`. Commands only parse
arguments and print. A directory subtree walk is written once in the core and reused by `tree`, `du`,
`cp` and `find`. *Alternative:* query Dexie from the commands. Rejected: it breaks the layer rule of the repo.

### D3. Names and ids in one resolver
`rmdir <name>`, `mv`, `cp`, `rename` and `cd` all accept a title or an id with the title winning.
`TerminalService.resolve` already does it for paths, so that rule keeps a single home there. A card is
addressed by id only (titles do not exist for cards).

### D4. `mv` and `cp` rules
- `mv` keeps ids; it checks the target exists, the title is free there, the target is not inside the
  moved directory, and a card never goes to `/`. It is one Dexie transaction.
- `cp` of a directory walks the subtree and gives **every** copy a new id (`freeId`), inside one transaction,
  and copied cards get fresh progress (`next`/`prev` reset, `spec.status` cleared) because the review
  history of the original is not theirs.
- Both get a `doctor`-style check in `test`: no orphans, titles unique.

### D5. Field kinds: structure, not glued strings
`Directory.fields` becomes `Field[]` with `{ name, kind: 'normal' | 'ro' | 'tip', for?: string }`.
Dexie **version 3** converts each old name to `{ name, kind: 'normal' }`; versions 1 and 2 are never edited.
`mkdir` parses `name`, `name:ro`, `name:tip[:target]` in a helper next to the tokenizer so the same parser
serves `import`. The CSV gets the kind in the header side name (`Original:ro`), so an old file (plain names)
still reads and a new file read by an old app shows a side literally called `Original:ro` (acceptable, alpha).
*Alternative:* a parallel `kinds: string[]` array. Rejected: two arrays drift apart.

### D6. Read-only on the card and on the directory
The directory decides (`kind: 'ro'` in its fields). `touch ?` writes the side index into the existing
`CardSPEC.qfields`, so one card can add its own question-only side. The effective set is the union.
`edit` may still change a read-only side: read-only means "never typed during study", not locked.

### D7. Tags
Stored as `tags?: string[]` on `Card`, **Dexie version 4** with a multi-entry index `*tags`. `find tag:x`
uses the index. Tags are lower-cased on write. *Alternative:* a separate `tag` table. Rejected: more
tables and no use case for tag metadata yet.


### D8. A swappable database
A small `DbProvider` (root service) holds the current `AppDB` and its name; `AddService`, `GetService`,
`RemoveService` and `wipe` ask it for `.current` instead of importing the constant. The name is stored in
`localStorage` (key `memos.db`) like theme and font. `db use` closes the old instance, opens the new one and
resets the terminal path. `db ls` uses `Dexie.getDatabaseNames()`. `db drop <name>` refuses the current
and the last database as two separate checks. `drop` keeps its meaning (wipe the current database) and only
its `help` text changes; no alias, so nothing breaks. *Alternative:* remove `drop`. Rejected: the owner
uses it, and the parked note says it stays as "wipe the current database".

### D9. `test` on a scratch database
With D8, `test` calls `db use` on a throw-away name (`memos-test-<time>`) and switches back and drops it in
`finally`. The reserved `/__test__` directory and its refusal logic are removed after the checks are ported.
This happens **in stage 3, not before**, so stages 1 and 2 keep using `/__test__`.

### D10. The shell learns an interactive mode (needed by `study`)
`ShellService` gets one extra state: an optional **active session** that receives the next typed lines instead
of the command parser. A session is `{ prompt(), onLine(line, out) -> done }`. The view asks
`shell.isInSession()` to choose the prompt text and sends lines to `shell.feed(line)`. Commands start a
session through `ctx.startSession(...)`. Tab completion and history keep working; `Ctrl+C` leaves the session.
*Alternative:* have `study` print everything at once. Rejected: grading needs a loop. *Alternative:* a modal
dialog outside the terminal. Rejected: the author wants everything in the terminal.

### D11. `history`, `alias`, `exit` need small context additions
`history` and `exit` need the view, so `CommandContext` gets `history(): string[]` and `exit()`, implemented
by the shell through callbacks the view registers (the shell does not know the view). Aliases are stored in
`localStorage` (`memos.aliases`) as a map; `ShellService.run` expands the first word before the registry
lookup, once (no recursion, so no loops), and refuses names that are real commands. `man` is the
`aliases: ['man']` field of `help`, which the registry already supports.

### D12. The scheduler is a pure module
`repeat/schedule.ts` exports `schedule(state, grade, now, { tipsUsed }, options)` with no imports from Angular
or Dexie, so it is tested with plain `check(...)` calls in `test` and with fast Karma specs (the first useful
ones). SM-2: ease factor, repetitions, interval in days. A tip multiplies the growth factor by a setting
(default 1.5 instead of 2). The **review log** is Dexie **version 5**: table `review` with
`id, card, time`. Per-side state stays in `spec.status`.

### D13. `study` over a session
`study [path]` collects due cards (`next <= now`) under the path in a stable order and starts a session (D10).
It shows the question sides (read-only first); `Enter` reveals the answer, a grade key schedules and logs it,
`t` shows the tip, `q` leaves. All writes go through the core.

### D14. Backup is its own JSON format
`backup` writes `{ format: 1, db, directories, cards, review, settings }`. `restore` validates the whole file
first and writes in one transaction, so a bad file changes nothing; a newer `format` is refused. CSV
`export` / `import` stay as they are (no review log) and the docs say so. `backup` and `restore` go to the
`data` help group.

### D15. `style` as a remembered setting
Same pattern as `theme` and `font` (bare shows current and available, a wrong value shows usage, `complete`
returns the values), stored in `localStorage`. `ls` formatting reads it through a small `StyleService`.
Emoji columns use fixed padding after the marker.

## Risks / Trade-offs

- **[Schema upgrades lose data]** (versions 3, 4, 5) → each upgrade has a `test` check that opens a database
  filled by the previous version; old `version(n)` blocks are never edited; the docs say to `export` first.
- **[Swapping the database touches every service]** (D8) → done in one small step, with the constant kept as a
  thin wrapper until all services have moved; `test` runs before and after.
- **[`cp` of a big directory is slow or fills storage]** → one transaction, the count printed first for more
  than a few hundred cards, quota errors reported as an ordinary error.
- **[An interactive session breaks Tab, history or the queue]** (D10) → the typed-ahead queue is paused while a
  session is active; `test` covers entering, leaving and the first command after leaving.
- **[Scope is large for one change]** → stages are independent; tasks.md marks the stage boundaries and the
  owner can stop after any of them. Stage 5 (config, plugins, pipes) is deliberately thin.
- **[CSV with kinds read by an old app]** → the side shows up with `:ro` in its name; acceptable in alpha, noted
  in `exchange.md`.

## Migration Plan

1. Ship stage by stage; each stage ends with `test` green, docs and `help` updated, and a commit on the
   feature branch.
2. Dexie: add `version(3)` (kinds), `version(4)` (tags index), `version(5)` (review). Never edit older ones.
3. Rollback: stage 1 has no data change and is reverted with git alone. For stages 2 to 5 the owner exports
   (and from stage 5 backs up) before opening the new version; a downgrade of the app does not downgrade the
   database (Dexie refuses), so the backup is the way back.

## Open Questions

- Exact grade keys of `study` (numbers 0 to 5 vs words); can be settled when `study` is built.
- Whether `find` should also cross into other databases after `db` exists (default: no, current database only).
- Names of the backup commands (`backup` / `restore` assumed; the owner has not named them).
