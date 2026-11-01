# Spec Delta

## Purpose

Lets the user keep several separate databases in one browser and switch between them from the terminal, and gives the self-test a throw-away database it can use without touching real data.

## ADDED Requirements

### Requirement: Show the current database
The system SHALL provide `db` that prints the name of the current database. A fresh install SHALL use the name `memos`.

#### Scenario: Default
- **WHEN** the user runs `db` on a new install
- **THEN** the terminal prints `memos`

### Requirement: List databases
The system SHALL provide `db ls` that prints the names of all databases of this app in this browser and marks the current one.

#### Scenario: Two databases
- **WHEN** databases `memos` and `exam` exist and `memos` is current
- **THEN** both names are printed and `memos` is marked as current

### Requirement: Switch database
The system SHALL provide `db use <name>` that makes `<name>` the current database, creating it when it does not exist. The session path MUST be reset to the root, and the choice MUST be remembered between sessions.

#### Scenario: Switch and see other data
- **WHEN** the user runs `db use exam`
- **THEN** `pwd` prints `/` and `ls` shows only what `exam` holds

#### Scenario: Remembered
- **WHEN** the page is reloaded after `db use exam`
- **THEN** the current database is still `exam`

#### Scenario: Bad name
- **WHEN** the name is empty or holds a character that a database name cannot have
- **THEN** the terminal prints an error and does not switch

### Requirement: Drop a database
The system SHALL provide `db drop <name>` that deletes a database with no confirmation. It MUST refuse to delete the current database and MUST refuse to delete the last remaining database. Each refusal SHALL be its own check and say why.

#### Scenario: Current database
- **WHEN** the user runs `db drop memos` while `memos` is current
- **THEN** the terminal prints an error telling to switch first with `db use` and nothing is deleted

#### Scenario: Last database
- **WHEN** only one database exists, even if the current name points to another one that was never created
- **THEN** `db drop` of that one is refused

#### Scenario: Other database
- **WHEN** the user drops a database that is neither the current one nor the last
- **THEN** it is deleted and `db ls` no longer shows it

### Requirement: The fate of drop
The existing `drop` SHALL keep erasing the data of the **current** database and leaving it open and empty, and SHALL be documented in `help` as "wipe the current database", distinct from `db drop <name>`.

#### Scenario: Wipe
- **WHEN** the user runs `drop`
- **THEN** the current database is empty and every command still works without a reload, the theme and font are kept

### Requirement: Self-test uses a scratch database
The `test` command SHALL run in a throw-away database and MUST NOT write into the user's real databases, and SHALL remove the scratch database when it ends, even when a check fails.

#### Scenario: Real data untouched
- **WHEN** `test` runs on a database that holds the user's decks
- **THEN** after it ends the decks are unchanged and no scratch database remains
