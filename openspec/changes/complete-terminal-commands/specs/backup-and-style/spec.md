# Spec Delta

## Purpose

A complete, restorable backup of everything the app holds, and a setting for how `ls` looks, so data can be kept safe and the output matches the owner's taste.

## ADDED Requirements

### Requirement: Full backup
The system SHALL provide `backup` that downloads one JSON file with the whole current database: directories, cards with their learning state, the review log and the settings (theme, font, aliases, style). The file name SHALL carry the database name and the date.

#### Scenario: Download
- **WHEN** the user runs `backup`
- **THEN** the browser downloads a JSON file and the terminal prints how many directories, cards and log entries it holds

#### Scenario: Not a CSV
- **WHEN** a backup is made
- **THEN** it holds the review log and settings that the CSV `export` does not

### Requirement: Restore
The system SHALL provide `restore` that opens the file picker, validates a backup file and loads it. `restore --dry-run` SHALL only report what would be loaded. A file that fails validation MUST change nothing.

#### Scenario: Round trip
- **WHEN** a backup is restored into an empty database
- **THEN** `du` prints the same counts as at backup time and the review log is back

#### Scenario: Bad file
- **WHEN** the file is not valid JSON or has the wrong shape
- **THEN** the terminal prints an error and the database is unchanged

#### Scenario: Newer format
- **WHEN** the file was written by a newer format version than the app knows
- **THEN** the terminal refuses and says so

### Requirement: Old databases open
The system SHALL open a database written by any earlier version of the app, through numbered upgrades, without losing data. An upgrade of an existing version MUST NOT be edited; a new version is added instead.

#### Scenario: Upgrade
- **WHEN** a database from version 1 is opened
- **THEN** it opens at the current version with all its data

### Requirement: Style of ls
The system SHALL provide `style emoji|plain` that sets how `ls` marks directories and cards: `plain` keeps the words `DIR` and `CARD`, `emoji` shows 📁 and 📄. Bare `style` shows the current value and the available ones. The choice SHALL be remembered between sessions and `drop` SHALL keep it.

#### Scenario: Emoji
- **WHEN** the user runs `style emoji` and then `ls`
- **THEN** directories start with 📁 and cards with 📄 and the columns stay aligned

#### Scenario: Default
- **WHEN** the user never ran `style`
- **THEN** `ls` looks as it does today, with `DIR` and `CARD`

#### Scenario: Wrong value
- **WHEN** the user runs `style fancy`
- **THEN** the terminal prints `Usage: style <emoji|plain>`
