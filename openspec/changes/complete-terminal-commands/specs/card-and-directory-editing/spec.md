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
The system SHALL provide `mv <what> <where>` that moves one card or one directory, with everything inside it, into another directory. `<what>` is a directory by title or id in the current directory, or a card by id. `<where>` is a path as in `cd` (`Languages`, `..`, `/`, `French/Verbs`, `/French`) or the id of a directory. The ids MUST stay the same, and nothing inside a moved directory changes. Only one thing is moved per command.

#### Scenario: Move a directory by title
- **WHEN** the user is in `/` and runs `mv French Languages`
- **THEN** `French` is listed in `Languages` and no longer in `/`, with its id, its cards and its sub-directories unchanged

#### Scenario: Move a directory to the root
- **WHEN** the user runs `mv French /`
- **THEN** `French` is listed in the root

#### Scenario: Move by the id of the target
- **WHEN** the user runs `mv French aB3x` and `aB3x` is the id of a directory
- **THEN** `French` goes into that directory, wherever it is

#### Scenario: Move a card
- **WHEN** the user runs `mv <card id> French/Verbs` and the target exists
- **THEN** the card is listed in `French/Verbs` and no longer in the old directory, with the same id, sides and learning progress

#### Scenario: Move into itself
- **WHEN** the user moves a directory into itself or into one of its own sub-directories
- **THEN** the terminal prints an error and nothing moves

#### Scenario: Title clash
- **WHEN** the target already holds a directory with the same title as the one being moved
- **THEN** the terminal prints an error and nothing moves

#### Scenario: Card into the root
- **WHEN** the user moves a card to `/`
- **THEN** the terminal refuses, because cards live in directories

#### Scenario: Card that does not fit
- **WHEN** the user moves a card into a directory with a different number of sides, or with no sides
- **THEN** the card is moved and the terminal prints a warning saying how many sides each has

#### Scenario: Nothing to move or nowhere to go
- **WHEN** the name is not a card or a directory here, the target does not exist, the thing is already in the target, or the number of words is not two
- **THEN** the terminal prints an error and nothing moves

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

### Requirement: Directory without an icon
The system SHALL create a directory with `mkdir <title> [sides...]`, with no icon and with any number of sides including none, so a directory can be only a place for other directories. `edit` SHALL be able to set and take away the icon and to change the title of a directory with the words `icon:X` and `name:X`, next to `N:name` words in the same command. The directory MAY be named by its title or its id. `ls` MUST list a directory without an icon without a gap in its place.

#### Scenario: Make without icon
- **WHEN** the user runs `mkdir Languages`
- **THEN** a directory `Languages` exists with no icon and no sides

#### Scenario: Set the icon
- **WHEN** the user runs `edit Languages icon:🌎`
- **THEN** the directory has the icon `🌎`, and the same works with the id in place of the title

#### Scenario: Take the icon away
- **WHEN** the user runs `edit Languages icon:`
- **THEN** the directory has no icon

#### Scenario: Rename the directory
- **WHEN** the user runs ``edit Languages name:`My languages` ``
- **THEN** the title is changed, the id stays, and cards and sub-directories are not touched

#### Scenario: Several at once
- **WHEN** the user runs `edit Languages name:Tongues icon:🌎 1:Word`
- **THEN** the title, the icon and the first side are all changed together, or none of them if one is wrong

#### Scenario: Bad title
- **WHEN** the new title is empty, is `.` or `..`, contains `/`, or is the title of a sibling
- **THEN** the terminal prints an error and nothing changes; giving a directory its own title is not an error

#### Scenario: Not for cards
- **WHEN** the user runs `edit <card id> icon:x`
- **THEN** the terminal prints an error, because a card has only sides

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

### Requirement: Setting the times of a card by hand
The system SHALL let `edit <card id>` set the two moments of a card with `next:X` and `prev:X`, where `X` is `now`, or a time with a sign counted from now: `1m`, `+1m`, `-1m`, `2h`, `-1d`; units are `s`, `m`, `h`, `d`, a bare number is minutes. Each moment SHALL be given at most once, only the ones named SHALL change, and they MAY be given together with sides.

#### Scenario: Now
- **WHEN** the user runs `edit Lzad next:now`
- **THEN** `next` is the current time and `prev` is as it was

#### Scenario: Before and after now
- **WHEN** the user runs `edit Lzad next:-1m` or `edit Lzad prev:1m`
- **THEN** the moment is one minute before, or after, the current time, whatever it was before

#### Scenario: Together with sides
- **WHEN** the user runs `edit Lzad 2:chienne next:2h`
- **THEN** both are written and the report shows the old and the new side and time

#### Scenario: Bad time
- **WHEN** a time is not `now` or a span, is given twice, or a side in the same command is wrong
- **THEN** the terminal prints an error and nothing changes, not even the other words of the command

#### Scenario: A directory
- **WHEN** `next:` or `prev:` is given for a directory
- **THEN** the terminal prints an error and nothing changes
