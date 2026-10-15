import { Injectable } from '@angular/core';
import { Card, db, Directory } from '../database/services/db';
import { MathService } from '../math/services/math.service';
import { parseCsv, toCsv } from './csv';

/** the first cell of the first row, and the version of the layout of the file */
const FORMAT = 'memos';
const VERSION = '1';

export interface ExportResult {
  text: string;
  dirs: number;
  cards: number;
  /** cards lying in the root: against the rules, not exported */
  rootCards: number;
  /** directories and cards that hang without a parent: not reachable, not exported */
  hangingDirs: number;
  hangingCards: number;
}

export interface ImportReport {
  dirsCreated: number;
  dirsMerged: number;
  cardsAdded: number;
  /** cards that were already there (same sides in the same directory) */
  cardsSkipped: number;
  warnings: string[];
}

/** thrown on purpose to roll back a dry run, compared by identity */
const DRY_RUN = new Error('dry run');

@Injectable({
  providedIn: 'root',
})
export class ExchangeService {
  /**
   * Export and import of the current database as one CSV file.
   * The layout is described in docs/exchange.md
   *
   *   memos,1,<database>,<time>                                  format row
   *   dir,<path>,<icon>,<field>,<field>,...                      a directory
   *   card,<path>,<next>,<prev>,<spec as JSON>,<side>,<side>,... a card, with its progress
   *
   * <path> is the directory with / between names (French/Verbs). A title can not contain /,
   * so a path is never ambiguous.
   */
  constructor(private math: MathService) {}

  /**
   * <database>-<date>.csv, the date is the local day: memos-2026-10-14.csv
   */
  public fileName(date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    return `${db.name}-${day}.csv`;
  }

  /**
   * The whole current database, as CSV text. Directories go depth first, sorted by title,
   * so the same data always gives the same file (up to the time in the first row)
   */
  public async exportCsv(): Promise<ExportResult> {
    return await db.transaction('r', db.directory, db.card, async () => {
      const dirs = await db.directory.toArray();
      const cards = await db.card.toArray();

      const children = new Map<string, Directory[]>();
      for (const dir of dirs) children.set(dir.owner, [...(children.get(dir.owner) ?? []), dir]);
      const cardsIn = new Map<string, Card[]>();
      for (const card of cards) cardsIn.set(card.owner, [...(cardsIn.get(card.owner) ?? []), card]);

      const rows: string[][] = [[FORMAT, VERSION, db.name, new Date().toISOString()]];
      let dirCount = 0;
      let cardCount = 0;
      const seen = new Set<string>();

      const walk = (owner: string, parentPath: string) => {
        const level = (children.get(owner) ?? []).sort((a, b) => a.title.localeCompare(b.title));
        for (const dir of level) {
          if (seen.has(dir.id)) continue;
          seen.add(dir.id);
          const path = parentPath ? `${parentPath}/${dir.title}` : dir.title;
          rows.push(['dir', path, dir.icon, ...dir.fields]);
          dirCount++;
          for (const card of cardsIn.get(dir.id) ?? []) {
            rows.push([
              'card',
              path,
              String(card.next),
              String(card.prev),
              JSON.stringify(card.spec),
              ...card.contents,
            ]);
            cardCount++;
          }
          walk(dir.id, path);
        }
      };
      walk('/', '');

      const rootCards = cardsIn.get('/')?.length ?? 0;
      return {
        text: toCsv(rows),
        dirs: dirCount,
        cards: cardCount,
        rootCards,
        hangingDirs: dirs.length - dirCount,
        hangingCards: cards.length - cardCount - rootCards,
      };
    });
  }

