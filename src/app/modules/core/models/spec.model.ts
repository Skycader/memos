export interface CardSPEC {
  /**
   * status of [[1],[0]] -> would be side 0 is repeated with side 1, and side 1 is repeated with side 0
   */
  status: number[][];
  /**
   * qfields -> question only fields -> means a side won't be needed to type in, but keep a question
   */
  qfields: number[];
}
