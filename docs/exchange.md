# Export and import (CSV)

`export` saves the **whole current database** as one CSV file, `import` loads such a file back.
It is an exchange and a copy format: plain text that a spreadsheet opens and a person can edit.
Code: `modules/exchange` (`csv.ts`, `exchange.service.ts`, `file.service.ts`), the commands are
in `modules/terminal/commands/data.ts`.

## The file

- UTF-8, **no BOM**; the delimiter is a comma; RFC 4180 quoting (a cell with a comma, a quote
  or a line break is wrapped in `"`, a quote inside is doubled). Records end with `\n`; `\n`,
  `\r\n` and `\r` are all read.
- Named `<database>-<date>.csv`, for example `memos-2026-10-14.csv` (the date is the local day).
- Rows have different meanings, the first cell says which:

| First cell | Row | Cells after it |
| --- | --- | --- |
| `memos` | format row, always first | version (`1`), database name, time of export |
| `dir` | a directory | `path`, `icon`, then the names of the fields |
| `card` | a card | `path` of its directory, `next`, `prev`, `spec` (JSON), then the sides |

```
memos,1,memos,2026-10-14T21:02:03.145Z
dir,French,🇫🇷,Original,Translation
card,French,1792011723142,1792011723142,"{""status"":[[],[]]}",Un chat,A cat
dir,French/Verbs,📁,Q,A
```

- `path` is the names from the root joined with `/` (`French/Verbs`). A title can not contain `/`,
  so a path is never ambiguous. Rows are in depth-first order sorted by title: the same data gives
  the same file.
- `next`, `prev` and `spec` are the **learning progress** of the card (when to repeat, and the state
  of every side). It is always exported. The sides come last because their number differs from
  directory to directory, so rows of different width are normal.
- Empty directories are kept (they have their own `dir` row).

## `export`

Runs in the browser, so the file is **downloaded** (look in your downloads); a web page can not write
to a path. Not exported, with a warning in the output: cards lying in the root (they are against the
rules) and anything that hangs without a parent (run `doctor`).

## `import`

Opens the **file picker**, a page can not read a path either. `import --dry-run` does everything and
rolls back, so it only reports what would happen.

- Every directory and card gets a **new id**; ids from the file are not used.
- A directory that already exists (same path) is **merged into**: its icon and fields stay as they are.
- A card with the same sides as one already in that directory is **skipped**. So importing the same
  file twice changes nothing the second time.
- Directories the file does not describe but needs as parents are created plainly.
- **All or nothing:** one transaction. The whole file is also checked before anything is written; a
  file that is not a Memos CSV, has a bad path or an unknown kind of row is refused.
- Warnings (skipped cards in the root or without a directory, cards whose number of sides differs from
  their directory, broken progress that was reset) are printed after the summary.

## What it is not

- Not a full backup: the review log (when it exists) and settings are not in it. A full backup is a
  separate JSON format, see [roadmap.md](roadmap.md).
- No compatibility with Anki or other programs is planned.

## Tested

`test` covers the CSV parser and writer, the round trip of a tree with awkward names (commas, quotes,
line breaks, empty sides, emoji) and progress, the dry run, importing twice, bad files, the file name
and the absence of a BOM. The two things that need a human are the real download and the real file
picker of the browser: `test` can not click them. They were checked by intercepting the download
(name, bytes) and by replacing the picker.
