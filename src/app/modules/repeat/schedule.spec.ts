import {
  DAY,
  formatSpan,
  GROWTH_WITH_TIP,
  HOUR,
  intervalOf,
  mask,
  matches,
  MIN_INTERVAL,
  MINUTE,
  needOf,
  nullify,
  parseOffset,
  parseSpan,
  formatTime,
  planRound,
  progressOf,
  similarity,
  postpone,
  same,
  succeed,
  fail,
  ageOf,
} from './schedule';

describe('schedule', () => {
  const NOW = 1_000_000_000_000;

  it('need is the wait divided by the expected wait (growth * rest)', () => {
    const card = { prev: NOW - 4 * HOUR, next: NOW - 2 * HOUR };
    /** the rest was 2 h, so 4 h are expected: 3 h of waiting is 75%, 4 h is 100%, 8 h is 200% */
    expect(needOf(card, card.next + 3 * HOUR)).toBe(0.75);
    expect(needOf(card, card.next + 4 * HOUR)).toBe(1);
    expect(needOf(card, card.next + 8 * HOUR)).toBe(2);
  });

  it('need is 0 while the card is not due', () => {
    expect(needOf({ prev: NOW, next: NOW + HOUR }, NOW)).toBe(0);
  });

  it('a card that was just made rests MIN_INTERVAL for the need', () => {
    expect(intervalOf({ prev: NOW, next: NOW })).toBe(0);
    expect(needOf({ prev: NOW, next: NOW }, NOW + 2 * MIN_INTERVAL)).toBe(1);
  });

  it('formats a span as dd:hh:mm', () => {
    expect(formatSpan(0)).toBe('00:00:00');
    expect(formatSpan(10 * MINUTE)).toBe('00:00:10');
    expect(formatSpan(13 * HOUR + 22 * MINUTE)).toBe('00:13:22');
    expect(formatSpan(2 * DAY)).toBe('02:00:00');
    expect(formatSpan(365 * DAY)).toBe('365:00:00');
    expect(formatSpan(-5)).toBe('00:00:00');
  });

  it('parses 30m, 2h, 1d, 90s and a bare number of minutes', () => {
    expect(parseSpan('30m')).toBe(30 * MINUTE);
    expect(parseSpan('2h')).toBe(2 * HOUR);
    expect(parseSpan('1d')).toBe(DAY);
    expect(parseSpan('90s')).toBe(90_000);
    expect(parseSpan('15')).toBe(15 * MINUTE);
    expect(parseSpan('1.5h')).toBe(90 * MINUTE);
  });

  it('refuses what is not a time', () => {
    expect(() => parseSpan('soon')).toThrowError(/Time looks like/);
    expect(() => parseSpan('0m')).toThrowError(/Time looks like/);
    expect(() => parseSpan('-5m')).toThrowError(/Time looks like/);
  });

  it('a right answer doubles the rest: 12 h become 24 h', () => {
    const after = succeed(NOW, { prev: NOW - 12 * HOUR, next: NOW });
    expect(after.prev).toBe(NOW);
    expect(intervalOf(after)).toBe(24 * HOUR);
  });

  it('a right answer to a new card gives 2 * MIN_INTERVAL, and a tip makes it smaller', () => {
    const fresh = { prev: NOW, next: NOW };
    expect(intervalOf(succeed(NOW, fresh))).toBe(2 * MIN_INTERVAL);
    expect(intervalOf(succeed(NOW, fresh, true))).toBe(MIN_INTERVAL * GROWTH_WITH_TIP);
    expect(intervalOf(succeed(NOW, fresh, true))).toBeLessThan(intervalOf(succeed(NOW, fresh)));
  });

  it('the rest grows from the time the card really stood: 16 minutes become 32', () => {
    const card = { prev: NOW - 16 * MINUTE, next: NOW - 16 * MINUTE };
    expect(intervalOf(succeed(NOW, card))).toBe(32 * MINUTE);
    expect(intervalOf(succeed(NOW, card, true))).toBe(24 * MINUTE);
  });

  it('a card answered late grows from the whole time it stood, not from the planned rest', () => {
    const card = { prev: NOW - 5 * HOUR, next: NOW - 3 * HOUR };
    expect(intervalOf(succeed(NOW, card))).toBe(10 * HOUR);
  });

  it('a card answered early grows from the time it stood, not from the planned rest', () => {
    const card = { prev: NOW - HOUR, next: NOW + HOUR };
    expect(intervalOf(succeed(NOW, card))).toBe(2 * HOUR);
  });

  it('same grows from the time the card stood, with the growth of 1', () => {
    expect(intervalOf(same(NOW, { prev: NOW - 16 * MINUTE, next: NOW - 16 * MINUTE }))).toBe(
      16 * MINUTE
    );
  });

  it('a right answer never makes the rest shorter', () => {
    for (const rest of [0, MINUTE, HOUR, DAY, 30 * DAY]) {
      const card = { prev: NOW - rest, next: NOW };
      expect(intervalOf(succeed(NOW, card))).toBeGreaterThanOrEqual(rest);
      expect(intervalOf(succeed(NOW, card, true))).toBeGreaterThanOrEqual(rest);
    }
  });

  it('is the same for the same input', () => {
    const card = { prev: NOW - HOUR, next: NOW };
    expect(succeed(NOW, card)).toEqual(succeed(NOW, card));
  });

  it('a wrong answer starts again from the shortest rest', () => {
    expect(fail(NOW)).toEqual({ prev: NOW, next: NOW + MIN_INTERVAL });
  });

  it('postpone moves only next, so the rest grows by the time', () => {
    const card = { prev: NOW - HOUR, next: NOW };
    const after = postpone(card, 10 * MINUTE);
    expect(after).toEqual({ prev: card.prev, next: card.next + 10 * MINUTE });
    expect(intervalOf(after)).toBe(intervalOf(card) + 10 * MINUTE);
  });

  it('same is a right answer with the growth of 1', () => {
    const card = { prev: NOW - HOUR, next: NOW };
    expect(intervalOf(same(NOW, card))).toBe(HOUR);
    expect(intervalOf(succeed(NOW, card))).toBe(2 * HOUR);
  });

  it('nullify makes the card as new, same repeats after the time the card stood', () => {
    expect(nullify(NOW)).toEqual({ prev: NOW, next: NOW });
    const card = { prev: NOW - 3 * HOUR, next: NOW - HOUR };
    expect(same(NOW, card)).toEqual({ prev: NOW, next: NOW + 3 * HOUR });
    expect(same(NOW, { prev: NOW, next: NOW }).next).toBe(NOW + MIN_INTERVAL);
  });

  it('the story of a card: 10 minutes, then a whole day, and the rest follows the time it stood', () => {
    /** added: prev and next are the same moment, there is no rest yet */
    const added = { prev: NOW, next: NOW };

    /** 10 minutes of real time pass, a right answer: the rest is 20 minutes */
    const first = succeed(NOW + 10 * MINUTE, added);
    expect(first.prev).toBe(NOW + 10 * MINUTE);
    expect(intervalOf(first)).toBe(20 * MINUTE);

    /** the player comes a whole day after that repeat (far past the 20 minutes planned) */
    const second = succeed(first.prev + DAY, first);
    expect(intervalOf(second)).toBe(48 * HOUR);
    expect(intervalOf(second)).not.toBe(2 * intervalOf(first));
  });

  it('age is the time since the last repeat, never negative', () => {
    expect(ageOf({ prev: NOW - 91_000, next: NOW }, NOW)).toBe(91_000);
    expect(ageOf({ prev: NOW + MINUTE, next: NOW }, NOW)).toBe(0);
  });

  it('the rest is made of prev alone: a card that stood 11.5 minutes comes back after 23', () => {
    const card = { prev: NOW - 11.5 * MINUTE, next: NOW - 100 * MINUTE };
    expect(intervalOf(succeed(NOW, card))).toBe(23 * MINUTE);
  });

  describe('planRound', () => {
    const card = (contents: string[], qfields?: number[]) => ({
      contents,
      spec: { qfields },
    });

    it('with two sides one is typed and the other shown, in either direction', () => {
      expect(planRound(card(['a', 'b']), () => 0)).toEqual({ answer: 0, shown: [1] });
      expect(planRound(card(['a', 'b']), () => 0.99)).toEqual({ answer: 1, shown: [0] });
    });

    it('a question only side is always shown and never typed', () => {
      const round = planRound(card(['dog', 'chien', 'pic'], [0, 2]), () => 0);
      expect(round).toEqual({ answer: 1, shown: [0, 2] });
    });

    it('a side with nothing in it is not asked', () => {
      expect(planRound(card(['a', ' ']), () => 0.99)).toEqual({ answer: 0, shown: [1] });
    });

    it('can not be asked without a side to type or without a side to show', () => {
      expect(planRound(card(['a', 'b'], [0, 1]))).toBeUndefined();
      expect(planRound(card(['a']))).toBeUndefined();
    });
  });

  it('matches ignores case and extra spaces, nothing else', () => {
    expect(matches('  Un   CHIEN ', 'un chien')).toBeTrue();
    expect(matches('un chat', 'un chien')).toBeFalse();
    expect(matches('Éa', 'éa')).toBeTrue();
  });

  it('a moment is now, or a shift from now with a sign', () => {
    expect(parseOffset('now')).toBe(0);
    expect(parseOffset('1m')).toBe(MINUTE);
    expect(parseOffset('+1m')).toBe(MINUTE);
    expect(parseOffset('-1m')).toBe(-MINUTE);
    expect(parseOffset('-2h')).toBe(-2 * HOUR);
    expect(parseOffset('NOW')).toBe(0);
  });

  it('refuses a moment that is nothing', () => {
    expect(() => parseOffset('')).toThrowError(/A moment looks like/);
    expect(() => parseOffset('-')).toThrowError(/Time looks like/);
    expect(() => parseOffset('soon')).toThrowError(/Time looks like/);
    expect(() => parseOffset('--1m')).toThrowError(/Time looks like/);
  });

  it('a moment is shown as date and time', () => {
    expect(formatTime(new Date(2026, 0, 11, 12, 30, 5).getTime())).toBe('2026-01-11 12:30:05');
  });

  it('similarity is how much of the right answer was typed', () => {
    expect(similarity('Un Chien', 'un chien')).toBe(1);
    expect(similarity('abcd', 'abcf')).toBe(0.75);
    expect(similarity('abc', 'abcd')).toBe(0.75);
    expect(similarity('', 'abc')).toBe(0);
    expect(similarity('xyz', 'abc')).toBe(0);
    expect(similarity('', '')).toBe(1);
  });

  it('progress is the shared start over the length of the answer', () => {
    expect(progressOf('', 'Un chat')).toBe(0);
    expect(progressOf('Un', 'Un chat')).toBeCloseTo(2 / 7, 5);
    expect(progressOf('un c', 'Un chat')).toBeCloseTo(4 / 7, 5);
    expect(progressOf('Un chat', 'Un chat')).toBe(1);
  });

  it('progress stops at the first wrong letter, and ignores case and spaces', () => {
    expect(progressOf('Ux chat', 'Un chat')).toBeCloseTo(1 / 7, 5);
    expect(progressOf('x', 'Un chat')).toBe(0);
    expect(progressOf('  UN   CH', 'Un chat')).toBeCloseTo(5 / 7, 5);
  });

  it('progress is never more than 1: typing past the answer does not fill more', () => {
    expect(progressOf('Un chats', 'Un chat')).toBe(1);
    expect(progressOf('abc', '')).toBe(0);
  });

  it('a tip keeps the first letter of every word', () => {
    expect(mask('Un chien')).toBe('U_ c____');
    expect(mask('A')).toBe('A');
    expect(mask('a-b, 12!')).toBe('a-b, 1_!');
  });
});
