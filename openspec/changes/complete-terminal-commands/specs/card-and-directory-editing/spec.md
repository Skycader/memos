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
The system SHALL provide `edit <id> <side> <value>` that replaces one side of a card, where `<side>` is a side name or its number counted from 1. The other sides, the id and the learning progress MUST stay as they were.

#### Scenario: Edit by side name
- **WHEN** the user runs `edit Lzad Translation hello` and the card has a side `Translation`
- **THEN** `cat Lzad` shows `hello` for that side and the other sides are unchanged

#### Scenario: No such side
- **WHEN** the side name or number does not exist in the directory
- **THEN** the terminal prints an error listing the valid sides and nothing changes

#### Scenario: Read-only side
- **WHEN** the side is marked read-only (see the field-kinds capability) and the user runs `edit` on it
- **THEN** the side is changed, because read-only only means "not typed in during study", not "locked against the author"

### Requirement: Changes keep the data healthy
After any command of this capability, `doctor` SHALL report no new orphans, and every directory SHALL still have a unique title among its siblings.

#### Scenario: Doctor after moves
- **WHEN** `mv`, `cp`, `rename`, `edit` and `rmdir` have run successfully
- **THEN** `doctor` finds nothing hanging without a parent
