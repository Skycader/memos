import { Injectable } from '@angular/core';
import { MathService } from '../../math/services/math.service';
import { Card, db } from '../../database/services/db';

/**
 * A directory whose owner does not exist (the root of a hanging subtree)
 */
export interface OrphanDir {
  id: string;
  title: string;
  owner: string;
  /** directories below it, not counting itself */
  subdirs: number;
  /** cards in it and in all directories below */
  cards: number;
}

export interface DoctorScan {
  /** roots of hanging subtrees */
  orphanDirs: OrphanDir[];
  /** cards whose own directory does not exist */
  orphanCards: Card[];
  /** cards lying in root, which is against the rules, but they are not orphans */
  rootCards: Card[];
  /** all directories that hang: roots of hanging subtrees plus everything below */
  dirsTotal: number;
  /** all cards that hang: orphan cards plus cards inside hanging subtrees */
  cardsTotal: number;
}

export const LOST_FOUND = 'lost+found';

@Injectable({
  providedIn: 'root',
})
export class DoctorService {
  /**
   * Looks for directories and cards hanging in a vacuum,
   * for example left behind by a removal that was interrupted.
   * Triggered by the `doctor` terminal command.
   */
  constructor(private math: MathService) {}

  /**
   * Run `doctor` or `doctor fix` and return a printable message
   */
  public async run(fix: boolean): Promise<string> {
    const scan = await this.scan();
    const found = scan.dirsTotal + scan.cardsTotal > 0;
    const lines: string[] = [];

    if (!fix) {
      if (!found) lines.push('✔ Database is healthy: no orphans found');
      else {
        lines.push(
          `Orphans found: ${scan.dirsTotal} director${scan.dirsTotal === 1 ? 'y' : 'ies'}, ${scan.cardsTotal} card${scan.cardsTotal === 1 ? '' : 's'}`
        );
        lines.push(...this.describe(scan));
      }
      lines.push(...this.warnings(scan));
      if (found) lines.push(`Run "doctor fix" to move them to /${LOST_FOUND}`);
      return lines.join('\n');
    }

    if (!found) {
      lines.push('✔ Nothing to fix: no orphans found');
    } else {
      const moved = await this.moveToLostFound(scan);
      lines.push(
        `Moved to /${LOST_FOUND}: ${moved.dirs} hanging director${moved.dirs === 1 ? 'y' : 'ies'} (with everything inside) and ${moved.cards} hanging card${moved.cards === 1 ? '' : 's'}`
      );
    }
    lines.push(...this.warnings(scan));
    return lines.join('\n');
  }

  /**
   * Read-only check of the whole database
   */
  public async scan(): Promise<DoctorScan> {
    return await db.transaction('r', db.directory, db.card, async () => {
      const dirs = await db.directory.toArray();
      const cards = await db.card.toArray();

      const dirIds = new Set(dirs.map((dir) => dir.id));
      const children = new Map<string, string[]>();
      for (const dir of dirs) {
        const list = children.get(dir.owner) ?? [];
        list.push(dir.id);
        children.set(dir.owner, list);
      }
      const cardsIn = new Map<string, number>();
      for (const card of cards) {
        cardsIn.set(card.owner, (cardsIn.get(card.owner) ?? 0) + 1);
      }

      const orphanDirs: OrphanDir[] = [];
      let dirsTotal = 0;
      let cardsInTrees = 0;

      for (const dir of dirs) {
        if (dir.owner === '/' || dirIds.has(dir.owner)) continue;

        /**
         * dir is the root of a hanging subtree: walk down to count its content
         */
        const tree = new Set<string>([dir.id]);
        let level = [dir.id];
        while (level.length > 0) {
          const next: string[] = [];
          for (const id of level) {
            for (const child of children.get(id) ?? []) {
              if (!tree.has(child)) {
                tree.add(child);
                next.push(child);
              }
            }
          }
          level = next;
        }

        let cardCount = 0;
        tree.forEach((id) => (cardCount += cardsIn.get(id) ?? 0));
        orphanDirs.push({
          id: dir.id,
          title: dir.title,
          owner: dir.owner,
          subdirs: tree.size - 1,
          cards: cardCount,
        });
        dirsTotal += tree.size;
        cardsInTrees += cardCount;
      }

      const orphanCards = cards.filter(
        (card) => card.owner !== '/' && !dirIds.has(card.owner)
      );
      const rootCards = cards.filter((card) => card.owner === '/');

      return {
        orphanDirs,
        orphanCards,
        rootCards,
        dirsTotal,
        cardsTotal: orphanCards.length + cardsInTrees,
      };
    });
  }

  /**
   * Id of /lost+found, if it exists
   */
  public async findLostFound(): Promise<string | null> {
    const found = await db.directory
      .where('owner')
      .equals('/')
      .filter((dir) => dir.title === LOST_FOUND)
      .first();
    return found ? found.id : null;
  }

  /**
   * Move everything the scan found into /lost+found (created if missing).
   * Nothing is deleted: hanging directories keep their content, hanging cards keep their data.
   * Runs in one transaction and re-checks every item before moving it.
   * @returns how many hanging directories (roots of subtrees) and cards were moved
   */
  public async moveToLostFound(scan: DoctorScan) {
    return await db.transaction('rw', db.directory, db.card, async () => {
      let lostFound = await this.findLostFound();
      if (lostFound === null) {
        let id = this.math.makeId(4);
        while ((await db.directory.get(id as any)) !== undefined) {
          id = this.math.makeId(4);
        }
        await db.directory.add({
          id,
          owner: '/',
          icon: '🗄',
          title: LOST_FOUND,
          fields: [],
        });
        lostFound = id;
      }

      const exists = async (id: string) =>
        (await db.directory.get(id as any)) !== undefined;

      let dirs = 0;
      for (const orphan of scan.orphanDirs) {
        const current = await db.directory.get(orphan.id as any);
        if (!current || current.owner === '/' || (await exists(current.owner))) continue;
        await db.directory.update(orphan.id as any, { owner: lostFound });
        dirs++;
      }

      let cards = 0;
      for (const orphan of scan.orphanCards) {
        const current = await db.card.get(orphan.id as any);
        if (!current || current.owner === '/' || (await exists(current.owner))) continue;
        await db.card.update(orphan.id as any, { owner: lostFound });
        cards++;
      }

      return { dirs, cards };
    });
  }

  /**
   * Lines describing found orphans, the first 10 of each kind
   */
  private describe(scan: DoctorScan): string[] {
    const limit = 10;
    const lines: string[] = [];

    scan.orphanDirs.slice(0, limit).forEach((dir) => {
      lines.push(
        `  ✖ dir ${dir.id} "${dir.title}" — owner ${dir.owner} is missing (${dir.subdirs} subdirs, ${dir.cards} cards inside)`
      );
    });
    if (scan.orphanDirs.length > limit)
      lines.push(`  … and ${scan.orphanDirs.length - limit} more hanging directories`);

    scan.orphanCards.slice(0, limit).forEach((card) => {
      lines.push(`  ✖ card ${card.id} — owner ${card.owner} is missing`);
    });
    if (scan.orphanCards.length > limit)
      lines.push(`  … and ${scan.orphanCards.length - limit} more hanging cards`);

    return lines;
  }

  private warnings(scan: DoctorScan): string[] {
    if (scan.rootCards.length === 0) return [];
    return [
      `⚠ ${scan.rootCards.length} card${scan.rootCards.length === 1 ? '' : 's'} lying in root (cards belong in directories; "doctor fix" does not touch them)`,
    ];
  }
}
