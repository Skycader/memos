/**
 * Whether a card fits the directory it was moved into: it should have as many sides as the
 * directory names. A card is moved anyway, this only says what looks wrong
 * @param cardSides how many sides the card has
 * @param dirTitle title of the directory the card went into
 * @param dirFields the names of its sides
 * @returns the warning, undefined if the card fits
 */
export function sidesWarning(
  cardSides: number,
  dirTitle: string,
  dirFields: string[]
): string | undefined {
  if (cardSides === dirFields.length) return undefined;
  const sides = (n: number) => `${n} side${n === 1 ? '' : 's'}`;
  const named = dirFields.length === 0 ? 'has no sides' : `has ${sides(dirFields.length)} [${dirFields.join(', ')}]`;
  return `Warning: the card has ${sides(cardSides)}, but "${dirTitle}" ${named}`;
}
