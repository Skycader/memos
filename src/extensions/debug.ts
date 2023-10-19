export function debug() {
  /**
   * Access all properties and methods of the app
   */
  (window as any).root = (window as any).ng.getComponent(
    document.querySelector('app-root')
  );

  (window as any).Promise.prototype.log = function (res: any) {
    return this.then((res: any) => console.log(res));
  };
}
