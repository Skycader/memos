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

`touch "Un chat" "A cat"` gives two sides. `touch l'ami friend` keeps the apostrophe:
a single quote opens a word only at its start and closes only before whitespace.
A backslash makes the next character literal (`a\ b`). The exact rules are in the comment
of `tokenize`, and the cases are checked by `test`.

## Paths

`TerminalService.resolve(from, path)` understands `name`, `..`, `.`, `/` and combinations
(`French/Verbs`, `/French`, `../Spanish`). Nothing is cached: every step asks the database,
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

## Keys

↑ / ↓ history, Ctrl+L clears the screen.

**Selecting text.** What you select with the mouse stays selected, so it can be copied (Ctrl+C).
A click on the screen moves the cursor back into the input only when nothing is selected;
focusing the input would drop the selection. The line with the prompt is a `div`, not a `label`,
for the same reason (a label hands the focus to its input on every click). If you start typing
while nothing is focused, the keys go to the input; shortcuts with Ctrl, Cmd or Alt are left alone.

Tab completes the command name, or the last word through the command's `complete`:
`fo` -> `font `, `font J` -> `font JetBrainsMono`, `cd Su` -> `cd "Sub Dir"` (quoted when the
name has spaces). When several options fit, the common part is filled in and the options are
listed under the line. `test` checks all of this.
