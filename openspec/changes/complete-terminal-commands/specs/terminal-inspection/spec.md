# Spec Delta

## Purpose

Read-only terminal commands that show, search and count what is stored, so the user can see the whole tree of decks and find things without changing any data.

## ADDED Requirements

### Requirement: Show the directory tree
The system SHALL provide `tree [path]` that prints the directories under the given path (the current directory by default) as an indented tree, with the number of cards of each directory.

#### Scenario: Nested directories
- **WHEN** the user runs `tree` in a directory that holds `French` with a sub-directory `Verbs`
- **THEN** `Verbs` is printed one level deeper than `French`, each with its icon, title and card count

#### Scenario: Path does not exist
- **WHEN** the user runs `tree` with a path that does not resolve
- **THEN** the terminal prints an error and prints no tree

### Requirement: Search by text
The system SHALL provide `find [-c <directory>]... <text>` that lists the cards with a side that contains the text, each under the full path of the directory it lies in, searching the current directory and everything under it. Every word after the options is a part of the text, so `find Un chat` means ``find `Un chat` ``. Matching MUST ignore case and a part of a side is enough. `-c` names a directory to search in instead of the current one, by title, by id or by path, and MAY be repeated; a title that several directories have searches all of them.

#### Scenario: Match in a side
- **WHEN** the user runs `find Un chat` and a card under the current directory has the side `Un chat`
- **THEN** the result prints the full path of the directory of the card with the icon of every part right before its title (`/🌎 Languages/🇫🇷 French`, a part without an icon has none), and the card itself, and the number of cards found

#### Scenario: Only in named directories
- **WHEN** the user runs `find -c French Un chat`, `find -c <directory id> Un chat` or ``find -c French `Un chat` ``
- **THEN** only the cards in `French` (or in the directory with that id) and below it are searched, and the three commands print the same

#### Scenario: No match
- **WHEN** nothing matches
- **THEN** the terminal prints `Nothing found` and it is not an error

#### Scenario: Wrong call
- **WHEN** the text is missing, `-c` has no name after it, or no directory has the given name
- **THEN** the terminal prints an error and searches nothing

### Requirement: Count what is stored
The system SHALL provide `wc` that prints the number of directories and cards directly in the current directory, and `du` that prints the same counts for the whole subtree.

#### Scenario: Counts
- **WHEN** the user runs `du` in a directory holding 2 directories with 10 cards in total
- **THEN** the terminal prints 2 directories and 10 cards

### Requirement: Read-only commands never change data
The commands of this capability MUST NOT create, change or remove any directory or card.

#### Scenario: Database unchanged
- **WHEN** any of `tree`, `find`, `wc`, `du` runs, including with bad arguments
- **THEN** the numbers of directories and cards are the same as before
