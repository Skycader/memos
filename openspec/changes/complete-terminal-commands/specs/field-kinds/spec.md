# Spec Delta

## Purpose

Lets a directory give its sides a kind (normal, read-only, tip) and lets cards be tagged, so a side can be a question only or a hint, and cards can be grouped across directories.

## ADDED Requirements

### Requirement: Side kinds in mkdir
The system SHALL accept `name:kind` for a side in `mkdir`, where `kind` is `ro` (read-only) or `tip`. A side without a kind is `normal`. A `tip` side SHALL be attached to the side named by `name:tip:<side>` or, when omitted, to the side just before it.

#### Scenario: Read-only side
- **WHEN** the user runs `mkdir 🇫🇷 French Original:ro Translation`
- **THEN** the directory is created with two sides, `Original` read-only and `Translation` normal

#### Scenario: Tip side
- **WHEN** the user runs `mkdir 🎓 Words Original Translation Hint:tip:Original`
- **THEN** the directory has a tip side `Hint` attached to `Original`

#### Scenario: Unknown kind
- **WHEN** a side uses a kind other than `ro` or `tip`
- **THEN** the terminal prints an error listing the valid kinds and creates nothing

#### Scenario: Tip for nothing
- **WHEN** a tip names a side that the directory does not have
- **THEN** the terminal prints an error and creates nothing

### Requirement: Kinds are shown
The system SHALL show the kind of every non-normal side in `ls` and `cat`, in the same `name:kind` form that `mkdir` accepts.

#### Scenario: ls
- **WHEN** a directory has `Original:ro`
- **THEN** `ls` shows `Original:ro` among its sides

### Requirement: Read-only side in touch
The system SHALL accept a leading `?` on a word of `touch` (``touch ?`Un chat` `A cat` ``) to mark that side as question only for that card, for a card of any directory. The marked side MUST be stored on the card so the card remembers it.

#### Scenario: Marked side
- **WHEN** the user runs ``touch ?`Un chat` `A cat` ``
- **THEN** the card is created with the sides `Un chat` and `A cat`, and the first one is marked read-only

#### Scenario: Wrong number of sides
- **WHEN** the number of words does not match the sides of the directory
- **THEN** the terminal prints an error and creates nothing

#### Scenario: Question mark only
- **WHEN** a word is just `?`
- **THEN** the card gets a side holding the single character `?` as an ordinary side, with no marking

### Requirement: Old data keeps working
The system SHALL read directories stored before kinds existed as having only normal sides, without losing any data, and `export` / `import` SHALL carry the kinds and still read files written before.

#### Scenario: Upgrade
- **WHEN** the app opens a database written before this change
- **THEN** every directory shows the same sides as before, all normal, and every card is intact

#### Scenario: Round trip
- **WHEN** a directory with a read-only side is exported and imported again
- **THEN** the kind of the side is the same after the import

### Requirement: Tags
The system SHALL provide `tag <id> <tag...>` and `untag <id> <tag...>` for cards, and `find` SHALL accept `tag:<name>` to list cards with that tag. Tags are case-insensitive words without spaces.

#### Scenario: Tag and find
- **WHEN** the user tags a card with `verb` and runs `find tag:verb`
- **THEN** the card is in the result

#### Scenario: Untag
- **WHEN** the user runs `untag <id> verb`
- **THEN** the card no longer matches `tag:verb`
