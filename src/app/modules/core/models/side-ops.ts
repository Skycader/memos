import { Card } from '../../database/services/db';
import { CardSPEC } from './spec.model';

/**
 * Changes of the number of sides of a card. A card keeps its sides in arrays that go by place
 * (contents, spec.status) and remembers which of them are question only by place (spec.qfields),
 * so a side can not be added or taken out of one array alone: all three move together.
 * Pure functions: they return a new card and leave the given one alone.
 */

/** does the card have a value at this place (an empty text is no value) */
export function hasData(card: Card, index: number): boolean {
  return (card.contents[index] ?? '') !== '';
}

/**
 * The card with empty sides added at the end
 * @param count how many sides to add
 */
export function addEmptySides(card: Card, count: number): Card {
  const empty = Array.from({ length: count }, () => '');
  const none = Array.from({ length: count }, () => [] as number[]);
  return {
    ...card,
    contents: [...card.contents, ...empty],
    spec: { ...card.spec, status: [...card.spec.status.map((side) => [...side]), ...none] },
  };
}

/**
 * The card without the side at this place; the sides after it move one place up.
 * The marks of question only sides follow their sides
 * @param index place of the side, counted from 0
 */
export function dropSideFromCard(card: Card, index: number): Card {
  const contents = [...card.contents];
  if (index < contents.length) contents.splice(index, 1);

  const status = card.spec.status.map((side) => [...side]);
  if (index < status.length) status.splice(index, 1);

  const spec: CardSPEC = { ...card.spec, status };
  if (card.spec.qfields) {
    const marks = card.spec.qfields
      .filter((place) => place !== index)
      .map((place) => (place > index ? place - 1 : place));
    if (marks.length > 0) spec.qfields = marks;
    else delete spec.qfields;
  }
  return { ...card, contents, spec };
}
