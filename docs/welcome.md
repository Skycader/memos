# Welcome

**Read this first if you are an AI assistant (or a new person) and the earlier conversation is lost.**
It tells you what Memos is, how the owner works with you, where everything is and what to check
before you change anything. The chat history is not the source of truth: this repository is.

## Contents

1. [What Memos is](#what-memos-is)
2. [The owner and how to work with them](#the-owner-and-how-to-work-with-them)
3. [Rules of the house](#rules-of-the-house)
4. [Map of the repository](#map-of-the-repository)
5. [Run it, check it](#run-it-check-it)
6. [Decisions that look odd but are on purpose](#decisions-that-look-odd-but-are-on-purpose)
7. [Where the work stands](#where-the-work-stands)
8. [Traps already met](#traps-already-met)
9. [The other docs](#the-other-docs)

## What Memos is

A personal, Anki-like spaced-repetition app, written by one self-taught developer, whose interface is
a **terminal in the browser**. Angular 17 + Dexie (IndexedDB), no backend, no external services.

- Two things: **directories** (decks, they nest, like a file system) and **cards** (live in
  directories; they have named fields called sides: `original`, `transcription`, `translation`...).
  Details and the planned field kinds (read-only, tip) are in [domain.md](domain.md).
- You work with it by typing commands: `cd`, `ls`, `mkdir`, `touch`, `rm`, `rmdir`, `export`,
  `import`, `seed`, `test`, `doctor`, `theme`, `font`, `help`... Type `help` for the current list,
  `help <command>` for one command. The list is generated from the code, it is not written here.
- **Not built yet:** the repetition itself. There is no `study` command and no scheduler; cards only
  keep the fields `next`, `prev` and `spec` for it. The terminal was built first on purpose: it is the
  base the author wanted ("a real file system, starting without a CLI would be silly").
- The author wants everything **self-hosted**: no CDN, no external fonts or scripts (the font is in
  `src/assets/fonts`). Do not add anything that loads from outside at run time.

## The owner and how to work with them

- Writes **Russian**; answer in Russian. Code, comments, docs and commit messages are in **English**.
- Self-taught, serious about the project ("almost an operating system"), likes a hacker look.
- Decides everything per item, often answering **by number**. Questions and "I think we should..."
  are discussion, **not an order**. Orders are direct ("do X", "commit and push").
- Wants small steps, each shown working. Wants honest reports: say what was verified and what was not
  (for example, "checked with events, not with a real mouse").
- Says what to remember aloud, because the chat can vanish ("write it down, it is stored in git").
  So decisions go into `docs/` as soon as they are made.

## Rules of the house

1. **Act only on a direct order.** Propose, wait, then do. If an order is ambiguous, ask once with the
   options and your recommendation (the owner often answers "as you recommend").
2. **Commit and push only when told** ("commit and push"). Work goes on a **feature branch cut from
   `main`**; never commit on `main` itself, the owner merges. The commit message is English, prefixed
   `feat:` / `fix:` / `docs:` / `refactor:` / `chore:`; keep any attribution trailer your tooling
   requires.
3. **Keep `test` green** and add checks for what you change (see [testing.md](testing.md)). Check in
   the browser, not only by compiling.
4. **Do not "clean up" what the owner has not looked at.** Never delete assets without showing what they
   are (`src/assets/icons2/`, `src/favicon-angular.ico` were deleted by mistake once and restored).
5. **Keep docs and `help` in step with the code**, and write new decisions down.
6. A new command needs `why` and `examples` (`test` refuses one without them), see
   [terminal.md](terminal.md).
7. Nothing may load from the outside (self-hosting), and nothing may reach the owner's real data from
   `test` except inside the reserved directory `/__test__`.

## Map of the repository

```
src/app/modules/
  terminal/   the view (component), ShellService (runs a line), TerminalService (where you are),
              tokenizer, commands/ (the registry: one object per command)
  core/       CoreService (mkdir, touch, list, remove...), theme and font services
  database/   Dexie schema (db.ts), add / get / remove services
  exchange/   export and import (CSV), FileService (download, file picker)
  debug/      DebugService (the `test` scenario), DoctorService, SeedService
  backup, browser, menu, repeat, math, ...   empty modules kept on purpose (see below)
docs/         these notes
```

Layers go one way: **view -> shell -> commands -> core -> database -> Dexie**. The core knows nothing
about the terminal. See [architecture.md](architecture.md).

## Run it, check it

```bash
npm start                                   # dev server on http://localhost:3500
npx tsc -p tsconfig.app.json --noEmit       # type check, fast
npx ng build                                # production build (output in dist/, git-ignored)
```

- The owner usually has the dev server already running on port 3500 (live reload). Check the port
  before starting another one.
- **The real test is the `test` command**, typed in the app. It prints `✔` / `✖` per check and
  `N passed, M failed` (about a hundred checks). `npm test` (Karma) is **known broken**, ignore it.
- With a browser tool you can run it without typing:
  `await ng.getComponent(document.querySelector('app-terminal')).shell.capture('test')` returns
  `{ out, err }`. `shell.capture('<any command line>')` runs any command the same way. After changing a
  file the dev server reloads the page, wait a few seconds before running.

## Decisions that look odd but are on purpose

- **Empty modules** (`backup`, `browser`, `core`, `debug`, `math`, `menu`, `repeat`) are scaffolding for
  the future. They are not dead code.
- **SSR is kept** (it works and does no harm), even though the app is browser-only.
- **Karma specs are the Angular defaults and fail.** Postponed; `test` inside the app is the suite.
- **Words with spaces are grouped with backticks**, not double quotes: ``touch `Un chat` `A cat` ``.
  A double quote is an ordinary character. The grouping character is the constant `QUOTE`.
- **A bare `cd` goes to `/`** (no home directory). `cd` takes a title or an id; the title wins.
- **No confirmation** for `rmdir`, `rm`, `drop` (the owner's choice); `export` first if in doubt.
- **`lsd`, `lsdir`, `dir` were removed**: `ls d` replaces them.
- `touch` in the root is refused: cards live in directories.
- The color theme and the font live in `localStorage`, not in the database, so `drop` keeps them.
- The database is one global Dexie instance named `memos`; the future `db use` needs it made swappable
  (see the roadmap).

## Where the work stands

- Working: directories and cards, `ls` with pages (20 per page), CSV export / import, `doctor`
  (finds orphans, moves them to `/lost+found`), `seed` (demo data), themes and fonts, a generated
  `help`, Tab completion, history, selection that stays selected.
- **Git:** the work is **merged into `main`** (the branches `feature/self-test-and-rmdir` and
  `feature/terminal-registry`, as a pull request on GitHub and a merge request on GitLab). Start new
  work from an up-to-date `main` (`git switch main`, `git pull`) on a new branch.
  - Two servers, one push: `origin` has **two push URLs**, so `git push` goes to **GitHub and GitLab**
    at once. The remote `gitlab` exists as well, for `git fetch gitlab` and `git ls-remote gitlab`.
    A push through `origin` does not update the `gitlab/*` tracking refs; fetch to see them.
  - The local `main` tracks `origin/main` (GitHub). The branch `main` is **protected on GitLab**: a
    normal fast-forward push is accepted, a force push is refused.
  - `main` is the same commit on both servers. It was aligned by one extra merge commit (see the traps).
- The up-to-date list of what is done, postponed, parked and waiting for the owner is in
  [roadmap.md](roadmap.md) ("Now: make it fully operational", then the stages and "Parked ideas").
  Short version of the open points: the owner still has to decide about duplicate titles in `doctor`
  and whether a service worker is wanted; a failing database is postponed; `db use|drop`, emoji in
  `ls`, tip fields and the whole repetition engine (`study`) are future work.

## Traps already met

- **Dexie `limit(n).offset(m)` takes first and skips after.** Write `.offset(m).limit(n)`.
- **One trailing line break in a `<pre>` is not drawn.** Help ends with two to get one empty line.
- Focusing the input clears a text selection; a `<label>` hands focus to its input on any click.
- A browser pane that is hidden or not drawn reports **no selection** and cannot take screenshots;
  the selection check in `test` then says it was skipped.
- Dexie closes a database after `delete()`: reopen it (`wipe` in `db.ts`).
- Ids are random 4 characters, retried until free; a title is unique inside its directory.
- The dev server reloads the page when a file changes, which cuts a running browser script short.
- **Merging the same branch separately on GitHub and on GitLab makes two different merge commits** with
  identical files, and `main` then diverges between the servers (the next push of `main` is rejected by
  one of them). Merge in one place. If it already happened, merge the other server's `main` into the
  local `main` (`git fetch gitlab`, `git merge gitlab/main`) and push: the new commit descends from both,
  so both take it without force. This is what was done once.

## The other docs

| File | About |
| --- | --- |
| [README.md](README.md) | the index of these docs |
| [architecture.md](architecture.md) | layers, data model, the rules the code keeps |
| [domain.md](domain.md) | what a directory, card, field and tip are; built vs planned |
| [terminal.md](terminal.md) | how the terminal works, how to add a command, help, keys |
| [exchange.md](exchange.md) | the CSV file and the rules of `import` |
| [testing.md](testing.md) | `test`, `seed`, `doctor`, Karma status |
| [roadmap.md](roadmap.md) | the audit, decisions, plans and parked ideas |

If something here contradicts the code, trust the code and fix this file.
