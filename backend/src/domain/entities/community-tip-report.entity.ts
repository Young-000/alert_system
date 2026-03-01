export class CommunityTipReport {
  readonly id: string;
  readonly tipId: string;
  readonly reporterId: string;
  readonly createdAt: Date;

  constructor(options: {
    id?: string;
    tipId: string;
    reporterId: string;
    createdAt?: Date;
  }) {
    this.id = options.id || '';
    this.tipId = options.tipId;
    this.reporterId = options.reporterId;
    this.createdAt = options.createdAt ?? new Date();
  }
}
