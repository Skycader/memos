# Tasks

Stages follow the proposal and are ordered by dependency. Every group lands its own checks in `test`
(`modules/debug/services/debug.service.ts`) and its own docs/`help` updates. Verify a group with
`test` in the app (all `✔`) and with `npx tsc -p tsconfig.app.json --noEmit`.

## 1. Stage 1a: core operations (no schema change)

- [x] 1.1a Add `UpdateService` (`cardContents`, `moveDirectory`, `moveCard`, `directoryWithCards`: replace card contents, move owner, rename a directory with its sides and cards in one transaction); verified by Karma specs and in-app `test` checks calling them through the commands
- [ ] 1.1b Add `GetService` helpers still missing: subtree walk, search by text, counts (needed by `tree`, `find`, `grep`, `wc`, `du`, `cp`)
- [x] 1.2a Add `CoreService.editCard`, `editDirectory` (title, icon and sides), `moveDir`, `moveCard`, `dir`, `pathOf`, `checkTitle` (one transaction each); verified by `test`: move keeps ids, move into itself is refused
- [ ] 1.2b Add `CoreService.tree`, `search`, `count`, `copy` (new ids on copy, fresh progress on copied cards); verify with `test` checks. `renameDir` is covered by `editDirectory` with `name:`
- [x] 1.3 Make `rmdir` accept a title as well as an id (title wins, as in `cd`); verify by `test` (by title, by id, unknown) and by `help rmdir` showing the new usage
- [x] 1.4 Remove `rmdir <dir name>` from `PLANNED` in `commands/system.ts` and from the `help` check in `debug.service.ts`; verify the `help ends with the Planned list` check is updated and green

## 2. Stage 1b: inspection commands

- [ ] 2.1 Add `commands/inspect.ts` with `cat`, `tree`, `find`, `grep`, `wc`, `du` (each with `why`, `examples`, `complete` where ids or paths apply); verify via `shell.capture` checks for output, errors and "database unchanged"
- [ ] 2.2 Register them in `commands/index.ts` and add the help group entry if a new group is used; verify `help` lists them and the registry checks of `test` pass
- [ ] 2.3 Update `docs/terminal.md` (commands list), `docs/testing.md` (what `test` covers) and `docs/welcome.md` (command names); verify each documented example runs as written

## 3. Stage 1c: editing commands

- [x] 3.1 Add `edit <card id> N:value...` (places from 1, `UpdateService.cardContents`, `CoreService.editCard`, Tab completes ids); verified by Karma specs for `parseEdits` and by in-app `test` checks for the "Edit a card" scenarios of `specs/card-and-directory-editing/spec.md`
- [x] 3.2 Make `edit` take a directory id: rename sides, add a side after the last one, `N:empty` (only if unused, prints `✓ Clear`) and `N:drop` (erases the values, asks to confirm), first two sides protected, directory and cards written in one transaction (`planDirectoryEdit`, `side-ops`, `UpdateService.directoryWithCards`); verified by 18 Karma specs and by in-app `test` checks for the "Edit a directory" scenarios
- [x] 3.3 Add `ctx.ask` (later `ctx.confirm`, see 3.3a) (the shell hands the next typed line to a waiting command, not to the parser, and keeps it out of the history) and make `drop` ask to type `drop`; verified in `test` (refusals only, see note below) and by typing `drop` in a live terminal
- [x] 3.3a Restyle the confirmation: `ctx.confirm({ notes, word })` instead of `ctx.ask(string)`; the view draws a CSS bracket frame, a red SVG warning badge, a `CONFIRM` chip and the word as a chip; a gray `abort` hint (Tab types it, never the word itself; typed start of the word is red); Esc cancels; the input keeps the focus; tests still see the question as text; verified by screenshots in Chrome, Karma 53/53 and in-app `test` 148/148
- [x] 3.4 Add `mv <what> <where>`: a directory by title or id, a card by id; the target is a path as in `cd` or a directory id; `/` for directories only; one thing per command; warning when a card's sides do not fit (`UpdateService.moveDirectory` / `moveCard`, `CoreService.moveDir` / `moveCard`, `sidesWarning`); verified by 4 Karma specs and 10 in-app `test` checks for the "Move" scenarios of `specs/card-and-directory-editing/spec.md`
- [x] 3.4a Make `mkdir <title> [sides...]` take no icon (stored as `''`, `ls` lists it without a gap) and let `edit <dir> icon:X name:X N:name...` change the icon and the title of a directory by its title or id, in the same transaction as the sides (`parseDirectoryEdits`, `CoreService.checkTitle`); verified by 4 Karma specs and 7 in-app `test` checks for the "Directory without an icon" scenarios
- [x] 3.4c Make `edit <card id> next:X prev:X` (now, 1m, -1m, +2h; counted from now; with sides in one command; nothing changes if one word is wrong; refused for a directory); verified by Karma (`parseCardEdits`, `parseOffset`) and 5 checks in `test`
- [ ] 3.4b Make `cp <what> <where>` and `rename <what> <new title>` (the "Copy" and "Rename" scenarios); `rename` is now also `edit <dir> name:X`, decide whether `rename` stays as a short form
- [ ] 3.5 Make `doctor` part of the checks after move/copy/rename/edit/rmdir; verify "no new orphans" is asserted in `test`
- [ ] 3.6 Document the commands in `docs/terminal.md` and the id/title rule in `docs/architecture.md` (`docs/domain.md` and `docs/welcome.md` already cover `edit` and `drop`); verify the examples run as written
- [ ] 3.7 Cover a confirmed `drop` in `test` once a scratch database exists (task 7.5); until then only its refusals are tested, because a confirmed one would erase the user's real data

