import { Card, Directory } from '../../database/services/db';
import {
  bornOf,
  DEFAULT_POSTPONE,
  formatSpan,
  mask,
  matches,
  needOf,
  nullify,
  parseSpan,
  planRound,
  postpone,
  same,
  similarity,
  succeed,
} from '../../repeat/schedule';
import { CardView, CommandContext, TerminalCommand } from './command';
import { cd } from './navigation';

/** the commands of the mode, `/help` first; Tab completes them */
const MODE_COMMANDS = ['/help', '/postpone', '/nullify', '/same', '/tip', '/exit'];

/** what the user can type to leave the mode, with or without the slash */
const LEAVE = ['exit', 'done', '/exit', '/done'];

const MODE_HELP = [
  'Type the answer and press Enter. Commands of the mode:',
  '  /postpone [time]  move the next repeat later (10m, or 30m, 2h, 1d)',
  '  /nullify          start the card over, due at once',
  '  /same             a right answer, the rest is not made longer',
  '  /tip              show the answer, letters hidden',
  '  /help             this list',
  '  /exit             leave (exit, done and Esc too)',
].join('\n');

/**
 * What the screen shows of a card: the sides that are shown, the field to type, the directory,
 * and the numbers (need, age)
 */
function viewOf(
  card: Card,
  dir: Directory,
  round: { answer: number; shown: number[] },
  now: number
): CardView {
  const name = (index: number) => dir.fields[index] ?? `Side ${index + 1}`;
  const need = needOf(card, now);
  return {
    shown: round.shown.map((index) => ({ name: name(index), value: card.contents[index] })),
    want: name(round.answer),
    dir: `${dir.icon} ${dir.title}`.trim(),
    rank: '',
    need: `${Math.round(need * 100)}%`,
    age: formatSpan(now - bornOf(card)),
    late: need >= 1,
    commands: MODE_COMMANDS,
  };
}

/**
 * The cards due now under a directory, the most needed first
 */
async function dueCards(ctx: CommandContext, owner: string, now: number) {
  const all = await ctx.core.cardsUnder(owner);
  const due = all
    .filter(({ card }) => card.next <= now)
    .sort((a, b) => needOf(b.card, now) - needOf(a.card, now));
  const soon = all.filter(({ card }) => card.next > now).map(({ card }) => card.next);
  return { total: all.length, due, nextAt: soon.length ? Math.min(...soon) : undefined };
}

/** how a round of one card went */
interface Outcome {
  /** the user left the mode */
  leave: boolean;
  result?: 'right' | 'moved';
  /** wrong answers given to the card on the way */
  misses: number;
}

/**
 * Show one card until it is answered, moved or the user leaves
 */
