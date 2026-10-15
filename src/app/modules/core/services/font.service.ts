import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

/**
 * Fonts the terminal can use: the name typed in `font <name>`.
 * `default` is the browser's own monospace font. Every other name needs its
 * @font-face and a [data-font] rule in styles.scss
 */
export const FONTS = ['default', 'JetBrainsMono'] as const;
export type Font = (typeof FONTS)[number];

const STORAGE_KEY = 'memos.font';

@Injectable({
  providedIn: 'root',
})
export class FontService {
  /**
   * Font of the terminal
   * Works like the theme: the font is a data-font attribute on <html>,
   * the CSS variable --font does the rest, and the choice is remembered
   */
  public current: Font = 'default';

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.apply(this.load());
  }

  /**
   * Switch the font and remember the choice
   */
  public set(font: Font) {
    this.apply(font);
    try {
      localStorage.setItem(STORAGE_KEY, font);
    } catch {
      /** no storage (private mode, server side): the font just won't be remembered */
    }
  }

  /**
   * Find a font by the typed name, ignoring case: jetbrainsmono works too
   */
  public find(name: string | undefined): Font | undefined {
    return FONTS.find((font) => font.toLowerCase() === name?.toLowerCase());
  }

  private apply(font: Font) {
    this.current = font;
    this.document.documentElement.setAttribute('data-font', font);
  }

  private load(): Font {
    try {
      return this.find(localStorage.getItem(STORAGE_KEY) ?? undefined) ?? 'default';
    } catch {
      /** no storage: the default */
      return 'default';
    }
  }
}
