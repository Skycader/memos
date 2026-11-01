/**
 * The sides of a card as typed after `touch`, and which of them are question only
 */
export interface TypedSides {
  /** the values, without the marks */
  sides: string[];
  /** positions (counted from 0) of the sides that are shown but never typed in */
  questionOnly: number[];
}

/**
 * Tell the sides of a card from the marks put before them
 *
 * · a leading ? makes a side question only: it is shown when studying, never asked for
 * · ?? at the start is one literal ?, for a side that really begins with a question mark
 * · a word that is just ? is an ordinary side (a question mark and nothing else)
 *
 * ?`Un chat` `A cat`  ->  sides [Un chat, A cat], question only [0]
 * ??why                ->  sides [?why],           question only []
 * ?                    ->  sides [?],              question only []
 *
 * The tokenizer joins ?`Un chat` into the one word ?Un chat, so this only looks at the first character
 *
 * @throws Error if every side is question only: there would be nothing to type in
 */
export function parseSides(words: string[]): TypedSides {
  const sides: string[] = [];
  const questionOnly: number[] = [];

  words.forEach((word, index) => {
    if (word.startsWith('??')) {
      sides.push(word.slice(1));
    } else if (word.length > 1 && word.startsWith('?')) {
      sides.push(word.slice(1));
      questionOnly.push(index);
    } else {
      sides.push(word);
    }
  });

  if (sides.length > 0 && questionOnly.length === sides.length)
    throw new Error(
      'Every side is question only: leave at least one side without ? for the answer'
    );
  return { sides, questionOnly };
}
