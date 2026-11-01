import { parseEdits } from './edits';
import { tokenize } from './tokenizer';

describe('parseEdits', () => {
  it('reads N:value with sides counted from 1', () => {
    expect(parseEdits(['1:hello'])).toEqual([{ position: 1, value: 'hello' }]);
  });

  it('works on what the tokenizer makes of 1:`new value`', () => {
    expect(parseEdits(tokenize('1:`new value` 2:x'))).toEqual([
      { position: 1, value: 'new value' },
      { position: 2, value: 'x' },
    ]);
  });

  it('keeps colons after the first one in the value', () => {
    expect(parseEdits(['3:a:b'])).toEqual([{ position: 3, value: 'a:b' }]);
  });

  it('allows an empty value', () => {
    expect(parseEdits(['2:'])).toEqual([{ position: 2, value: '' }]);
  });

  it('refuses side 0, words without N: and a side given twice', () => {
    expect(() => parseEdits(['0:x'])).toThrowError(/from 1/);
    expect(() => parseEdits(['hello'])).toThrowError(/N:value/);
    expect(() => parseEdits([':x'])).toThrowError(/N:value/);
    expect(() => parseEdits(['-1:x'])).toThrowError(/N:value/);
    expect(() => parseEdits(['1:a', '1:b'])).toThrowError(/twice/);
  });
});
