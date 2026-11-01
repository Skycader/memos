import { Card } from '../../database/services/db';
import { applyPlanToCard, planDirectoryEdit } from './directory-edit';

const card = (contents: string[], qfields?: number[]): Card => ({
  id: 'c' + contents.join(''),
  owner: 'dddd',
  contents,
  next: 1,
  prev: 2,
  spec: { status: contents.map(() => []), ...(qfields ? { qfields } : {}) },
});

const FIELDS = ['Name', 'Phone', 'Email'];
const edit = (position: number, value: string) => ({ position, value });

describe('planDirectoryEdit', () => {
  it('renames a side and leaves the cards alone', () => {
    const plan = planDirectoryEdit(FIELDS, [card(['a', 'b', 'c'])], [edit(2, 'Mobile')]);
    expect(plan.fields).toEqual(['Name', 'Mobile', 'Email']);
    expect(plan.renamed).toEqual([{ position: 2, from: 'Phone', to: 'Mobile' }]);
    expect(plan.removed).toEqual([]);
    expect(plan.added).toEqual([]);
  });

  it('a name equal to the old one is not a change', () => {
    expect(planDirectoryEdit(FIELDS, [], [edit(1, 'Name')]).renamed).toEqual([]);
  });

  it('adds a side right after the last one, and several in a row', () => {
    const plan = planDirectoryEdit(['A', 'B'], [], [edit(4, 'D'), edit(3, 'C')]);
    expect(plan.fields).toEqual(['A', 'B', 'C', 'D']);
    expect(plan.added).toEqual([
      { position: 3, name: 'C' },
      { position: 4, name: 'D' },
    ]);
  });

  it('refuses to skip a place when adding', () => {
    expect(() => planDirectoryEdit(['A', 'B'], [], [edit(4, 'D')])).toThrowError(/no side 4.*place 3/);
  });

  it('empty: takes a side out when no card has a value in it', () => {
    const cards = [card(['a', 'b', '']), card(['c', 'd'])];
    const plan = planDirectoryEdit(FIELDS, cards, [edit(3, 'empty')]);
    expect(plan.fields).toEqual(['Name', 'Phone']);
    expect(plan.removed).toEqual([{ position: 3, name: 'Email', mode: 'empty', withData: 0 }]);
  });

  it('empty: is refused and says how many cards have a value', () => {
    const cards = [card(['a', 'b', 'x']), card(['c', 'd', 'y']), card(['e', 'f', ''])];
    expect(() => planDirectoryEdit(FIELDS, cards, [edit(3, 'empty')])).toThrowError(
      /2 cards have a value.*3:drop/
    );
    expect(() => planDirectoryEdit(FIELDS, [cards[0]], [edit(3, 'empty')])).toThrowError(
      /1 card has a value/
    );
  });

  it('drop: takes the side out even when cards have values, and counts them', () => {
    const cards = [card(['a', 'b', 'x']), card(['e', 'f', ''])];
    const plan = planDirectoryEdit(FIELDS, cards, [edit(3, 'drop')]);
    expect(plan.removed).toEqual([{ position: 3, name: 'Email', mode: 'drop', withData: 1 }]);
    expect(plan.fields).toEqual(['Name', 'Phone']);
  });

  it('the first two sides can not be removed, however it is asked', () => {
    expect(() => planDirectoryEdit(FIELDS, [], [edit(2, 'empty')])).toThrowError(/at least two/);
    expect(() => planDirectoryEdit(FIELDS, [], [edit(1, 'drop')])).toThrowError(/at least two/);
  });

  it('there is nothing to remove past the last side', () => {
    expect(() => planDirectoryEdit(FIELDS, [], [edit(4, 'empty')])).toThrowError(/no side 4 to remove/);
  });

  it('an empty name is refused, for a rename and for a new side', () => {
    expect(() => planDirectoryEdit(FIELDS, [], [edit(2, '')])).toThrowError(/can not be empty/);
    expect(() => planDirectoryEdit(FIELDS, [], [edit(4, '')])).toThrowError(/can not be empty/);
  });

  it('refuses when a card would be left with only question only sides', () => {
    const cards = [card(['q', 'p', 'x'], [0, 1])];
    expect(() => planDirectoryEdit(FIELDS, cards, [edit(3, 'drop')])).toThrowError(
      /1 card would be left with nothing to answer/
    );
  });

  it('removing a side in the middle of three works for any side from the third', () => {
    const plan = planDirectoryEdit(['A', 'B', 'C', 'D'], [], [edit(3, 'empty')]);
    expect(plan.fields).toEqual(['A', 'B', 'D']);
  });
});

describe('applyPlanToCard', () => {
  it('drop: the values, the schedule and the marks of the later sides move up', () => {
    const plan = planDirectoryEdit(['A', 'B', 'C', 'D'], [], [edit(3, 'drop')]);
    const result = applyPlanToCard(card(['a', 'b', 'c', 'd'], [3]), plan);
    expect(result.contents).toEqual(['a', 'b', 'd']);
    expect(result.spec.status.length).toBe(3);
    expect(result.spec.qfields).toEqual([2]);
  });

  it('add: every card gets an empty value and an empty schedule for the new side', () => {
    const plan = planDirectoryEdit(['A', 'B'], [], [edit(3, 'C')]);
    const result = applyPlanToCard(card(['a', 'b']), plan);
    expect(result.contents).toEqual(['a', 'b', '']);
    expect(result.spec.status).toEqual([[], [], []]);
  });

  it('keeps the id, the owner and the schedule of the card', () => {
    const plan = planDirectoryEdit(FIELDS, [], [edit(3, 'drop')]);
    const original = card(['a', 'b', 'c']);
    const result = applyPlanToCard(original, plan);
    expect([result.id, result.owner, result.next, result.prev]).toEqual([
      original.id,
      original.owner,
      1,
      2,
    ]);
  });
});
