import { sidesWarning } from './move';

describe('sidesWarning', () => {
  it('says nothing when the card has as many sides as the directory', () => {
    expect(sidesWarning(2, 'French', ['Original', 'Translation'])).toBeUndefined();
  });

  it('names the sides of the directory when the count differs', () => {
    expect(sidesWarning(3, 'French', ['Original', 'Translation'])).toBe(
      'Warning: the card has 3 sides, but "French" has 2 sides [Original, Translation]'
    );
  });

  it('says so when the directory has no sides', () => {
    expect(sidesWarning(2, 'Languages', [])).toBe(
      'Warning: the card has 2 sides, but "Languages" has no sides'
    );
  });

  it('uses the singular for one side', () => {
    expect(sidesWarning(1, 'Words', ['A', 'B'])).toContain('the card has 1 side,');
  });
});
