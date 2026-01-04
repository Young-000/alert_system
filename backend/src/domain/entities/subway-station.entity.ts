export class SubwayStation {
  constructor(
    public readonly name: string,
    public readonly line: string,
    public readonly code?: string,
    public readonly id?: string
  ) {}
}
