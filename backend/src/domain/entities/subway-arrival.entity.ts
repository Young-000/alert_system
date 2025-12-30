export class SubwayArrival {
  constructor(
    public readonly stationId: string,
    public readonly lineId: string,
    public readonly direction: string,
    public readonly arrivalTime: number,
    public readonly destination: string
  ) {}
}

