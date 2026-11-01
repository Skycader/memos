# Spec Delta

## Purpose

Terminal commands that change existing data: remove a directory by name, move, copy, rename and edit, so cards and decks no longer have to be deleted and created again to fix them.

## ADDED Requirements

### Requirement: Remove a directory by name
The system SHALL let `rmdir` take the title of a directory in the current directory as well as its id. When a title and an id are the same text, the title SHALL win, as in `cd`.

#### Scenario: By title
- **WHEN** the user runs `rmdir French` and the current directory holds a directory titled `French`
- **THEN** that directory is removed with everything inside it and the usual count of inner directories and cards is printed

#### Scenario: By id still works
- **WHEN** the user runs `rmdir aB3x` and no directory is titled `aB3x`
- **THEN** the directory with the id `aB3x` is removed

#### Scenario: Unknown name
- **WHEN** the user runs `rmdir Nope` and nothing matches by title or id
- **THEN** the terminal prints an error and removes nothing

### Requirement: Move
The system SHALL provide `mv <what> <to>` that moves a card or a directory (by id or title) into another directory given by path. The id MUST stay the same.

#### Scenario: Move a card
- **WHEN** the user runs `mv <card id> French/Verbs` and the target exists
- **THEN** the card is listed in `French/Verbs` and no longer in the old directory

#### Scenario: Move into itself
- **WHEN** the user moves a directory into itself or into one of its own sub-directories
- **THEN** the terminal prints an error and nothing moves

#### Scenario: Title clash
- **WHEN** the target already holds a directory with the same title as the one being moved
- **THEN** the terminal prints an error and nothing moves

#### Scenario: Card into the root
- **WHEN** the user moves a card to `/`
- **THEN** the terminal refuses, because cards live in directories

### Requirement: Copy
The system SHALL provide `cp <what> <to>` that copies a card, or a directory with everything inside, into another directory. Every copy MUST get new ids, and copied cards MUST start with fresh learning progress.

#### Scenario: Copy a directory
- **WHEN** the user runs `cp French Backup` and `Backup` exists
- **THEN** `Backup` holds a copy of `French` with all its cards and sub-directories, all with new ids, and the original is unchanged

### Requirement: Rename
The system SHALL provide `rename <what> <new title>` that changes the title of a directory. The same title rules as in `mkdir` apply: unique in its directory, not empty, not `.` or `..`, no `/`.

#### Scenario: Rename
- **WHEN** the user runs `rename French Francais` and no sibling is titled `Francais`
- **THEN** `ls` shows the directory as `Francais` with the same id

#### Scenario: Taken title
- **WHEN** a sibling already has the new title
- **THEN** the terminal prints an error and the title is not changed

### Requirement: Edit a card
The system SHALL provide `edit <id> <N:value...>` that replaces sides of a card, where `N` is the place of the side counted from 1 (a card keeps its sides as a list, not as named keys) and everything after the first colon is the value. Several `N:value` words MAY be given in one command, each place at most once.

#### Scenario: Edit one side
- **WHEN** the user runs ``edit Lzad 2:`A dog` `` and the card has at least two sides
- **THEN** the second side of the card is `A dog`, the other sides are unchanged, and the terminal prints the old and the new value of that side

#### Scenario: Several sides and an empty value
- **WHEN** the user runs `edit Lzad 1:chien 3:`
- **THEN** the first side is `chien`, the third side is empty, and the second is unchanged

#### Scenario: Colons in the value
- **WHEN** the user runs `edit Lzad 2:10:30`
- **THEN** the second side is `10:30`

#### Scenario: No such side
- **WHEN** `N` is 0, or is greater than the number of sides of the card
- **THEN** the terminal prints an error saying how many sides the card has and nothing changes, not even the other sides named in the same command

#### Scenario: Bad words
- **WHEN** a word is not `N:value`, or a place is given twice, or no id or no change is given
- **THEN** the terminal prints an error and nothing changes

#### Scenario: Read-only side
- **WHEN** the side is marked read-only (see the field-kinds capability) and the user runs `edit` on it
- **THEN** the side is changed and the mark stays, because read-only only means "not typed in during study", not "locked against the author"

### Requirement: Editing a card changes nothing else
Editing a card MUST leave its id, its owner, its learning progress and its question only marks as they were, and MUST NOT change its number of sides. All the changes of one command SHALL be checked before any is made: if one is wrong, none is applied.

#### Scenario: Progress stays
- **WHEN** a card with a schedule has a side edited
- **THEN** its id, owner, next and previous review times and schedule are the same as before

#### Scenario: All or nothing
- **WHEN** one command changes sides 1 and 9 of a card that has three sides
- **THEN** the terminal prints an error and side 1 is not changed either

### Requirement: Edit a directory
The system SHALL let `edit` take the id of a directory, and then `N:name` words change the sides of that directory together with all the cards in it, in one step that either happens completely or not at all. What an id names is decided by the id: a card id edits values, a directory id edits sides. When one id belongs to both a card and a directory, the one in the current directory wins; if neither is there, the terminal refuses and asks to `cd` next to the one meant.

#### Scenario: Rename a side
- **WHEN** the user runs `edit aB3x 1:Name 2:Phone` on a directory with three sides
- **THEN** the first two sides of the directory are called `Name` and `Phone`, the third is unchanged, and no card changes

#### Scenario: Add a side
- **WHEN** the directory has three sides and the user runs `edit aB3x 4:Note`
- **THEN** the directory has four sides and every card in it has an empty fourth value and an empty schedule for it

#### Scenario: A place can not be skipped
- **WHEN** the directory has three sides and the user runs `edit aB3x 6:Note`
- **THEN** the terminal prints an error saying the new side goes to place 4 and nothing changes

#### Scenario: Empty name
- **WHEN** a name is empty
- **THEN** the terminal prints an error and nothing changes

#### Scenario: Take a side out when nobody uses it
- **WHEN** the user runs `edit aB3x 3:empty` and no card has a value in its third side
- **THEN** the third side is taken out of the directory and of every card, and the terminal prints `✓ Clear`

#### Scenario: Keep a side that is in use
- **WHEN** the user runs `edit aB3x 3:empty` and some cards have a value in their third side
- **THEN** nothing changes and the terminal says how many cards have a value there and suggests `3:drop`

#### Scenario: Take a side out with its values
- **WHEN** the user runs `edit aB3x 3:drop`
- **THEN** the terminal says how many cards will lose a value and asks to type `drop` to confirm; only the answer `drop` takes the side out of the directory and erases it from every card, any other answer or none cancels and nothing changes

#### Scenario: The first two sides stay
- **WHEN** the user runs `edit aB3x 1:empty`, `2:empty`, `1:drop` or `2:drop`
- **THEN** the terminal prints an error saying a card has at least two sides and nothing changes, without asking anything

#### Scenario: Later sides move up
- **WHEN** a side in the middle is taken out
- **THEN** the sides after it move up one place in the directory and in every card, with their values, their schedule and their question only marks

#### Scenario: Nothing left to answer
- **WHEN** taking a side out would leave a card whose every remaining side is question only
- **THEN** the terminal prints an error saying how many cards would be left with nothing to answer and nothing changes

### Requirement: Changes keep the data healthy
After any command of this capability, `doctor` SHALL report no new orphans, and every directory SHALL still have a unique title among its siblings.

#### Scenario: Doctor after moves
- **WHEN** `mv`, `cp`, `rename`, `edit` and `rmdir` have run successfully
- **THEN** `doctor` finds nothing hanging without a parent
