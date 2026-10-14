import { TerminalCommand } from './command';

export const test: TerminalCommand = {
  name: 'test',
  group: 'diagnostics',
  usage: 'test',
  description: 'run self-test of the core and the terminal',
  notes: [
    'Works in the real database inside /__test__ and cleans up after itself',
    'test clean - remove /__test__ left by a crashed run',
  ],
  async run(args, ctx) {
    if (args.at(0) === 'clean') ctx.out(await ctx.debug.cleanTest());
    else ctx.out(await ctx.debug.selfTest(ctx.capture));
  },
  async complete(partial) {
    return ['clean'].filter((name) => name.startsWith(partial));
  },
};

export const doctor: TerminalCommand = {
  name: 'doctor',
  group: 'diagnostics',
  usage: 'doctor',
  description: 'look for directories and cards hanging without a parent',
  notes: [
    'Only reports how many orphans there are, changes nothing',
    'doctor fix - move orphans to /lost+found (nothing is deleted)',
  ],
  async run(args, ctx) {
    const arg = args.at(0);
    if (arg !== undefined && arg !== 'fix') throw new Error('Usage: doctor [fix]');
    ctx.out(await ctx.doctor.run(arg === 'fix'));
  },
  async complete(partial) {
    return ['fix'].filter((name) => name.startsWith(partial));
  },
};