  /**
   * Put the contents of a file into the current database.
   * · everything gets new ids
   * · a directory that already exists is merged into, it is not replaced
   * · a card with the same sides as one already in that directory is skipped
   * · all or nothing: it is one transaction, a failure leaves the database as it was
   * @param dryRun do everything, report, and roll back
   * @throws Error if the file is not a Memos CSV (nothing is written then)
   */
  public async importCsv(text: string, dryRun = false): Promise<ImportReport> {
    const rows = this.check(text);
    const report: ImportReport = {
      dirsCreated: 0,
      dirsMerged: 0,
      cardsAdded: 0,
      cardsSkipped: 0,
      warnings: [],
    };
    let rootCards = 0;
    let lostCards = 0;
    let oddSides = 0;
    let brokenSpecs = 0;

    try {
      await db.transaction('rw', db.directory, db.card, async () => {
        /** path -> directory id, '' is the root */
        const known = new Map<string, string>([['', '/']]);

        const find = async (path: string): Promise<string | undefined> => {
          if (known.has(path)) return known.get(path);
          const cut = path.lastIndexOf('/');
          const owner = await find(cut === -1 ? '' : path.slice(0, cut));
          if (owner === undefined) return undefined;
          const title = path.slice(cut + 1);
          const found = await db.directory
            .where('[owner+title]')
            .equals([owner, title])
            .first();
          if (found) known.set(path, found.id);
          return found?.id;
        };

        const create = async (path: string, icon: string, fields: string[]): Promise<string> => {
          const cut = path.lastIndexOf('/');
          const parent = cut === -1 ? '' : path.slice(0, cut);
          /** a parent that has no row of its own is created plainly */
          const owner = (await find(parent)) ?? (await create(parent, '📁', []));
          const id = await this.freeId('directory');
          await db.directory.add({ id, owner, icon, title: path.slice(cut + 1), fields });
          known.set(path, id);
          report.dirsCreated++;
          return id;
        };

        const sides = new Map<string, number>();
        const keys = new Map<string, Set<string>>();

        for (const row of rows.slice(1)) {
          if (row[0] === 'dir') {
            const [, path, icon, ...fields] = row;
            if ((await find(path)) !== undefined) report.dirsMerged++;
            else await create(path, icon, fields);
            continue;
          }

          const [, path, next, prev, specJson, ...contents] = row;
          if (path === '') {
            rootCards++;
            continue;
          }
          const owner = await find(path);
          if (owner === undefined) {
            lostCards++;
            continue;
          }

          if (!keys.has(owner)) {
            const cards = await db.card.where('owner').equals(owner).toArray();
            keys.set(owner, new Set(cards.map((card) => JSON.stringify(card.contents))));
            sides.set(owner, (await db.directory.get(owner as any))?.fields.length ?? 0);
          }
          const key = JSON.stringify(contents);
          if (keys.get(owner)?.has(key)) {
            report.cardsSkipped++;
            continue;
          }

          if (sides.get(owner) !== contents.length) oddSides++;
          let spec = { status: contents.map(() => []) } as Card['spec'];
          try {
            const parsed = JSON.parse(specJson);
            if (Array.isArray(parsed?.status) && parsed.status.length === contents.length)
              spec = parsed;
            else brokenSpecs++;
          } catch {
            brokenSpecs++;
          }

          await db.card.add({
            id: await this.freeId('card'),
            owner,
            contents,
            next: this.number(next),
            prev: this.number(prev),
            spec,
          });
          keys.get(owner)?.add(key);
          report.cardsAdded++;
        }

        if (dryRun) throw DRY_RUN;
      });
    } catch (e) {
      if (e !== DRY_RUN) throw e;
    }

    const warn = (count: number, text: string) => {
      if (count > 0) report.warnings.push(`${count} ${text}`);
    };
    warn(rootCards, 'card(s) lying in root were skipped (cards belong in directories)');
    warn(lostCards, 'card(s) were skipped: their directory is neither in the file nor in the database');
    warn(oddSides, 'card(s) have a different number of sides than their directory');
    warn(brokenSpecs, 'card(s) had a broken progress record, it was reset');
    return report;
  }

  /**
   * A readable summary of an import
   */
  public describe(report: ImportReport, dryRun: boolean): string {
    const lines = [
      `${dryRun ? 'Would import' : 'Imported'}: ${report.dirsCreated} director${report.dirsCreated === 1 ? 'y' : 'ies'} created, ` +
        `${report.dirsMerged} merged; ${report.cardsAdded} card${report.cardsAdded === 1 ? '' : 's'} added, ` +
        `${report.cardsSkipped} skipped (already there)`,
    ];
    if (dryRun) lines.push('Dry run: nothing was written');
    for (const warning of report.warnings) lines.push(`⚠ ${warning}`);
    return lines.join('\n');
  }

  /**
   * Check the whole file before touching the database
   * @returns the rows, the first one is the format row
   */
  private check(text: string): string[][] {
    const rows = parseCsv(text);
    const head = rows[0];
    if (!head || head[0] !== FORMAT)
      throw new Error(`Not a Memos CSV file: the first row has to start with "${FORMAT}"`);
    if (head[1] !== VERSION) throw new Error(`Unsupported version of the file: "${head[1]}"`);

    rows.forEach((row, index) => {
      if (index === 0) return;
      const where = `Record ${index + 1}`;
      if (row[0] === 'dir') {
        if (row.length < 3) throw new Error(`${where}: a directory needs a path and an icon`);
        if (!this.pathIsValid(row[1])) throw new Error(`${where}: bad directory path "${row[1]}"`);
      } else if (row[0] === 'card') {
        if (row.length < 6)
          throw new Error(`${where}: a card needs next, prev, spec and at least one side`);
        if (row[1] !== '' && !this.pathIsValid(row[1]))
          throw new Error(`${where}: bad directory path "${row[1]}"`);
      } else {
        throw new Error(`${where}: unknown kind of record "${row[0]}"`);
      }
    });
    return rows;
  }

  private pathIsValid(path: string): boolean {
    return (
      path !== '' &&
      path.split('/').every((title) => title !== '' && title !== '.' && title !== '..')
    );
  }

  private number(value: string): number {
    return value !== '' && Number.isFinite(Number(value)) ? Number(value) : Date.now();
  }

  /**
   * An id nobody has yet (ids are random, so a collision is possible)
   */
  private async freeId(table: 'directory' | 'card'): Promise<string> {
    for (let attempt = 0; attempt < 100; attempt++) {
      const id = this.math.makeId(4);
      const taken =
        table === 'directory'
          ? await db.directory.get(id as any)
          : await db.card.get(id as any);
      if (taken === undefined) return id;
    }
    throw new Error(`Could not find a free ${table} id`);
  }
}
