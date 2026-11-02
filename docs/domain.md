# Domain

What Memos is about, in the author's own terms. Status of each part is marked:
**implemented**, **planned**.

## Two entities

- **Directory**: a folder. Holds cards and other directories.
- **Card**: an object with fields. Lives in a directory, never in the root.

## Fields and sides

A card has **named fields**, for example `original`, `translation`.
Two fields are the two real-life sides of a paper card, but Memos allows more than two,
for example `original`, `transcription`, `translation`.
"Side" and "field" mean the same thing.

The names are defined by the directory (**implemented**: `Directory.fields`, set with
`mkdir <title> [sides...]`), the values are stored in the card
(**implemented**: `Card.contents`, positional, one value per field).
`Card.spec.status` keeps one list per side for the repetition state (**implemented** as
storage, the scheduler that uses it is **planned**).

The simplest case is Question -> Answer: two fields, one is shown, the other is the answer.

## Repetition (first version, `ask`)

A card keeps two moments: `prev` (the last repeat, or when it was made) and `next` (the first
moment it may be repeated). Everything else is computed:

- **interval** = `next - prev`, how long the card was meant to rest.
- **need** = `(now - next) / (growth * interval)`, 0 before `next`. With growth 2 and a rest of 2 h the
  expected wait is 4 h: 3 h late is 75%, 4 h is 100%. A new card has no interval, so 5 minutes
  (`MIN_INTERVAL`) stand in for it.
- **age** = `now - prev`, how long the card has stood without a repeat, shown as `dd:hh:mm`. A card
  keeps only `prev` and `next`: there is no birth time.
- A right answer: `prev = now`, `next = now + age * 2` (`* 1.5` after `/tip`), where `age` is the
  time the card has stood without a repeat, `now - prev` (the number on the age chip), but not
  less than 5 minutes. A card that stood 16 minutes comes back after 32; one that stood 12 h,
  after 24 h; one answered after 20 h, after 40 h. The planned interval does not enter into it.
  Example: a card is added; 10 minutes later a right answer gives a rest of 20 minutes; if the
  player comes a whole day after that, the next rest is 48 hours (2 x the day it stood), not 40 minutes.
  A wrong answer changes nothing: the screen only says how much of the right answer was typed
  (`wrong, 80% of the right answer`, the answer is not shown), and the same card stays.
- `/same` is literally a right answer with the growth of 1: `prev = now`, the rest stays the same.
- `/postpone [time]` adds the time (10 minutes by default) to `next` only and leaves `prev`, so the
  rest grows by it. A card that is very late may still be due after it.
- `/nullify` makes the card due at once, as a new one.
- The side to type is picked at random among the sides that are not question only; the question
  only sides are shown, or the first other side if there are none. Tip fields do not exist yet, so
  `/tip` shows the answer with its letters hidden (`Un chien` -> `U_ c____`).

To set the moments by hand: `edit <card id> next:now|1m|-1m prev:...`, counted from now
(see [terminal.md](terminal.md)).

Not done yet: ranks, the review log, per-field repetition state (`spec.status` is still empty), the
tip setting, `/postpone` through a clickable menu.

## Kinds of fields

| Kind | Meaning | Status |
| --- | --- | --- |
| normal | an ordinary side, shown and answered | implemented |
| read-only | shown, never typed in: a question side. The user can make any side read-only | **implemented per card**: ``touch ?`Un chat` `A cat` `` stores the place of the side in `CardSPEC.qfields` (the study command that honours it is planned); per directory (`name:ro`) is planned |
| tip | a hint field, see below | planned |

### Tip fields (planned)

`original:tip` is a field of a special kind: a **hint attached to the field `original`**.

- The user writes something in it (a mnemonic, an example, the first letter, ...).
- During study a button (later) shows the hint.
- Showing it can have a price: for example the interval growth factor is cut from 2 to 1.5
  for that answer. Looking at a hint counts as a partly successful answer, not a full one.

The `name:kind` notation is the **input syntax**. The idea for storage is a structure
instead of a bare string, so kinds do not get glued into names:

```ts
fields: [
  { name: 'original',    kind: 'normal' },
  { name: 'translation', kind: 'normal' },
  { name: 'tip',         kind: 'tip', for: 'original' },   // from "original:tip"
]
```

The same `name:kind` form would give `original:ro` for read-only. Moving from `string[]` to this
needs a new Dexie version that converts old names to `{ name, kind: 'normal' }`
(see "Schema changes" in [architecture.md](architecture.md)).

### Open questions

1. Where does read-only live: in the field definition (the whole directory) or on a single
   card (`qfields`)? Likely the directory decides, and a card may override.
2. Is a tip tied to one field (`original:tip`) only, or can there be one for the whole card?
   Can a field have several tips?
3. What exactly does a tip reduce: the interval growth factor (the 2 -> 1.5 example) or the
   grade of the answer? This shapes the signature of the future `schedule` function.

Decisions go here once they are made.

### Decided: question only on a card (`touch ?`)

- A `?` in front of a side marks it question only: `touch ?`Un chat` `A cat``. Study will show it
  and never ask the user to type it, and never show `A cat` as a question for `Un chat` to be typed.
  Meant for sides a player should not type: pictures, sounds, long texts, a text with a gap to fill.
- The mark is not part of the value. The positions (from 0) of marked sides are stored in
  `Card.spec.qfields`; a card with no marked side has no `qfields`, as before.
- `??` at the start is one literal `?` (`??why` is the side `?why`); a side that is only `?` is ordinary.
- At least one side must stay unmarked: it is the answer. A card with every side marked is refused.
- `edit <id> N:value` changes a side of a card by its place counted from 1; a question only side can
  be edited too, and the mark stays.
- `edit <directory id> N:name` works on the sides of a directory, and keeps its cards in step:
  - a name at a place that exists renames the side; the cards go by place, so they are not touched;
  - a name at the place right after the last side adds one, every card gets an empty value for it
    (and an empty schedule); a place can not be skipped;
  - `N:empty` takes the side out only if no card has a value in it (then it prints `✓ Clear`);
    otherwise the side stays and the command says how many cards have a value;
  - `N:drop` takes the side out and erases it from every card; it shows how many cards lose a value
    and waits for `drop` to be typed. Anything else cancels;
  - the first two sides can not be removed: a card has at least two;
  - the sides after a removed one move up, with their values, their schedule and their question
    only marks; a card that would be left with only question only sides makes the command refuse;
  - a directory and its cards are written in one transaction.
  - `edit <directory> icon:X` sets the icon, `icon:` with nothing after it takes it away (`mkdir` makes
    a directory with no icon); `name:X` renames the directory, its id stays, the title must be unique
    in its directory and can not contain `/`; they can be given together with `N:name` words;
  A directory is named by its title or its id, a card by its id; a title in the current directory wins,
  then the id decides: a card id edits values, a directory id edits sides. If one id is both (ids are
  drawn separately for cards and directories), the one in the current directory wins.
- Not decided yet: whether a directory can also declare a side read-only (`name:ro`), see question 1.
