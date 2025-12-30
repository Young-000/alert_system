export class AirQuality {
  constructor(
    public readonly location: string,
    public readonly pm10: number,
    public readonly pm25: number,
    public readonly aqi: number,
    public readonly status: string
  ) {}
}

