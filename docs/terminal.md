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
     description: 'say hello',
     run(args, ctx) {
       ctx.out(`Hello, ${args[0] ?? 'world'}!`);
     },
   };
   ```

2. Add it to `COMMANDS` in `commands/index.ts`. The order there is the order in `help`.
3. That is all: `help`, Tab completion of the name and the registry checks in `test` pick it up.
   Add `complete(partial, ctx)` if its arguments can be completed (see `cd`).
4. Put what the command must keep true into `test` (`debug.service.ts`), see [testing.md](testing.md).

Rules of thumb: commands call the core, not the database; they throw for errors instead of
printing `(!)` themselves; they are `async` when they touch the database.

A command that takes one of a fixed set of values (`font`, `theme`) follows one pattern:
called bare it shows the current value **and** the available ones, a wrong value says
`Usage: ... <a|b>`, and `complete` returns the values so Tab finishes them.

## Keys

↑ / ↓ history, Ctrl+L clears the screen.

Tab completes the command name, or the last word through the command's `complete`:
`fo` -> `font `, `font J` -> `font JetBrainsMono`, `cd Su` -> `cd "Sub Dir"` (quoted when the
name has spaces). When several options fit, the common part is filled in and the options are
listed under the line. `test` checks all of this.