async function askOne(
  ctx: CommandContext,
  first: Card,
  dir: Directory,
  round: { answer: number; shown: number[] }
): Promise<Outcome> {
  let card = first;
  let tip = false;
  let misses = 0;

  for (;;) {
    const at = Date.now();
    const line = (await ctx.prompt(viewOf(card, dir, round, at))).trim();
    if (line === '') continue;
    if (LEAVE.includes(line.toLowerCase())) return { leave: true, misses };

    try {
      if (!line.startsWith('/')) {
        const answer = card.contents[round.answer];
        if (matches(line, answer)) {
          card = await ctx.core.reschedule(card.id, succeed(at, card, tip));
          ctx.chips([
            { text: '✓ success', kind: 'ok' },
            { text: formatSpan(card.next - at), kind: 'time' },
          ]);
          return { leave: false, result: 'right', misses };
        }
        /** only said: the schedule stays, the card stays, and the right answer is not shown */
        misses++;
        ctx.out(`✗ wrong, ${Math.round(similarity(line, answer) * 100)}% of the right answer`);
        continue;
      }

      const [command, ...rest] = line.split(/\s+/);
      if (command.toLowerCase() === '/help') {
        ctx.out(MODE_HELP);
      } else if (command.toLowerCase() === '/tip') {
        ctx.out(`Tip: ${mask(card.contents[round.answer])}`);
        tip = true;
      } else if (command.toLowerCase() === '/postpone') {
        const span = rest.length ? parseSpan(rest.join('')) : DEFAULT_POSTPONE;
        card = await ctx.core.reschedule(card.id, postpone(card, span));
        ctx.chips([
          { text: 'moved', kind: 'plain' },
          { text: formatSpan(card.next - at), kind: 'time' },
        ]);
        return { leave: false, result: 'moved', misses };
      } else if (command.toLowerCase() === '/nullify') {
        card = await ctx.core.reschedule(card.id, nullify(at));
        ctx.out('Started over: the card is due at once');
        return { leave: false, result: 'moved', misses };
      } else if (command.toLowerCase() === '/same') {
        card = await ctx.core.reschedule(card.id, same(at, card));
        ctx.chips([
          { text: '✓ success', kind: 'ok' },
          { text: formatSpan(card.next - at), kind: 'time' },
        ]);
        return { leave: false, result: 'moved', misses };
      } else {
        ctx.err(`No such command of the mode: ${command} (type /help)`);
      }
    } catch (e: any) {
      ctx.err(e?.message ?? 'Unexpected error');
    }
  }
}

export const ask: TerminalCommand = {
  name: 'ask',
  group: 'repeat',
  usage: 'ask [path]',
  description: 'repeat the cards that are due, one by one',
  why:
    'Enters the repetition mode: shows a card that is due, you type the answer, and the card ' +
    'comes back later, the later the more you know it. The cards under the path are asked ' +
    '(the current directory by default), the most overdue first, each once.',
  examples: [
    'ask  # the cards of this directory and of the ones below it',
    'ask French  # only the cards of French',
    '/postpone 60m  # inside: put this card off for an hour',
    '/help  # inside: the commands of the mode',
    'exit  # inside: leave (done does the same)',
  ],
  notes: [
    'The card shows the field and the directory, the side to translate, how much the card is ' +
      'needed (100% is as late as it was expected), how long it has lived (dd:hh:mm) and the commands',
    'A right answer makes the next rest twice the time the card stood since its last repeat (1.5 times after /tip): a card of 16 minutes comes back after 32; a wrong one only says how much of the right answer matches, the card stays and nothing is written',
    '/postpone moves only the next repeat; /same is a right answer that keeps the rest as it was',
    'A side that is question only is always shown and never asked to be typed',
    'Letters are compared in any case, spaces around and between words do not count',
    'While the mode lasts every line is an answer or a /command, not a command of the terminal',
  ],
  async run(args, ctx) {
    if (args.length > 1) throw new Error('Usage: ask [path]');

    const here = ctx.terminal.getPath();
    const target = args.length === 1 ? await ctx.terminal.resolve(here, args[0]) : here;
    const owner = target.at(-1)?.id ?? '/';
    const now = Date.now();
    const { total, due, nextAt } = await dueCards(ctx, owner, now);

    if (due.length === 0) {
      ctx.out(
        total === 0
          ? 'There are no cards here'
          : `Nothing to repeat now, the next card is due in ${formatSpan((nextAt ?? now) - now)}`
      );
      return;
    }

    const count = { right: 0, moved: 0, misses: 0 };
    let left = due.length;
    for (const { card, dir } of due) {
      const round = planRound(card);
      /** a card with nothing to type or nothing to show can not be asked */
      if (!round) {
        left--;
        continue;
      }
      const outcome = await askOne(ctx, card, dir, round);
      count.misses += outcome.misses;
      if (outcome.leave) break;
      if (outcome.result) count[outcome.result]++;
      left--;
    }

    ctx.out(`Done: ${count.right} right, ${count.misses} wrong, ${count.moved} moved, ${left} left`);
  },
  async complete(partial, ctx) {
    return await (cd.complete as NonNullable<typeof cd.complete>)(partial, ctx);
  },
};
