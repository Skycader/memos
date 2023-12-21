export interface ITX {
  executeSql: (
    query: string,
    values: string[],
    func1: (tx: ITX, results: any) => void,
    func2: (tx: ITX, results: any) => void
  ) => {};
}
