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
`mkdir <icon> <title> <sides...>`), the values are stored in the card
(**implemented**: `Card.contents`, positional, one value per field).
`Card.spec.status` keeps one list per side for the repetition state (**implemented** as
storage, the scheduler that uses it is **planned**).

The simplest case is Question -> Answer: two fields, one is shown, the other is the answer.

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
- Not decided yet: whether a directory can also declare a side read-only (`name:ro`), see question 1.
