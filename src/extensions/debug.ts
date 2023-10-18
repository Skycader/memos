export function debug() {
  /**
   * Access all properties and methods of the app
   */
  (window as any).root = (window as any).ng.getComponent(
    document.querySelector('app-root')
  );
}
