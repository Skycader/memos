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
| read-only | shown, never typed in: a question side. The user can make any side read-only | planned (`CardSPEC.qfields` is reserved for it; CLI form ``touch ?`Un chat` `A cat` ``) |
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
