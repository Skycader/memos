import { TerminalCommand } from './command';

export const test: TerminalCommand = {
  name: 'test',
  group: 'diagnostics',
  usage: 'test',
  description: 'self-test of the core and the terminal',
  why:
    'Checks that Memos works: runs a scenario over the core and the terminal and prints ' +
    '✔ or ✖ for every check. Run it after any change.',
  examples: [
    'test',
    'test clean  # removes /__test__ left by a crashed run',
  ],
  notes: ['Works in the real database inside /__test__ and cleans up after itself'],
  async run(args, ctx) {
    if (args.at(0) === 'clean') ctx.out(await ctx.debug.cleanTest());
    else ctx.out(await ctx.debug.selfTest(ctx));
  },
  async complete(partial) {
    return ['clean'].filter((name) => name.startsWith(partial));
  },
};

export const doctor: TerminalCommand = {
  name: 'doctor',
  group: 'diagnostics',
  usage: 'doctor',
  description: 'find cards and directories without a parent',
  why:
    'Looks for directories and cards that hang without a parent, for example after an ' +
    'interrupted removal, and tells how many there are.',
  examples: [
    'doctor  # only reports, changes nothing',
    'doctor fix  # moves them to /lost+found',
  ],
  notes: ['Nothing is ever deleted: fix only moves things to /lost+found'],
  async run(args, ctx) {
    const arg = args.at(0);
    if (arg !== undefined && arg !== 'fix') throw new Error('Usage: doctor [fix]');
    ctx.out(await ctx.doctor.run(arg === 'fix'));
  },
  async complete(partial) {
    return ['fix'].filter((name) => name.startsWith(partial));
  },
};
