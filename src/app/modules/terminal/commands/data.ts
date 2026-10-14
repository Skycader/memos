import { TerminalCommand } from './command';

export const exportCommand: TerminalCommand = {
  name: 'export',
  group: 'data',
  usage: 'export',
  description: 'save the database as a CSV file',
  why:
    'Saves your data into a file: a copy to keep, or a way to move it to another browser ' +
    'or computer (load it there with import).',
  examples: ['export  # the browser downloads memos-<date>.csv'],
  notes: [
    'The file is named <database>-<date>.csv, for example memos-2026-10-14.csv',
    'The whole current database: directories, cards and the learning progress of every card',
    'Look for the file in your downloads',
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

export const seed: TerminalCommand = {
  name: 'seed',
  group: 'diagnostics',
  usage: 'seed',
  description: 'create "Demo" with test data',
  why:
    'Fills the current directory with demo data, so you can try ls, export, import ' +
    'and study on something real.',
  examples: ['seed  # then: cd Demo, ls'],
  notes: [
    'Three decks: French (3 sides, 26 cards: more than one page of ls), Capitals and Math',
    'All or nothing; refuses if "Demo" is already there. Remove it with rmdir <id>',
  ],
  async run(args, ctx) {
    if (args.length > 0) throw new Error('Usage: seed');
    const result = await ctx.seed.run(ctx.terminal.getCDI());
    ctx.out(
      `Created "Demo" (id ${result.id}): ${result.dirs} directories and ${result.cards} cards. Try: cd Demo, ls`
    );
  },
};

export const importCommand: TerminalCommand = {
  name: 'import',
  group: 'data',
  usage: 'import [--dry-run]',
  description: 'load a CSV file made by export',
  why: 'Brings data back from a file made by export: a backup, or data from another browser.',
  examples: [
    'import  # opens a file picker',
    'import --dry-run  # only shows what would happen, writes nothing',
  ],
  notes: [
    'Merges into directories that already exist; cards already there are skipped',
    'Everything imported gets new ids',
    'All or nothing: if the file is bad, the database stays as it was',
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
