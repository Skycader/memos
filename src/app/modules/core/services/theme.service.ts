import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'memos.theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  /**
   * Color theme of the whole app
   * Colors live in CSS variables (see styles.scss), the theme is just
   * a data-theme attribute on <html>, remembered between sessions
   */
  public current: Theme = 'light';

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.apply(this.load());
  }

  /**
   * Switch the theme and remember the choice
   */
  public set(theme: Theme) {
    this.apply(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /** no storage (private mode, server side): the theme just won't be remembered */
    }
  }

  public isTheme(value: string | undefined): value is Theme {
    return value === 'light' || value === 'dark';
  }

  private apply(theme: Theme) {
    this.current = theme;
    this.document.documentElement.setAttribute('data-theme', theme);
  }

  private load(): Theme {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) ?? undefined;
      if (this.isTheme(saved)) return saved;
    } catch {
      /** no storage: fall through to the default */
    }
    return 'light';
  }
}
