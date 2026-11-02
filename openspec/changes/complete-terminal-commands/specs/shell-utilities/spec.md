# Spec Delta

## Purpose

Small shell commands that make the terminal feel like a unix shell: a virtual date and a man page, all independent of the card data.

## ADDED Requirements

### Requirement: A virtual date
The system SHALL provide `set date <dd.mm.yyyy> [hh:mm]` that sets a virtual current time for the whole application: the repetition (`ask`), the ages and the times of cards, `edit ... next:`/`prev:` and every other reading of the clock SHALL use it, and it SHALL run on from the set moment as the real clock does. The virtual date MUST NOT be written to the database or to `localStorage`: after a reload the real time is back. `set date` without a value SHALL show the virtual date if there is one, and `set date real` SHALL return to the real time.

#### Scenario: Set a date
- **WHEN** the user runs `set date 22.03.2001 18:13`
- **THEN** the terminal says the virtual time is 22.03.2001 18:13, and `ask` and the age chips count from that moment

#### Scenario: Reload
- **WHEN** the page is reloaded after `set date ...`
- **THEN** the application uses the real time again

#### Scenario: Wrong value
- **WHEN** the user runs `set date 31.02.2001` or `set date tomorrow`
- **THEN** the terminal prints the usage and the time does not change

### Requirement: Man is help
The system SHALL accept `man <command>` as another name of `help <command>`, with the same output.

#### Scenario: Same output
- **WHEN** the user runs `man cd`
- **THEN** the output is identical to `help cd`
