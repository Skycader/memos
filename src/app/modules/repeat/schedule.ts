/**
 * The arithmetic of repeating a card. Pure: no Angular, no Dexie, no clock (the time is always given),
 * so every rule here can be checked on its own.
 *
 * A card keeps two moments (ms, `Date.now()`):
 * · prev - when it was repeated last (or made)
 * · next - when it may be repeated next
 * and everything else is computed from them:
 * · interval = next - prev   how long the card was meant to rest
 * · need     = how long it has waited past `next`, in units of the expected wait (see needOf)
 * · age      = how long it has lived in the system (see bornOf)
 */

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** the shortest rest of a card: a new or forgotten card comes back after this */
export const MIN_INTERVAL = 5 * MINUTE;

/** how many times the rest grows after a right answer */
export const GROWTH = 2;

/** the same, when a tip was used: a tip is paid for with a slower growth */
export const GROWTH_WITH_TIP = 1.5;

/** how far `/postpone` puts a card off when no time is given */
export const DEFAULT_POSTPONE = 10 * MINUTE;

/** what the scheduler reads and writes of a card */
export interface Schedule {
  next: number;
  prev: number;
}

/** the part of a card that tells its sides apart */
export interface Sided {
  contents: string[];
  spec: { qfields?: number[]; born?: number };
}

/**
 * How long the card was meant to rest: between the last repeat and the moment it may be repeated
 */
export function intervalOf(card: Schedule): number {
  return Math.max(0, card.next - card.prev);
}

/**
 * How much the card is needed: the time it has been waiting for a repeat, divided by the wait
 * that was expected from it (growth * interval). 0 while it is not due, 1 (100%) when the wait is
 * as long as expected, and so on.
 *
 * Example: a rest of 2 h and growth 2 expect 4 h. After 3 h of waiting the need is 3/4 = 75%.
 * A card that was just made has no rest at all, MIN_INTERVAL stands in for it
 */
export function needOf(card: Schedule, now: number, growth = GROWTH): number {
  const waited = now - card.next;
  if (waited <= 0) return 0;
  return waited / (growth * Math.max(intervalOf(card), MIN_INTERVAL));
}

/**
 * When the card was made. Cards made before the moment was kept have no `born`: the earlier of
 * their two moments is the best guess left
 */
export function bornOf(card: Schedule & Pick<Sided, 'spec'>): number {
  return card.spec.born ?? Math.min(card.prev, card.next);
}

/**
 * A span of time as `dd:hh:mm` (days can have more than two digits: 365:00:00 is a year)
 */
