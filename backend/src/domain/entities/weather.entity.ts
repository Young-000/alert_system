export class Weather {
  constructor(
    public readonly location: string,
    public readonly temperature: number,
    public readonly condition: string,
    public readonly humidity: number,
    public readonly windSpeed: number
  ) {}
}

