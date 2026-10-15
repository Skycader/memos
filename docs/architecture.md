# Architecture

Memos is a spaced-repetition app in the spirit of Anki, with a terminal as the interface.
Directories are decks, cards are files.

## Layers

```
terminal (view)  ->  ShellService  ->  commands  ->  CoreService  ->  DatabaseService  ->  Dexie (IndexedDB)
                                          \-> TerminalService (session: where the user is)
```

Each layer talks only to the one below it.

| Layer | Folder | Knows about | Does not know about |
| --- | --- | --- | --- |
| View | `modules/terminal/terminal` | lines, input, history | commands, the database |
| Shell | `modules/terminal/services/shell.service.ts` | the registry, tokenizing | how output looks |
| Commands | `modules/terminal/commands` | the core, the session | the database |
| Core | `modules/core` | directories, cards, rules | the terminal |
| Database | `modules/database` | tables, indexes | anything above |

The core is the part that has to stay right. The terminal is one client of it; a GUI or
a Node CLI could be another without touching the core.

## Data model

Two Dexie tables (`database/services/db.ts`):

- `directory`: `id, owner, icon, title, fields[]`. The root is the owner id `/`
  and is not stored.
- `card`: `id, owner, contents[], next, prev, spec`. `owner` is a directory id.

Rules that the code keeps (and `test` checks):

- Ids are random 4 characters, retried until free (`CoreService.freeId`).
- A title is unique within its directory and can not contain `/`, be empty, `.` or `..`:
  `cd` and paths rely on it. The index `[owner+title]` is not unique on purpose, the rule
  is checked in `CoreService.mkdir`, so a database that already has duplicates still opens.
- Cards live only in directories, never in the root.
- Removing a directory removes everything below it in **one transaction**
  (`RemoveService.dirById`): there is no state "directory gone, cards left".
- Nothing hangs without a parent. If it happens anyway (old data, a bug), `doctor` finds it
  and `doctor fix` moves it to `/lost+found` instead of deleting.

## Schema changes

Dexie versions live in `AppDB` (`db.ts`). Never edit an old `version(n)`, add a new one.
Indexes over arrays (`fields`, `contents`) were dropped in v2: they were never searched by.

## Settings

The color theme (`memos.theme`) and the terminal font (`memos.font`) are the only settings.
They are kept in `localStorage`, not in the database, so `drop` does not reset them.
Both work the same way: a `data-theme` / `data-font` attribute on `<html>` switches CSS
variables in `styles.scss`. See `core/services/theme.service.ts` and `font.service.ts`.
The font files live in `src/assets/fonts` (with a note about their license) and are fetched
only when a font that needs them is chosen.
