import { TerminalCommand } from './command';

export const exportCommand: TerminalCommand = {
  name: 'export',
  group: 'data',
  usage: 'export',
  description: 'save the whole current database as a CSV file',
  notes: [
    'The file is named <database>-<date>.csv, for example memos-2026-10-14.csv',
    'Includes directories, cards and the learning progress of every card',
    'The browser downloads it: look in your downloads',
  ],
  async run(args, ctx) {
    if (args.length > 0) throw new Error('Usage: export');
    const result = await ctx.exchange.exportCsv();
    const name = ctx.exchange.fileName();
    ctx.files.download(name, result.text);

    ctx.out(
      `Exported ${result.dirs} director${result.dirs === 1 ? 'y' : 'ies'} and ` +
        `${result.cards} card${result.cards === 1 ? '' : 's'} to ${name}`
    );
    if (result.hangingDirs + result.hangingCards > 0)
      ctx.out(
        `⚠ ${result.hangingDirs} director${result.hangingDirs === 1 ? 'y' : 'ies'} and ` +
          `${result.hangingCards} card${result.hangingCards === 1 ? '' : 's'} hang without a parent ` +
          'and were NOT exported: run doctor'
      );
    if (result.rootCards > 0)
      ctx.out(`⚠ ${result.rootCards} card(s) lying in root were not exported (cards belong in directories)`);
  },
};

export const importCommand: TerminalCommand = {
  name: 'import',
  group: 'data',
  usage: 'import [--dry-run]',
  description: 'load a CSV file made by export into the current database',
  notes: [
    'Opens a file picker',
    'Merges into directories that already exist; cards already there are skipped; everything gets new ids',
    'All or nothing: if the file is bad, the database stays as it was',
    'import --dry-run - show what would happen and write nothing',
  ],
  async run(args, ctx) {
    const dryRun = args.at(0) === '--dry-run';
    if (args.length > 1 || (args.length === 1 && !dryRun))
      throw new Error('Usage: import [--dry-run]');

    const file = await ctx.files.pick('.csv,text/csv');
    if (!file) {
      ctx.out('No file chosen');
      return;
    }
    const report = await ctx.exchange.importCsv(file.text, dryRun);
    ctx.out(`${file.name}\n${ctx.exchange.describe(report, dryRun)}`);
  },
  async complete(partial) {
    return ['--dry-run'].filter((name) => name.startsWith(partial));
  },
};
