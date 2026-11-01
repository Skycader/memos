# Spec Delta

## Purpose

Read-only terminal commands that show, search and count what is stored, so the user can look at a card in full, see the whole tree of decks and find things without changing any data.

## ADDED Requirements

### Requirement: Show a card in full
The system SHALL provide `cat <id>` that prints one card of the current directory with every side labelled by the side name defined in its directory.

#### Scenario: Existing card
- **WHEN** the user runs `cat <id>` with the id of a card in the current directory
- **THEN** the terminal prints the id, and one line per side as `<side name>: <value>`

#### Scenario: Unknown id
- **WHEN** the user runs `cat <id>` and no card has that id
- **THEN** the terminal prints an error saying there is no such card and changes nothing

#### Scenario: Missing argument
- **WHEN** the user runs `cat` without an id
- **THEN** the terminal prints the usage line as an error

### Requirement: Show the directory tree
The system SHALL provide `tree [path]` that prints the directories under the given path (the current directory by default) as an indented tree, with the number of cards of each directory.

#### Scenario: Nested directories
- **WHEN** the user runs `tree` in a directory that holds `French` with a sub-directory `Verbs`
- **THEN** `Verbs` is printed one level deeper than `French`, each with its icon, title and card count

#### Scenario: Path does not exist
- **WHEN** the user runs `tree` with a path that does not resolve
- **THEN** the terminal prints an error and prints no tree

### Requirement: Search by text
The system SHALL provide `find <text>` that lists directories whose title contains the text and cards with a side that contains the text, searching the current directory and everything under it. Matching MUST ignore case.

#### Scenario: Match in a side
- **WHEN** the user runs `find chat` and a card under the current directory has the side `Un chat`
- **THEN** the result lists that card with its id and its path

#### Scenario: No match
- **WHEN** nothing matches
- **THEN** the terminal prints that nothing was found and it is not an error

### Requirement: Search inside cards only
The system SHALL provide `grep <text>` that lists only the cards (not directories) with a side containing the text, and prints for each the matching side name and value.

#### Scenario: Match
- **WHEN** the user runs `grep cat` and a card has the side `A cat`
- **THEN** the line shows the card id, the side name and the value `A cat`

### Requirement: Count what is stored
The system SHALL provide `wc` that prints the number of directories and cards directly in the current directory, and `du` that prints the same counts for the whole subtree.

#### Scenario: Counts
- **WHEN** the user runs `du` in a directory holding 2 directories with 10 cards in total
- **THEN** the terminal prints 2 directories and 10 cards

### Requirement: Read-only commands never change data
The commands of this capability MUST NOT create, change or remove any directory or card.

#### Scenario: Database unchanged
- **WHEN** any of `cat`, `tree`, `find`, `grep`, `wc`, `du` runs, including with bad arguments
- **THEN** the numbers of directories and cards are the same as before
