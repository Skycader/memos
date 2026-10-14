# Testing

## `test`: self-test inside the app

Type `test` in the terminal. It runs a scenario against the real stack (terminal, core, Dexie,
a real browser) and prints `✔` / `✖` per check and a summary. It is meant to be run after every
change.

**Why inside the app and not Karma:** it exercises exactly what runs for the user, needs no
setup and is one word away.

**Safety.** It works in the real database, so:

- everything it creates lives under `/__test__` (a reserved title);
- if `/__test__` already exists it refuses to run; `test clean` removes it with all content;
- cleanup is in a `finally`, so it runs even if a check throws;
- it does not touch anything else: the scans of `doctor` look at the whole database, but only
  the test's own orphans are moved;
- the user's current directory and theme are put back.

What it covers: the schema, theme and font, tokenizer, the registry, mkdir/touch/ls/rmdir, integrity,
orphans and `doctor fix`, unique titles, id collisions, whole command lines through the shell
(quotes, paths, Tab completion, errors, help), and CSV export/import (a round trip with progress,
dry run, importing twice, bad files).

### Adding a check

In `selfTest` (`modules/debug/services/debug.service.ts`):

```ts
check('what must hold', condition, 'details shown only when it fails');
```

- Work inside `/__test__` and put the new ids into the cleanup list in `finally`.
- Prefer checking the core directly; use `run('command line')` (it goes through the shell)
  when the thing under test is the terminal itself.
- Force rare situations instead of waiting for them. Example: the id-collision checks replace
  `MathService.makeId` for a moment so that the first ids are already taken, then restore it.

## Karma (`ng test`): known broken

`ng test` still runs the specs that Angular generated: 14 tests, 4 fail (the template of
`AppComponent` and `TerminalComponent` is not set up in the test module), the other 10 only check
that a service can be created. They are not the real suite. Fixing them is postponed; until then
trust `test` inside the app. Pure functions (the tokenizer, the CSV parser) are good candidates
for the first real Karma specs.

## `doctor`: orphans

`doctor` reports directories and cards that hang without a parent (for example after an
interrupted removal) and changes nothing. `doctor fix` moves them to `/lost+found`; nothing is
deleted. A card lying in the root is only reported as a warning: it is against the rules but it
is not an orphan.

Removal is transactional now, so new orphans should not appear; `doctor` is for old data and as
a net under future bugs.
