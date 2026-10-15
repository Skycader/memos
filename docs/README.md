# Docs

Short notes on how Memos is built and **why**. What a command does is not written
here: `help` in the terminal is generated from the code and is always up to date.

| File | About |
| --- | --- |
| [welcome.md](welcome.md) | **start here**: what Memos is, how the owner works, rules, map, where the work stands (written for an AI that lost the chat) |
| [domain.md](domain.md) | what a directory, card, field and tip are; what is built and what is planned |
| [roadmap.md](roadmap.md) | plans, from the next steps to the far future |
| [architecture.md](architecture.md) | layers, modules, data model, the main rules |
| [terminal.md](terminal.md) | how the terminal works, how to add a command |
| [exchange.md](exchange.md) | `export` and `import`: the CSV file and the rules of import |
| [testing.md](testing.md) | the `test` and `doctor` commands, how to extend them |

## Where explanations live

- **Comments in code** say what a place does and why, locally.
- **These files** say what the code can not: the overall picture, the reasons behind a
  choice, the steps for a typical change.
- If a fact can be generated or checked by a command, it is not copied here.
