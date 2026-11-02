# Terminal

## Why it is built this way

It used to be one `<textarea>` whose text held everything: output, prompt and the line being
typed. A command was fished out of that text (the second line from the end), asynchronous
output was patched in through a placeholder character, and any stray edit could break it.

Now the state is kept apart and the text is only drawn:

| State | Where | What |
| --- | --- | --- |
| `lines` | `TerminalComponent` | everything printed so far |
| `input` | `TerminalComponent` | the line being typed |
| `history` | `TerminalComponent` | previous lines, for ↑ and ↓ |
| the path | `TerminalService` | where the user is (a list of directories) |

## How a line is run

1. The view takes `input` on Enter and puts it in a queue (typing ahead while a command runs
   is fine, the lines run one by one).
2. `ShellService.run(line, output)` splits the line into words with `tokenize`
   (`services/tokenizer.ts`), looks the first word up in the registry and calls
   `command.run(args, ctx)`.
3. The command prints with `ctx.out` / `ctx.err`. Throwing an error is the same as `ctx.err`.
   `Shell` never throws.
4. The view draws what came to `output`. Errors are shown red with `(!)`.

Because commands write to an `Output` instead of to the screen, the same code runs in tests
(`ShellService.capture`) and can run in any other view.

## Words and quotes

A word with spaces goes between **backticks**: ``touch `Un chat` `A cat` `` gives two sides,
``cd `My French` `` goes into a directory with a space in its name. Inside backticks, ``\` `` is a
backtick and `\\` is a backslash.

A double quote `"` is an ordinary character, so a side can hold quotes: `touch say "hi"` gives the
sides `say` and `"hi"`. `touch l'ami friend` keeps the apostrophe: a single quote opens a word only at
its start and closes only before whitespace. A backslash outside backticks makes the next character
literal (`a\ b`). The exact rules are in the comment of `tokenize` (the grouping character is the
constant `QUOTE`), and the cases are checked by `test`.

## Paths

`TerminalService.resolve(from, path)` understands `name`, `..`, `.`, `/` and combinations
(`French/Verbs`, `/French`, `../Spanish`). Any name in a path can also be the **id** of a
directory (`cd 4a3x`, as `ls` shows it, like `rm` takes the id of a card; `rmdir`, `mv` and `edit` take a title too); when a title and an id are
the same text, the title wins. A bare `cd` goes to the root `/`: unlike in Linux there is no home
directory here. Nothing is cached: every step asks the database,
so the session does not see stale data. After a directory is removed,
`revalidate()` steps the session out of directories that no longer exist.

## Adding a command

1. Write an object of type `TerminalCommand` (`commands/command.ts`) in the file of its
   group (`navigation`, `edit`, `system`, `diagnostics`), or a new one:

   ```ts
   export const hello: TerminalCommand = {
     name: 'hello',
     group: 'system',
     usage: 'hello <name>',
     description: 'say hello',                      // one short line for plain `help`
     why: 'Greets someone, to show how a command is written.',  // for `help hello`
     examples: ['hello  # Hello, world!', 'hello Anna  # Hello, Anna!'],
     run(args, ctx) {
       ctx.out(`Hello, ${args[0] ?? 'world'}!`);
     },
   };
   ```

2. Add it to `COMMANDS` in `commands/index.ts` (the order there is the order inside a group).
3. That is all: `help`, `help hello`, Tab completion of the name and the registry checks in
   `test` pick it up. `test` refuses a command without `why` or `examples`.
   Add `complete(partial, ctx)` if its arguments can be completed (see `cd`).
4. Put what the command must keep true into `test` (`debug.service.ts`), see [testing.md](testing.md).

Rules of thumb: commands call the core, not the database; they throw for errors instead of
printing `(!)` themselves; they are `async` when they touch the database.

A command that takes one of a fixed set of values (`font`, `theme`) follows one pattern:
called bare it shows the current value **and** the available ones, a wrong value says
`Usage: ... <a|b>`, and `complete` returns the values so Tab finishes them.

`font line <1-3|default>` sets the space between the lines (the CSS `line-height`, 1.25 by default;
`1,5` works as `1.5`). It is kept in `localStorage` (`memos.line`) and applied through the variable
`--line`, like the font.

## Help

`help` is generated from the registry, nothing is written twice.

- Plain `help` prints the groups (their titles are in `commands/system.ts`) and **one line per
  command**. No examples there, so the list stays short:

  ```
   * Data manipulation

      · touch - create a card (type help touch for more)
  ```

  A title is ` * Title` (one space, a star), the commands under it are `    · name - text`
  (four spaces, a dot), so nothing sticks to the left edge. The constants are at the top of
  `commands/system.ts`.
