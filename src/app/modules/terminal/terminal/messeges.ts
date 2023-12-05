/**
 * #TODO:
 * Сделать туду в несколько глав
 * по одной на cd, touch и тд
 */
export const helpMessage = `
  Memos Terminal 2.0 by Vodri
  List of available commands:
  · mkdir <icon> <title> <sides> - create catalog
  ╰─ Example: mkdir 🇫🇷 French Original Translation

  · cd <dir name> - go to dir by name
  ╰─ Example: cd French
  · cd .. - go up one level
  · cd / - go to root
  · cd <path> - go to path

  · lsdir - list directories in the current directory
  ╰─ Try also: lsd or dir - shorter version

  · rmdir <dir name> - remove directory by name
  ╰─ Example: rmdir French
  
  · pwd - display current path
  · clear - clear terminal
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