export function formatSpan(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / MINUTE);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(minutes / 1440))}:${pad(Math.floor((minutes % 1440) / 60))}:${pad(minutes % 60)}`;
}

/**
 * `30m`, `2h`, `1d`, `90s`; a bare number is minutes
 * @throws Error if the text is not a time or is zero
 */
export function parseSpan(text: string): number {
  const found = /^(\d+(?:\.\d+)?)\s*([smhd])?$/i.exec(text.trim());
  const unit = { s: SECOND, m: MINUTE, h: HOUR, d: DAY } as Record<string, number>;
  const span = found ? Number(found[1]) * unit[(found[2] ?? 'm').toLowerCase()] : 0;
  if (!(span > 0)) throw new Error(`Time looks like 30m, 2h or 1d, not "${text}"`);
  return Math.round(span);
}

/**
 * A moment as the user types it, relative to now: `now`, `1m`, `+1m`, `-1m`, `2h`, `-1d`
 * @returns the shift in ms, 0 for `now`
 * @throws Error if the text is none of these
 */
export function parseOffset(text: string): number {
  if (text.trim().toLowerCase() === 'now') return 0;
  const found = /^([+-]?)(.+)$/.exec(text.trim());
  if (!found || found[2] === '') throw new Error(`A moment looks like now, 1m, -1m or +2h, not "${text}"`);
  const span = parseSpan(found[2]);
  return found[1] === '-' ? -span : span;
}

/**
 * A moment for a person: `2026-01-11 12:30:05` in the local time
 */
export function formatTime(ms: number): string {
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * The right answer: the card comes back after a longer rest than before
 * @param tip a tip was used, the rest grows slower
 */
export function succeed(now: number, card: Schedule, tip = false): Schedule {
  return grow(now, card, tip ? GROWTH_WITH_TIP : GROWTH);
}

/**
 * A right answer with a given growth: the card is repeated now and comes back after the time it
 * has lived without a repeat, multiplied by the growth. That time is how long the card really
 * stood since the last repeat (now - prev), never less than the rest that was meant for it
 * (next - prev) and never less than MIN_INTERVAL.
 *
 * A card that was not repeated for 16 minutes and is answered now comes back after 32 (growth 2);
 * a card that rested 12 h and is answered after 12 h comes back after 24 h
 */
function grow(now: number, card: Schedule, growth: number): Schedule {
  const survived = Math.max(intervalOf(card), now - card.prev, MIN_INTERVAL);
  return { prev: now, next: now + Math.round(survived * growth) };
}

/**
 * The card starts again from the shortest rest. Not used by `ask` yet: a wrong answer there only
 * tells how much of the right one matches and leaves the schedule as it is
 */
export function fail(now: number): Schedule {
  return { prev: now, next: now + MIN_INTERVAL };
}

/**
 * `/postpone`: only `next` moves, `prev` stays. So the rest grows by the time of the postponing,
 * and a card that is already late may still be due after it
 */
export function postpone(card: Schedule, span: number): Schedule {
  return { prev: card.prev, next: card.next + span };
}

/** `/nullify`: as if the card was made just now, it is due at once */
export function nullify(now: number): Schedule {
  return { prev: now, next: now };
}

/** `/same`: literally a right answer, but the growth is 1: the same rest as before */
export function same(now: number, card: Schedule): Schedule {
  return grow(now, card, 1);
}

/**
 * Which side the user is asked to type, and which sides they see
 * · the side to type is one of those not marked question only, with something in it
 * · they see the question only sides; when there are none, the first of the other sides
 * @param random a number in [0, 1), to pick the side to type; given by a test
 * @returns undefined if the card can not be asked (no side to type, or nothing to show)
 */
export function planRound(
  card: Sided,
  random: () => number = Math.random
): { answer: number; shown: number[] } | undefined {
  const marked = card.spec.qfields ?? [];
  const typeable = card.contents
    .map((_, index) => index)
    .filter((index) => !marked.includes(index) && card.contents[index].trim() !== '');
  if (typeable.length === 0) return undefined;

  const answer = typeable[Math.min(typeable.length - 1, Math.floor(random() * typeable.length))];
  const others = card.contents.map((_, index) => index).filter((index) => index !== answer);
  const questions = others.filter((index) => marked.includes(index));
  const shown = questions.length > 0 ? questions : others.slice(0, 1);
  return shown.length === 0 ? undefined : { answer, shown };
}

/**
 * Is the typed text the answer: letters in any case, spaces around and between words do not count
 */
export function matches(typed: string, expected: string): boolean {
  const plain = (text: string) =>
    text.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  return plain(typed) === plain(expected);
}

/**
 * How much of the right answer the typed text matches, from 0 to 1: one minus the edit distance
 * (insert, delete, change a letter) over the length of the longer text. Compared as `matches` does
 */
export function similarity(typed: string, expected: string): number {
  const plain = (text: string) =>
    [...text.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase()];
  const a = plain(typed);
  const b = plain(expected);
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;

  let row = b.map((_, index) => index + 1);
  row.unshift(0);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return 1 - row[b.length] / longest;
}

/**
 * A tip: the first letter of every word, the others hidden: `Un chien` -> `U_ c____`
 */
export function mask(text: string): string {
  return text.replace(/[\p{L}\p{N}]+/gu, (word) => {
    const chars = [...word];
    return chars[0] + '_'.repeat(chars.length - 1);
  });
}
