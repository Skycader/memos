/**
 * #TODO:
 * Сделать туду в несколько глав
 * по одной на cd, touch и тд
 */
export const helpMessage = `
  Memos Terminal 2.0 by Vodri
  List of available commands:
  · help - show this message

  · mkdir <icon> <title> <sides...> - create a directory in the current one
  ╰─ Arguments are split by spaces: title and sides are single words
  ╰─ A title must be unique within its directory
  ╰─ Example: mkdir 🇫🇷 French Original Translation

  · cd <dir name> - go to a directory by name (current directory only)
  ╰─ Example: cd French
  · cd .. - go up one level
  · cd / - go to root

  · pwd - display current path

  · lsdir - list directories in the current directory
  ╰─ Try also: lsd or dir - shorter version
  ╰─ Output: DIR <id> <icon> <title> [sides]

  · ls - list cards in the current directory (first 10)

  · rmdir <id> - remove directory by id (see ids in lsdir)
  ╰─ Example: rmdir aB3x
  ╰─ Removes everything inside too: subdirectories and cards, at any depth

  · touch <sides...> - create a card in the current directory
  ╰─ Arguments are split by spaces: every word is one side
  ╰─ Example: touch chat cat
  ╰─ Not allowed in root (/): create cards inside a directory

  · test - run self-test of the core (mkdir, touch, ls, rmdir, integrity)
  ╰─ Works in the real database inside /__test__ and cleans up after itself
  ╰─ test clean - remove /__test__ left by a crashed run

  · doctor - look for directories and cards hanging without a parent
  ╰─ Only reports how many orphans there are, changes nothing
  ╰─ doctor fix - move orphans to /lost+found (nothing is deleted)

  · clear - clear terminal
  · drop - erase the WHOLE database (no confirmation!)

  Planned (not implemented yet):
  · cd <path> - go to path (e.g. cd French/Verbs)
  · touch "Un chat" "A cat" - sides with spaces in quotes
  · touch ?"Un chat" "A cat" - make a side question only
  · rmdir <dir name> - remove directory by name
`;

/**
 *  cd: (args: string) => this.changeDirectory(args),
    mkdir: (args: string) => this.mkdir(args),
    lsdir: (args: string) => this.lsdir(args),
    dir: (args: string) => this.lsdir(args),
    lsd: (args: string) => this.lsdir(args),
    drop: (args: string) => this.drop(args),
    clear: () => this.clearTerminal(),
    rmdir: (args: string) => this.rmdir(args),
    pwd: () => this.terminal.pwd(),
 */
