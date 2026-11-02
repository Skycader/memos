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
const LINE_KEY = 'memos.line';

/** The space between lines is a plain number (the CSS line-height): 1 is tight, 2 is airy */
export const LINE_DEFAULT = 1.25;
export const LINE_MIN = 1;
export const LINE_MAX = 3;

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

  /** Space between the lines of the terminal (line-height), set by `font line` */
  public line = LINE_DEFAULT;

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.apply(this.load());
    this.applyLine(this.loadLine());
  }

  /**
   * Set the space between lines and remember it. The caller checks the value with parseLine
   */
  public setLine(line: number) {
    this.applyLine(line);
    try {
      localStorage.setItem(LINE_KEY, String(line));
    } catch {
      /** no storage: the value just won't be remembered */
    }
  }

  /**
   * The typed value as a number, or undefined when it is not a number from LINE_MIN to LINE_MAX.
   * `default` is the standard space; a comma works as a point (1,5)
   */
  public parseLine(text: string | undefined): number | undefined {
    if (text?.toLowerCase() === 'default') return LINE_DEFAULT;
    if (text === undefined || !/^\d+([.,]\d+)?$/.test(text)) return undefined;
    const value = Number(text.replace(',', '.'));
    return value >= LINE_MIN && value <= LINE_MAX ? value : undefined;
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

  private applyLine(line: number) {
    this.line = line;
    this.document.documentElement.style.setProperty('--line', String(line));
  }

  private loadLine(): number {
    try {
      return this.parseLine(localStorage.getItem(LINE_KEY) ?? undefined) ?? LINE_DEFAULT;
    } catch {
      return LINE_DEFAULT;
    }
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
