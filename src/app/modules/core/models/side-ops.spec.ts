import { Card } from '../../database/services/db';
import { addEmptySides, dropSideFromCard, hasData } from './side-ops';

const card = (contents: string[], qfields?: number[]): Card => ({
  id: 'aaaa',
  owner: 'dddd',
  contents,
  next: 1,
  prev: 2,
  spec: { status: contents.map((_, i) => [i]), ...(qfields ? { qfields } : {}) },
});

describe('side-ops', () => {
  it('hasData: an empty text and a missing place are no data', () => {
    expect(hasData(card(['a', '', 'c']), 0)).toBeTrue();
    expect(hasData(card(['a', '', 'c']), 1)).toBeFalse();
    expect(hasData(card(['a', 'b']), 2)).toBeFalse();
  });

  it('addEmptySides: adds empty values and empty schedules, leaves the original alone', () => {
    const original = card(['a', 'b']);
    const grown = addEmptySides(original, 2);
    expect(grown.contents).toEqual(['a', 'b', '', '']);
    expect(grown.spec.status).toEqual([[0], [1], [], []]);
    expect(original.contents).toEqual(['a', 'b']);
  });

  it('dropSideFromCard: takes the side out of the values and the schedule', () => {
    const dropped = dropSideFromCard(card(['a', 'b', 'c']), 1);
    expect(dropped.contents).toEqual(['a', 'c']);
    expect(dropped.spec.status).toEqual([[0], [2]]);
  });

  it('dropSideFromCard: marks of question only sides follow their sides', () => {
    expect(dropSideFromCard(card(['a', 'b', 'c'], [1]), 0).spec.qfields).toEqual([0]);
    expect(dropSideFromCard(card(['a', 'b', 'c'], [0, 2]), 1).spec.qfields).toEqual([0, 1]);
  });

  it('dropSideFromCard: the mark of the dropped side goes, and so does an empty list of marks', () => {
    expect(dropSideFromCard(card(['a', 'b', 'c'], [1]), 1).spec.qfields).toBeUndefined();
    expect('qfields' in dropSideFromCard(card(['a', 'b', 'c'], [1]), 1).spec).toBeFalse();
  });

  it('dropSideFromCard: a place past the last side changes nothing', () => {
    expect(dropSideFromCard(card(['a', 'b']), 5).contents).toEqual(['a', 'b']);
  });
});
