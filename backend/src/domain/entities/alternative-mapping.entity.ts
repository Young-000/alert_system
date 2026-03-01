export class AlternativeMapping {
  readonly id: string;
  readonly fromStationName: string;
  readonly fromLine: string;
  readonly toStationName: string;
  readonly toLine: string;
  readonly walkingMinutes: number;
  readonly walkingDistanceMeters?: number;
  readonly description?: string;
  readonly isBidirectional: boolean;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(
    fromStationName: string,
    fromLine: string,
    toStationName: string,
    toLine: string,
    walkingMinutes: number,
    options?: {
      id?: string;
      walkingDistanceMeters?: number;
      description?: string;
      isBidirectional?: boolean;
      isActive?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) {
    this.id = options?.id || '';
    this.fromStationName = fromStationName;
    this.fromLine = fromLine;
    this.toStationName = toStationName;
    this.toLine = toLine;
    this.walkingMinutes = walkingMinutes;
    this.walkingDistanceMeters = options?.walkingDistanceMeters;
    this.description = options?.description;
    this.isBidirectional = options?.isBidirectional ?? true;
    this.isActive = options?.isActive ?? true;
    this.createdAt = options?.createdAt || new Date();
    this.updatedAt = options?.updatedAt || new Date();
  }

  /**
   * Check if this mapping matches a given station/line (including bidirectional reverse).
   */
  matchesStation(stationName: string, line: string): boolean {
    const forwardMatch =
      this.fromStationName === stationName && this.fromLine === line;
    const reverseMatch =
      this.isBidirectional &&
      this.toStationName === stationName &&
      this.toLine === line;
    return forwardMatch || reverseMatch;
  }

  /**
   * Get the alternative station info for a given source station.
   * Returns the "other side" of the mapping.
   */
  getAlternativeFor(stationName: string, line: string): {
    stationName: string;
    line: string;
    walkingMinutes: number;
    walkingDistanceMeters?: number;
    description?: string;
  } | null {
    if (this.fromStationName === stationName && this.fromLine === line) {
      return {
        stationName: this.toStationName,
        line: this.toLine,
        walkingMinutes: this.walkingMinutes,
        walkingDistanceMeters: this.walkingDistanceMeters,
        description: this.description,
      };
    }
    if (
      this.isBidirectional &&
      this.toStationName === stationName &&
      this.toLine === line
    ) {
      return {
        stationName: this.fromStationName,
        line: this.fromLine,
        walkingMinutes: this.walkingMinutes,
        walkingDistanceMeters: this.walkingDistanceMeters,
        description: this.description,
      };
    }
    return null;
  }
}
