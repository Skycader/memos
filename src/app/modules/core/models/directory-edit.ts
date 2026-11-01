import { Card } from '../../database/services/db';
import { addEmptySides, dropSideFromCard, hasData } from './side-ops';

/** the words that mean "take this side out" instead of being a new name of it */
export const SIDE_EMPTY = 'empty';
export const SIDE_DROP = 'drop';

/** one change asked of a directory: put a name at a place (from 1), or take the side out */
export interface DirChange {
  position: number;
  value: string;
}

export interface DirPlan {
  /** the names of the sides now */
  before: string[];
  /** the names of the sides after the change */
  fields: string[];
  /** sides that did not exist: appended at the end, every card gets an empty value for each */
  added: { position: number; name: string }[];
  renamed: { position: number; from: string; to: string }[];
  /**
   * sides that go. `empty` only takes out a side nobody has a value in,
   * `drop` takes it out together with the values (withData is how many cards lose one)
   */
  removed: { position: number; name: string; mode: 'empty' | 'drop'; withData: number }[];
  /** how many cards the directory holds */
  cards: number;
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/**
 * Work out what a change does to a directory and its cards, and refuse what must not happen.
 * Pure: nothing is read or written here, so it can be shown to the user before it is done.
 *
 * The places are the places the sides have now, counted from 1:
 * · a name at a place that exists renames the side (the cards do not change: they go by place)
 * · a name at the place right after the last side adds a side; places can not be skipped
 * · `empty` takes a side out if no card has a value in it, otherwise it is refused
 * · `drop` takes a side out together with its values in all cards
 * · the first two sides can never be taken out: a card has at least two
 *
 * @throws Error with the reason when the change can not be made
 */
export function planDirectoryEdit(
  fields: string[],
  cards: Card[],
  changes: DirChange[]
): DirPlan {
  const names = [...fields];
  const plan: DirPlan = {
    before: [...fields],
    fields: [],
    added: [],
    renamed: [],
    removed: [],
    cards: cards.length,
  };

  /** the place the next new side would take */
  let next = fields.length + 1;

  for (const { position, value } of [...changes].sort((a, b) => a.position - b.position)) {
    const keyword = value === SIDE_EMPTY || value === SIDE_DROP;

    if (position <= fields.length) {
      if (keyword) {
        if (position <= 2)
          throw new Error(
            `Side ${position} can not be removed: a card has at least two sides, the first two stay`
          );
        const name = fields[position - 1];
        const withData = cards.filter((card) => hasData(card, position - 1)).length;
        if (value === SIDE_EMPTY && withData > 0)
          throw new Error(
            `Side ${position} (${name}) stays: ${withData} card${plural(withData, '', 's')} ` +
              `${plural(withData, 'has', 'have')} a value in it. ` +
              `Use ${position}:${SIDE_DROP} to remove the side together with ` +
              `${plural(withData, 'that value', 'those values')}`
          );
        plan.removed.push({ position, name, mode: value, withData });
      } else {
        if (value === '')
          throw new Error(
            `A name of a side can not be empty (to remove side ${position} use ` +
              `${position}:${SIDE_EMPTY} or ${position}:${SIDE_DROP})`
          );
        if (value !== fields[position - 1])
          plan.renamed.push({ position, from: fields[position - 1], to: value });
        names[position - 1] = value;
      }
      continue;
    }

    if (keyword)
      throw new Error(
        `There is no side ${position} to remove: the directory has ${fields.length} ` +
          `side${plural(fields.length, '', 's')}`
      );
    if (position !== next)
      throw new Error(
        `There is no side ${position}: the directory has ${next - 1} ` +
          `side${plural(next - 1, '', 's')}, a new one goes to place ${next}`
      );
    if (value === '') throw new Error('A name of a side can not be empty');
    plan.added.push({ position, name: value });
    names.push(value);
    next++;
  }

  const gone = new Set(plan.removed.map((side) => side.position));
  plan.fields = names.filter((_, index) => !gone.has(index + 1));

  /** a card whose every remaining side is question only has nothing to answer */
  if (plan.removed.length > 0) {
    const stuck = cards.filter((card) => {
      const after = applyPlanToCard(card, plan);
      return after.contents.length > 0 && (after.spec.qfields?.length ?? 0) >= after.contents.length;
    }).length;
    if (stuck > 0)
      throw new Error(
        `${stuck} card${plural(stuck, '', 's')} would be left with nothing to answer: ` +
          `every side that remains is question only`
      );
  }
  return plan;
}

/**
 * The card as it must be after the plan: the removed sides taken out (values, schedule and
 * question only marks together), then empty values added up to the new number of sides
 */
export function applyPlanToCard(card: Card, plan: DirPlan): Card {
  let result = card;
  for (const side of [...plan.removed].sort((a, b) => b.position - a.position))
    result = dropSideFromCard(result, side.position - 1);
  const missing = plan.fields.length - result.contents.length;
  return missing > 0 ? addEmptySides(result, missing) : result;
}
