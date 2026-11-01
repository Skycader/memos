import { parseSides } from './sides';
import { tokenize } from './tokenizer';

describe('parseSides', () => {
  it('leaves plain sides alone', () => {
    expect(parseSides(['chat', 'cat'])).toEqual({ sides: ['chat', 'cat'], questionOnly: [] });
  });

  it('marks a side that starts with ? and removes the mark', () => {
    expect(parseSides(['?Un chat', 'A cat'])).toEqual({
      sides: ['Un chat', 'A cat'],
      questionOnly: [0],
    });
  });

  it('works on what the tokenizer makes of ?`Un chat` `A cat`', () => {
    expect(parseSides(tokenize('?`Un chat` `A cat`'))).toEqual({
      sides: ['Un chat', 'A cat'],
      questionOnly: [0],
    });
  });

  it('marks several sides and keeps their places', () => {
    expect(parseSides(['?a', 'b', '?c'])).toEqual({ sides: ['a', 'b', 'c'], questionOnly: [0, 2] });
  });

  it('treats a lone ? as an ordinary side', () => {
    expect(parseSides(['q', '?'])).toEqual({ sides: ['q', '?'], questionOnly: [] });
  });

  it('turns ?? into one literal ?', () => {
    expect(parseSides(['??why', 'because'])).toEqual({ sides: ['?why', 'because'], questionOnly: [] });
  });

  it('refuses a card where every side is question only', () => {
    expect(() => parseSides(['?a', '?b'])).toThrowError(/question only/);
  });
});
