export interface CardSPEC {
  /**
   * status of [[1],[0]] -> would be side 0 is repeated with side 1, and side 1 is repeated with side 0
   */
  status: number[][];
  /**
   * qfields -> question only fields -> means a side won't be needed to type in, but keep a question
   */
  qfields?: number[];
  /**
   * When the card was made (ms). The age of a card on the screen of `ask` counts from it.
   * Cards made before it was kept have none, see bornOf in repeat/schedule.ts
   */
  born?: number;
  /**
   * Max interval
   */
  maxInterval?: number;
}
