export class BusStop {
  constructor(
    public readonly stopNo: string,
    public readonly name: string,
    public readonly nodeId: string,
    public readonly stopType: string,
    public readonly x?: number,
    public readonly y?: number,
    public readonly id?: string,
  ) {}
}
