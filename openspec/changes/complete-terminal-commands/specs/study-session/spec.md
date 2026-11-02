# Spec Delta

## Purpose

The repetition engine that is the point of the product: a scheduler that decides when a card comes back, a log of every answer, and a `study` command to go through today's cards in the terminal.

## ADDED Requirements

### Requirement: Scheduling is a pure function
The system SHALL compute the next review of a card from the card state, a grade, the current time and the number of tips used, with no access to storage or the clock other than its inputs. It SHALL start with the SM-2 algorithm.

#### Scenario: Same input, same output
- **WHEN** the scheduler is called twice with identical inputs
- **THEN** it returns identical results

#### Scenario: Good answer grows the interval
- **WHEN** a card is answered well
- **THEN** its next review is later than the previous interval, never earlier

#### Scenario: Forgotten
- **WHEN** a card is answered with the failing grade
- **THEN** its interval restarts from the shortest step

### Requirement: Tips cost something
The system SHALL reduce the growth of the interval when a tip was used for the answer. The reduction (default: growth factor 2 becomes 1.5) SHALL be a setting, per directory or global.

#### Scenario: Tip used
- **WHEN** a card is answered well after a tip was shown
- **THEN** the new interval is smaller than for the same answer without a tip

### Requirement: Review log
The system SHALL record every answer in a review log with the card id, side, time, grade, interval before and after, and whether a tip was used. The log MUST NOT be lost by `export` / `import` of cards, and MUST be part of the full backup.

#### Scenario: Answer is logged
- **WHEN** the user grades a card in `study`
- **THEN** one entry is added to the log

### Requirement: Study command
The system SHALL provide `study [path]` that builds the queue of cards due now under the path (the current directory by default), shows one question side at a time, reveals the answer on request, takes a grade and shows the next card until the queue is empty or the user leaves.

#### Scenario: Due cards
- **WHEN** the user runs `study` in a directory with 3 cards due and 5 not due
- **THEN** exactly the 3 due cards are asked, each once per session

#### Scenario: Nothing due
- **WHEN** no card is due
- **THEN** the terminal says there is nothing to study and when the next card is due

#### Scenario: Read-only side is the question
- **WHEN** a card has a read-only side
- **THEN** that side is shown as the question and is never asked to be typed in

#### Scenario: Tip key
- **WHEN** the card has a tip side and the user asks for the hint
- **THEN** the tip is shown and the answer is marked as one where a tip was used

#### Scenario: Leave
- **WHEN** the user types the leave command during `study`
- **THEN** progress made so far is kept and the normal prompt returns

### Requirement: Study does not break the terminal
While `study` runs, the lines typed SHALL go to the study session, not to the shell, and the terminal view, history and Tab completion SHALL work again after it ends.

#### Scenario: Back to the shell
- **WHEN** the session ends
- **THEN** the next typed line is run as an ordinary command

### Requirement: Repetition mode `ask`
The system SHALL provide `ask [path]`, a first version of repetition that works before `study` exists. It SHALL collect the cards under the path (the current directory by default, subdirectories included) whose `next` is not in the future, most needed first, and show them one at a time until none is left or the user leaves. While it runs, every line typed SHALL be an answer or a `/command` of the mode and SHALL NOT reach the shell parser or the history. The card SHALL be drawn as chips: the name of the side to type and the directory, the shown sides, then the need in percent, the age as `dd:hh:mm` and the commands.

#### Scenario: Due cards only
- **WHEN** the user runs `ask` in a directory with cards of which some are due
- **THEN** only the due ones are asked, the most needed first, each once

#### Scenario: Nothing due
- **WHEN** no card is due, or there is no card at all
- **THEN** the terminal says so, and tells in how long the next card is due when there is one

#### Scenario: Leaving
- **WHEN** the user types `exit`, `done`, `/exit` or presses Esc
- **THEN** the mode ends with a line of totals, nothing already answered is lost and the next typed line is an ordinary command

#### Scenario: Question only sides
- **WHEN** a card has sides marked question only
- **THEN** they are shown and never asked to be typed; a card with no side left to type is skipped

### Requirement: How a card comes back
The system SHALL keep two moments on a card, `prev` (the last repeat, or its creation) and `next` (the first moment it may be repeated), and SHALL compute from them: the interval `next - prev`, the need `(now - next) / (growth * interval)` (0 while not due), and the age since creation (`spec.born`, or the earlier of the two moments for older cards). The interval of a card that has none SHALL count as 5 minutes. All of it SHALL be pure functions with no clock, storage or Angular of their own.

#### Scenario: A right answer
- **WHEN** a card is answered right (letters in any case, spaces around and between words do not count)
- **THEN** `prev` becomes now and `next` becomes now plus the time the card stood since `prev` (not less than its planned interval and not less than 5 minutes) times 2, so a card of 16 minutes comes back after 32 and a card that rested 12 hours and was answered after 12 hours after 24

#### Scenario: A right answer after a tip
- **WHEN** `/tip` was used for the answer
- **THEN** the same time is multiplied by 1.5 instead of 2

#### Scenario: A wrong answer
- **WHEN** the answer is wrong
- **THEN** the terminal says how many percent of the right answer match, does not show the right answer, writes nothing and keeps the same card

### Requirement: Commands of the repetition mode
Inside `ask` the system SHALL accept `/postpone [time]`, `/nullify`, `/same`, `/tip` and `/help`, and Tab SHALL complete them. An unknown `/command` SHALL print an error and keep the card.

#### Scenario: Postpone
- **WHEN** the user types `/postpone` (10 minutes by default) or `/postpone 60m`
- **THEN** only `next` grows by that time, `prev` stays, and the next card is shown

#### Scenario: Same
- **WHEN** the user types `/same`
- **THEN** it is a right answer with the growth of 1: `prev` becomes now and the rest is not made longer

#### Scenario: Nullify
- **WHEN** the user types `/nullify`
- **THEN** `prev` and `next` both become now, as for a new card

#### Scenario: Tip
- **WHEN** the user types `/tip`
- **THEN** the answer is shown with all its letters but the first of each word hidden, and the answer is counted as helped

### Requirement: The result is shown as chips
A right answer SHALL be printed as a green chip with the text `✓ success` and a separate chip with the time of the next repeat and a clock icon, not as a sentence. A view that cannot draw chips SHALL get the same texts as one plain line.
