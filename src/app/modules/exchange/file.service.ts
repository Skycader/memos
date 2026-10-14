import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  /**
   * Files in the browser. A web page can not read or write the disk by path,
   * so a file is saved with a download and loaded with the file picker.
   */
  constructor(@Inject(DOCUMENT) private document: Document) {}

  /**
   * Save text as a file: the browser downloads it.
   * A Blob made from a string is UTF-8 without a BOM
   */
  public download(name: string, text: string, type = 'text/csv;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = this.document.createElement('a');
    link.href = url;
    link.download = name;
    link.style.display = 'none';
    this.document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  /**
   * Let the user choose a file and read it as text
   * (must be called right after the user's action, browsers refuse a picker otherwise)
   * @returns null if the user closed the picker without choosing
   */
  public pick(accept: string): Promise<{ name: string; text: string } | null> {
    return new Promise((resolve) => {
      const input = this.document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.style.display = 'none';

      let done = false;
      const finish = (result: { name: string; text: string } | null) => {
        if (done) return;
        done = true;
        window.removeEventListener('focus', onFocus);
        input.remove();
        resolve(result);
      };

      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        finish(file ? { name: file.name, text: await file.text() } : null);
      });
      input.addEventListener('cancel', () => finish(null));

      /**
       * Older browsers send no cancel event: when the window gets focus back and
       * still nothing was chosen, the picker was closed
       */
      const onFocus = () =>
        setTimeout(() => {
          if (!done && !input.files?.length) finish(null);
        }, 1000);
      window.addEventListener('focus', onFocus);

      this.document.body.appendChild(input);
      input.click();
    });
  }
}