## 4. Stage 1d: shell utilities

- [ ] 4.1 Add `echo`, `date`, `whoami` (returns `memos` until stage 3) in `commands/shell.ts`; verify via `shell.capture`
- [ ] 4.2 Add `history` and `exit` through callbacks the view registers on `ShellService` (`CommandContext.history`, `CommandContext.exit`); verify the numbered output, and that `exit` clears the screen and the next command still runs
- [ ] 4.3 Add `alias`, `unalias` with `localStorage` storage (`memos.aliases`), single-level expansion in `ShellService.run`, refusal of real command names; verify: define and use, reserved name, survives a reload
- [ ] 4.4 Add `aliases: ['man']` to `help`; verify `man cd` equals `help cd`
- [ ] 4.5 Update docs (`terminal.md`, `welcome.md`) and the Karma spec of `TerminalComponent` if the view changed; verify `npx ng test --watch=false --browsers=ChromeHeadless` is green

## 5. Stage 2a: field kinds in the data

- [ ] 5.1 Define `Field` (`name`, `kind`, `for?`) and change `Directory.fields`; add Dexie `version(3)` converting old names to `{ name, kind: 'normal' }` without editing versions 1 and 2; verify with a `test` check that opens a database filled by version 2 and finds every directory intact
- [ ] 5.2 Update every user of `fields` (`ls` format, `touch` count check, seed, exchange, doctor) to read names through one helper; verify `tsc --noEmit` and `test` are green
- [ ] 5.3 Parse `name:kind[:target]` in a helper next to the tokenizer and use it in `mkdir` and `import`; verify unit checks for valid kinds, unknown kind, tip for a missing side
- [ ] 5.4 Teach CSV `export` / `import` the kinds in the header and keep reading old files; verify a round trip with a read-only side and an old plain file in `test` and update `docs/exchange.md`

## 6. Stage 2b: read-only touch and tags

- [x] 6.1 Support the leading `?` in `touch`, storing the index in `CardSPEC.qfields` (also `??` for a literal `?`, and a card with nothing left to answer is refused); verified by 7 Karma specs for `parseSides` and 6 in-app `test` checks (marked side, the lone `?` word, `??`, every side marked)
- [ ] 6.2 Show kinds in `ls` and `cat` in the `name:kind` form; verify by `shell.capture`
- [x] 6.3 Remove `touch ?...` from `PLANNED` and fix the `help` check; verify the check is green
- [ ] 6.3b Make `touch` refuse a number of sides that differs from the sides of its directory (today any number is accepted, and `edit <dir> N:name` makes mismatches likelier); decide first whether the seed and the in-app `test` data, which have cards with a different number of sides, are allowed to; verify the "Wrong number of sides" scenario of `specs/field-kinds/spec.md`
- [ ] 6.4 Add Dexie `version(4)` with the `*tags` index, `tag` / `untag`, and `tag:<name>` in `find`; verify tag, find, untag and an upgrade check from version 3
- [ ] 6.5 Update `docs/domain.md` (kinds are now implemented, answer the open questions the owner decides), `docs/roadmap.md` and `help`; verify the documented examples run as written

## 7. Stage 3: several databases

- [ ] 7.1 Add `DbProvider` holding the current `AppDB` and its name in `localStorage` (`memos.db`); move `AddService`, `GetService`, `RemoveService`, `wipe` to it; verify the whole `test` suite is unchanged and green
- [ ] 7.2 Add `commands/db.ts` with `db`, `db ls`, `db use`, `db drop` (current and last database refused as two separate checks); verify every scenario of `specs/multi-database/spec.md` on scratch databases
- [ ] 7.3 Reset the terminal path on `db use`, make `whoami` return the current database; verify `pwd` after a switch
- [ ] 7.4 Reword `drop` in `help` as "wipe the current database"; verify `help drop` and that `drop` still leaves the database open and usable
- [ ] 7.5 Move `test` onto a scratch database (`memos-test-<time>`), clean it in `finally`, retire `/__test__`; verify real data is untouched after `test`, also when a check throws
- [ ] 7.6 Update `docs/architecture.md`, `docs/testing.md`, `docs/roadmap.md` (remove the parked `db` note) and `docs/welcome.md`; verify they match the code

## 8. Stage 4a: the scheduler

