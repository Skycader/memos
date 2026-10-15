/**
 * CSV, written by hand so the project needs no library for it.
 * Follows RFC 4180: a cell that has a comma, a quote or a line break is wrapped in
 * double quotes and a quote inside is doubled. Records are separated by \n when
 * written; \n, \r\n and \r are all understood when read. No BOM, plain UTF-8.
 */

/**
 * Turn rows of cells into CSV text (every record ends with a line break)
 */
export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(cell).join(',')).join('\n') + '\n';
}

function cell(value: string): string {
  return /[",\r\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
}

/**
 * Turn CSV text into rows of cells
 * · blank lines are skipped
 * · the last record may have no final line break
 * · a quote in the middle of an unquoted cell is just a character
 * @throws Error if a quoted cell is never closed
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;
  /** nothing of the current cell was read yet, so a quote here opens a quoted cell */
  let atStart = true;

  const endRecord = () => {
    /** a record with nothing in it at all is a blank line */
    if (row.length === 0 && current === '' && atStart) return;
    row.push(current);
    rows.push(row);
    row = [];
    current = '';
    atStart = true;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch !== '"') current += ch;
      else if (text[i + 1] === '"') {
        current += '"';
        i++;
      } else inQuotes = false;
    } else if (ch === '"' && atStart) {
      inQuotes = true;
      atStart = false;
    } else if (ch === ',') {
      row.push(current);
      current = '';
      atStart = true;
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      endRecord();
    } else {
      current += ch;
      atStart = false;
    }
  }

  if (inQuotes) throw new Error('A quoted cell is never closed');
  endRecord();
  return rows;
}
