export function debug() {
  /**
   * Access all properties and methods of the app
   */
  window.memos = window.ng.getComponent(document.querySelector('app-root'));

  /**
   * Enhance Promise with additional log information
   */
  window.Promise.prototype.log = function (res: any) {
    return this.then((res: any) => console.log(res));
  };

  /**
   * Enhance string with a method to get a word by index
   */
  window.String.prototype.at = function at(position: number) {
    return this.split(' ').at(position);
  };
}
