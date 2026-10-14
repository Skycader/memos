import { Injectable } from '@angular/core';
import { CoreService } from '../../core/services/core.service';
import { db } from '../../database/services/db';

/** title of the directory `seed` creates */
export const SEED_TITLE = 'Demo';

interface Deck {
  icon: string;
  title: string;
  fields: string[];
  cards: string[][];
}

/**
 * The test data. Decks differ on purpose:
 * · French has 3 sides and 26 cards, so `ls` in it has 2 pages
 * · Capitals and Math have 2 sides and fit on one page
 */
const DECKS: Deck[] = [
  {
    icon: '🇫🇷',
    title: 'French',
    fields: ['Original', 'Transcription', 'Translation'],
    cards: [
      ['le chat', '/lə ʃa/', 'cat'],
      ['le chien', '/lə ʃjɛ̃/', 'dog'],
      ['la maison', '/la mɛzɔ̃/', 'house'],
      ["l'eau", '/lo/', 'water'],
      ['le pain', '/lə pɛ̃/', 'bread'],
      ['le livre', '/lə livʁ/', 'book'],
      ['la voiture', '/la vwatyʁ/', 'car'],
      ["l'ami", '/lami/', 'friend'],
      ['la famille', '/la famij/', 'family'],
      ['manger', '/mɑ̃ʒe/', 'to eat'],
      ['boire', '/bwaʁ/', 'to drink'],
      ['parler', '/paʁle/', 'to speak'],
      ['aller', '/ale/', 'to go'],
      ['avoir', '/avwaʁ/', 'to have'],
      ['être', '/ɛtʁ/', 'to be'],
      ['grand', '/ɡʁɑ̃/', 'big'],
      ['petit', '/pəti/', 'small'],
      ['rouge', '/ʁuʒ/', 'red'],
      ['bonjour', '/bɔ̃ʒuʁ/', 'hello'],
      ['merci', '/mɛʁsi/', 'thank you'],
      ["s'il vous plaît", '/sil vu plɛ/', 'please'],
      ['demain', '/dəmɛ̃/', 'tomorrow'],
      ['toujours', '/tuʒuʁ/', 'always'],
      ['beaucoup', '/boku/', 'a lot'],
      ['la fenêtre', '/la fənɛtʁ/', 'window'],
      ['le soleil', '/lə sɔlɛj/', 'sun'],
    ],
  },
  {
    icon: '🌍',
    title: 'Capitals',
    fields: ['Country', 'Capital'],
    cards: [
      ['France', 'Paris'],
      ['Germany', 'Berlin'],
      ['Italy', 'Rome'],
      ['Spain', 'Madrid'],
      ['Portugal', 'Lisbon'],
      ['Poland', 'Warsaw'],
      ['Japan', 'Tokyo'],
      ['Canada', 'Ottawa'],
      ['Brazil', 'Brasília'],
      ['Australia', 'Canberra'],
      ['Egypt', 'Cairo'],
      ['Norway', 'Oslo'],
    ],
  },
  {
    icon: '➗',
    title: 'Math',
    fields: ['Question', 'Answer'],
    cards: [
      ['7 × 8', '56'],
      ['12 × 12', '144'],
      ['√144', '12'],
      ['15% of 200', '30'],
      ['2^10', '1024'],
      ['9²', '81'],
      ['100 / 8', '12.5'],
      ['π (5 digits)', '3.1415'],
    ],
  },
];

@Injectable({
  providedIn: 'root',
})
export class SeedService {
  /**
   * Test data for trying things out: a directory with three decks in it.
   * Used by the `seed` terminal command
   */
  constructor(private core: CoreService) {}

  /**
   * Create the directory "Demo" with its decks and cards inside `owner`.
   * All or nothing: one transaction
   * @throws Error if "Demo" already exists there
   */
  public async run(owner: string): Promise<{ id: string; dirs: number; cards: number }> {
    const existing = (await this.core.lsdir(owner, 0)).find((dir) => dir.title === SEED_TITLE);
    if (existing)
      throw new Error(
        `"${SEED_TITLE}" already exists here (id ${existing.id}), remove it first: rmdir ${existing.id}`
      );

    return await db.transaction('rw', db.directory, db.card, async () => {
      const demo = String(await this.core.mkdir(owner, '🧪', SEED_TITLE, ['Front', 'Back']));
      let cards = 0;
      for (const deck of DECKS) {
        const id = String(await this.core.mkdir(demo, deck.icon, deck.title, deck.fields));
        for (const sides of deck.cards) {
          await this.core.touch(sides, id);
          cards++;
        }
      }
      return { id: demo, dirs: 1 + DECKS.length, cards };
    });
  }
}
