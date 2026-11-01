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
