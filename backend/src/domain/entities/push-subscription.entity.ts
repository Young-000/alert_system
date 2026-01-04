export class PushSubscription {
  constructor(
    public readonly userId: string,
    public readonly endpoint: string,
    public readonly keys: {
      p256dh: string;
      auth: string;
    },
    public readonly id?: string
  ) {}
}
