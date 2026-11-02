import { parseOffset } from '../../repeat/schedule';

/**
 * One change of a card: put a value into a side
 */
export interface SideEdit {
  /** the place of the side, counted from 1 as people count (the card keeps it from 0) */
  position: number;
  value: string;
}

/**
 * Read the `N:value` words of the edit command
 *
 * · N is the place of the side, counted from 1: 1 is the first side
 * · everything after the first : is the value, as typed, so it may hold colons and be empty
 * · each side can be named once per command
 *
 * 1:`new value`  ->  { position: 1, value: 'new value' }   (the tokenizer joins it into 1:new value)
 * 2:             ->  { position: 2, value: '' }            (empties the side)
 * 3:a:b          ->  { position: 3, value: 'a:b' }
 *
 * @throws Error if a word is not N:value, N is not a positive whole number, or a side repeats
 */
export function parseEdits(words: string[]): SideEdit[] {
  const edits: SideEdit[] = [];
  for (const word of words) {
    const match = /^(\d+):([\s\S]*)$/.exec(word);
    if (!match)
      throw new Error(`"${word}" is not N:value, for example 1:\`new value\` (sides are counted from 1)`);
    const position = Number(match[1]);
    if (position < 1) throw new Error('Sides are counted from 1');
    if (edits.some((edit) => edit.position === position))
      throw new Error(`Side ${position} is given twice`);
    edits.push({ position, value: match[2] });
  }
  return edits;
}

/** a moment of a card to set, as a shift from now (0 is now) */
export interface TimeEdits {
  next?: number;
  prev?: number;
}

/**
 * Split the words of `edit` for a card: `next:X` and `prev:X` set the moments of the schedule,
 * the others are `N:value` sides. Each of the two may be given once
 *
 * next:now  ->  { next: 0 }          next:-1m  ->  { next: -60000 }
 * prev:1m   ->  { prev: 60000 }
 *
 * @throws Error if a time is not now / 1m / -1m / +2h, or is given twice
 */
export function parseCardEdits(words: string[]): { sides: SideEdit[]; times: TimeEdits } {
  const times: TimeEdits = {};
  const sideWords: string[] = [];
  for (const word of words) {
    const match = /^(next|prev):([\s\S]*)$/.exec(word);
    if (!match) {
      sideWords.push(word);
      continue;
    }
    const key = match[1] as keyof TimeEdits;
    if (times[key] !== undefined) throw new Error(`${key}: is given twice`);
    times[key] = parseOffset(match[2]);
  }
  return { sides: sideWords.length > 0 ? parseEdits(sideWords) : [], times };
}

/** the words of `edit` that are about the directory itself and not about its sides */
export interface DirMeta {
  /** the new icon, '' takes it away */
  icon?: string;
  /** the new title */
  name?: string;
}

/**
 * Read the words of `edit` for a directory: `N:name` for sides, `icon:X` and `name:X` for the
 * directory itself. They may be given together, each at most once
 *
 * icon:🌎        ->  meta.icon = '🌎'
 * icon:          ->  meta.icon = ''            (no icon)
 * name:`My deck` ->  meta.name = 'My deck'
 * 1:Word 2:Tip   ->  sides, as in parseEdits
 *
 * @throws Error if a word is none of these, or one of them is given twice
 */
export function parseDirectoryEdits(words: string[]): { sides: SideEdit[]; meta: DirMeta } {
  const meta: DirMeta = {};
  const sideWords: string[] = [];
  for (const word of words) {
    const match = /^(icon|name):([\s\S]*)$/.exec(word);
    if (!match) {
      sideWords.push(word);
      continue;
    }
    const key = match[1] as keyof DirMeta;
    if (meta[key] !== undefined) throw new Error(`${key}: is given twice`);
    meta[key] = match[2];
  }
  if (meta.name === '') throw new Error('The name of a directory can not be empty');
  return { sides: parseEdits(sideWords), meta };
}
