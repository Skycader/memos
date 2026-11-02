import { parseFind } from './inspect';

describe('parseFind', () => {
  it('joins the words into one text', () => {
    expect(parseFind(['Un', 'chat'])).toEqual({ text: 'Un chat', directories: [] });
    expect(parseFind(['Un chat'])).toEqual({ text: 'Un chat', directories: [] });
  });

  it('takes one word after -c as a directory, the rest is the text', () => {
    expect(parseFind(['-c', 'French', 'Un', 'chat'])).toEqual({
      text: 'Un chat',
      directories: ['French'],
    });
    expect(parseFind(['-c', 'aB3x', 'Un chat'])).toEqual({ text: 'Un chat', directories: ['aB3x'] });
  });

  it('takes several -c', () => {
    expect(parseFind(['-c', 'French', '-c', 'Spanish', 'chat']).directories).toEqual([
      'French',
      'Spanish',
    ]);
  });

  it('reads options only before the text', () => {
    expect(parseFind(['chat', '-c', 'x'])).toEqual({ text: 'chat -c x', directories: [] });
  });

  it('needs a text and a name after -c', () => {
    expect(() => parseFind([])).toThrowError(/Usage: find/);
    expect(() => parseFind(['-c', 'French'])).toThrowError(/Usage: find/);
    expect(() => parseFind(['-c'])).toThrowError(/Usage: find/);
  });
});
