export {};

declare global {
  interface Window {
    openDatabase: (
      name: string,
      version: string,
      description: string,
      expiresIn: number
    ) => {};

    ng: any;
    memos: any;

    Promise: any;
  }
}