- [x] 8.0 First version of repetition: `ask [path]` (group Repetition) with `ctx.prompt`, a card drawn from chips, `/postpone`, `/nullify`, `/same`, `/tip`, `/help`, `exit`/`done`/Esc, Tab; `repeat/schedule.ts` (need, age, `dd:hh:mm`, spans, answers), `CoreService.cardsUnder` and `reschedule`; right answers grow from the time the card stood (the time since `prev` times 2: 16 min -> 32), `/same` is a right answer with growth 1, `/postpone` moves only `next`, a wrong answer only says the percent, results are chips; verified by Karma (91/91), 9 checks in `test` (166/166), including the story of a card (10 min -> 20 min, a whole day later -> 48 h) and screenshots in Chrome in both themes. Still to do under 8.1-9: SM-2 proper, the review log, ranks, the tip setting

- [ ] 8.1 Add `repeat/schedule.ts`, a pure SM-2 function with a tip penalty option (default growth factor 1.5 instead of 2) and no Angular or Dexie imports; verify `test` checks for determinism, good answer grows, forgotten restarts, tip makes a smaller interval
- [ ] 8.2 Add the first real Karma specs for `schedule` (and for `tokenize` and the CSV parser, which are pure); verify `npx ng test --watch=false --browsers=ChromeHeadless` is green
- [ ] 8.3 Add Dexie `version(5)` with the `review` table (`id, card, time`) and `ReviewService` (add, list by card); verify an upgrade check from version 4 and that one entry is stored per answer
- [ ] 8.4 Add the tip-cost setting (per directory or global, to settle with the owner) and read it in the scheduler call; verify it changes the interval in a `test` check

## 9. Stage 4b: the study command

- [ ] 9.1 Add the interactive session to `ShellService` (`isInSession`, `feed`, `ctx.startSession`), let the view switch prompt and pause the typed-ahead queue; verify entering, leaving, `Ctrl+C` and the first ordinary command after leaving
- [ ] 9.2 Add `CoreService.dueCards(path, now)` (stable order, read-only sides first); verify only due cards are returned
- [ ] 9.3 Add `commands/study.ts`: show question, reveal, grade, `t` tip, `q` leave, log every answer; verify every scenario of `specs/study-session/spec.md` through `shell.feed`, including "nothing due" and "tip used"
- [ ] 9.4 Settle the grade keys with the owner and write them into `help study`; verify `help study` has `why`, `examples` and notes
- [ ] 9.5 Document `study`, the session mode and the review log in `docs/terminal.md`, `docs/domain.md`, `docs/architecture.md`, `docs/roadmap.md` (stage 2 and 3 done) and `docs/welcome.md` (no longer "not built yet"); verify the claims match the code

## 10. Stage 5a: backup and restore

- [ ] 10.1 Add `BackupService` (`backup` module): build and validate the JSON `{ format, db, directories, cards, review, settings }`; verify a round trip into an empty scratch database and refusal of a bad or newer file with nothing changed
- [ ] 10.2 Add `backup` and `restore [--dry-run]` commands (download and file picker through `FileService`); verify via `shell.capture` with a fake file
- [ ] 10.3 Document the format in a new `docs/backup.md`, link it from `docs/README.md`, and say in `docs/exchange.md` what CSV does not carry; verify the example file opens with `restore --dry-run`

## 11. Stage 5b: style and config

- [x] 11.0 `font line <1-3|default>` (done early, with the font): the space between the lines of the terminal (`line-height` through `--line`), kept in `localStorage` (`memos.line`), `1,5` works as `1.5`, Tab completes `line`, bare `font line` shows the value; `FontService.setLine`/`parseLine`; verified by a `test` check (166/166) and `docs/terminal.md`. Not yet looked at on screen

- [ ] 11.1 Add `StyleService` and the `style emoji|plain` command (bare shows current and available, wrong value shows usage, Tab completes), and make `ls` read it with aligned columns; verify default look is unchanged and both looks in `test`
- [ ] 11.2 Include aliases and style in the backup settings and restore them; verify a round trip
- [ ] 11.3 Write the "pipes and plugins" idea into `docs/roadmap.md` as deferred with what the registry already offers; verify the roadmap names them as not built

## 12. Final integration

- [ ] 12.1 Run the full in-app `test` and confirm no check fails and none was removed without a replacement; verify the count in the summary line
- [ ] 12.2 Run `npx tsc -p tsconfig.app.json --noEmit`, `npx ng build` and the Karma suite headless; verify all three succeed
- [ ] 12.3 Walk through the whole flow in the browser once on seed data (`seed`, `tree`, `mv`, `cp`, `edit`, `find`, `db use`, `study`, `backup`, `restore`); verify and report what was checked and what was not
- [ ] 12.4 Re-read `help`, `docs/` and `openspec/changes/complete-terminal-commands/specs/` and confirm every command in them exists; verify there is no command documented but missing, and no `PLANNED` line left that works

## Workflow follow-up

- Commit by stage on the feature branch with `feat:` / `docs:` prefixes; commit and push only on the owner's `cap`.
- Archive the change with `/opsx-archive` after the owner has reviewed the result of every stage.

