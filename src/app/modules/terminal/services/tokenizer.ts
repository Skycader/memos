/**
 * Split a command line into words
 *
 * · words are separated by whitespace
 * · "double quotes" group words, \" and \\ work inside them
 * · 'single quotes' group words too, but only when they open a word,
 *   and they close only before whitespace or the end of the line,
 *   so an apostrophe in the middle of a word stays an apostrophe: l'ami
 * · a backslash outside quotes takes the next character literally
 *
 * touch "Un chat" "A cat"  ->  [touch, Un chat, A cat]
 * touch l'ami friend       ->  [touch, l'ami, friend]
 *
 * @throws Error('Unclosed quote')
 */
export function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  /** true while a word is being read, so an empty quoted word "" is still a word */
  let started = false;
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (quote === '"') {
      if (ch === '"') quote = null;
      else if (ch === '\\' && (next === '"' || next === '\\')) current += line[++i];
      else current += ch;
      continue;
    }

    if (quote === "'") {
      if (ch === "'" && (next === undefined || /\s/.test(next))) quote = null;
      else current += ch;
      continue;
    }

    if (ch === '"' || (ch === "'" && !started)) {
      quote = ch;
      started = true;
    } else if (ch === '\\' && next !== undefined) {
      current += line[++i];
      started = true;
    } else if (/\s/.test(ch)) {
      if (started) tokens.push(current);
      current = '';
      started = false;
    } else {
      current += ch;
      started = true;
    }
  }

  if (quote) throw new Error('Unclosed quote');
  if (started) tokens.push(current);
  return tokens;
}