- `help <command>` prints the usage, the one-line description, then **Why** (what the command is
  for), **Examples** (`# text` after two spaces explains a line) and **Notes** (rules and
  warnings), in the same look.
- `help` is also where the **Planned** list lives (`PLANNED`): move a line out of it when the
  feature works.
- A help ends with **one** empty line before the next prompt. That needs two line breaks at the
  end of the text: the browser does not draw a single trailing one (`withBlankLineAfter`).

## Repetition mode (`ask`)

`ask [path]` shows the cards that are due (`next` is in the past) under the path, the most
overdue first, one at a time. It works like a confirmation: while it runs, every line typed is an
answer or a `/command` of the mode, not a command of the shell, and it is kept out of the history.
`ShellService.card` holds the card on the screen; a command shows one with `ctx.prompt(card)`.

```
╭─axl@memos /Demo/French
[ Original ] [ 🇫🇷 French ]
la maison
[ 22% ] [ 00:13:22 ] [ /help ]
╰─$ <the empty input hints the field to type>
```

- The chips of the last row: **need** (how late the card is, relative to the expected wait; see
  [domain.md](domain.md)), **age** (`dd:hh:mm` since the card was made), the commands.
- The age chip fills with green from the left while you type: the length of the start your text
  shares with the right answer over the length of the answer (`Un` of `Un chat` is 2/7). A wrong
  letter drops the bar back; an answered card keeps the bar it had.
- `exit` or `done` (with or without a `/`) and Esc leave. Tab completes `/commands`.
- Commands: `/postpone [time]` (10m by default, moves only `next`), `/nullify`, `/same` (a right
  answer with the growth of 1), `/tip`, `/help`. A wrong answer only says the percent that matches.
- Rules and arithmetic are pure functions in `repeat/schedule.ts`, checked by Karma.

### Setting the times of a card by hand

`edit <card id> next:X prev:X` writes the two moments of a card, so a card can be made due, or
brought to any state, without waiting. `X` is counted **from now**, not from the old value:

| Typed | Result |
| --- | --- |
| `next:now` | `next` = now: the card may be repeated at once |
| `next:1m` / `next:+1m` | one minute after now |
| `next:-1m` | one minute before now (the card is due) |
| `prev:now`, `prev:1m`, `prev:-1m` | the same for the last repeat |

Units are `s`, `m`, `h`, `d` (`2h`, `-1d`, `90s`); a bare number is minutes. The two can be given
together with sides: `edit Lzad 2:chien next:now`. The report shows the old and the new time as
`yyyy-mm-dd hh:mm:ss`. Everything is checked first: a wrong side or time changes nothing.

## Search (`find`)

`find [-c <directory>]... <text>` looks for the text in the sides of the cards, ignoring case; a part of
a side is enough. The words after the options are one text, so ``find Un chat`` is ``find `Un chat` ``.
Each card is printed under the full path of its directory, every part with its own icon (`/🌎 Languages/🇫🇷 French`), with the number of cards at the end.

- `find Un chat`: the current directory and everything under it.
- `find -c French Un chat`: only in the directories titled `French` (all of them, wherever they are).
- `find -c aB3x Un chat` / `find -c /French/Verbs Un chat`: by id or by path.
- `-c` can be repeated: `find -c French -c Spanish chat`.
- Nothing found prints `Nothing found`, which is not an error. `find` never changes data.

## Keys

↑ / ↓ history, Ctrl+L clears the screen.

**Selecting text.** What you select with the mouse stays selected, so it can be copied (Ctrl+C).
A click on the screen moves the cursor back into the input only when nothing is selected;
focusing the input would drop the selection. The line with the prompt is a `div`, not a `label`,
for the same reason (a label hands the focus to its input on every click). If you start typing
while nothing is focused, the keys go to the input; shortcuts with Ctrl, Cmd or Alt are left alone.

Tab completes the command name, or the last word through the command's `complete`. A name typed
in full wins over longer ones (`rm` + Tab gives `rm `, not a list with `rmdir`), and `rm <Tab>` /
`rmdir <Tab>` complete the id of a card / the id or title of a directory in the current directory:
`fo` -> `font `, `font J` -> `font JetBrainsMono`, `cd Su` -> ``cd `Sub Dir` `` (in backticks when the
name has spaces). When several options fit, the common part is filled in and the options are
listed under the line. `test` checks all of this.
