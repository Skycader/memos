# Spec Delta

## Purpose

Small shell commands that make the terminal feel like a unix shell: echo, history, who and when, leaving, aliases and a man page, all independent of the card data.

## ADDED Requirements

### Requirement: Echo
The system SHALL provide `echo [text...]` that prints its arguments joined by single spaces, using the same word rules as every other command.

#### Scenario: Words
- **WHEN** the user runs ``echo hello `big world` ``
- **THEN** the terminal prints `hello big world`

### Requirement: History
The system SHALL provide `history` that prints the lines typed in this session with their numbers, oldest first.

#### Scenario: Numbered lines
- **WHEN** the user has typed `ls` and `pwd` and then runs `history`
- **THEN** the output contains `ls` and `pwd` in that order, each with a number, and the `history` line itself

### Requirement: Whoami and date
The system SHALL provide `whoami` that prints the name of the current database (until several databases exist, `memos`), and `date` that prints the current local date and time.

#### Scenario: Date
- **WHEN** the user runs `date`
- **THEN** the terminal prints the current date and time in a readable form

### Requirement: Exit
The system SHALL provide `exit` that ends the session by clearing the screen and the typed-ahead queue, and printing a goodbye line. It MUST NOT close the browser tab or change any data.

#### Scenario: Exit
- **WHEN** the user runs `exit`
- **THEN** the screen is cleared and a line says the session ended, and the user can type again

### Requirement: Aliases
The system SHALL provide `alias <name> <command line>` and `alias` (list) and `unalias <name>`. Running the alias name SHALL run the stored command line with any extra arguments appended. An alias MUST NOT replace a name that is a real command.

#### Scenario: Define and use
- **WHEN** the user runs ``alias ll `ls c` `` and then `ll 2`
- **THEN** the terminal runs `ls c 2`

#### Scenario: Reserved name
- **WHEN** the user runs `alias ls pwd`
- **THEN** the terminal prints an error and the alias is not created

#### Scenario: Survives reload
- **WHEN** the page is reloaded
- **THEN** the aliases are still defined, as the theme and font are

### Requirement: Man is help
The system SHALL accept `man <command>` as another name of `help <command>`, with the same output.

#### Scenario: Same output
- **WHEN** the user runs `man cd`
- **THEN** the output is identical to `help cd`
