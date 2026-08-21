export class BusArrival {
  constructor(
    public readonly stopId: string,
    public readonly routeId: string,
    public readonly routeName: string,
    /** 도착까지 남은 시간 — 단위는 **초**. API 클라이언트가 "N분 M초"를 초로 환산해 채운다. */
    public readonly arrivalTime: number,
    public readonly remainingStops: number
  ) {}
}

