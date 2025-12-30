export class BusArrival {
  constructor(
    public readonly stopId: string,
    public readonly routeId: string,
    public readonly routeName: string,
    public readonly arrivalTime: number,
    public readonly remainingStops: number
  ) {}
}

