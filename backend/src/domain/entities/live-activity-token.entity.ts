import { v4 as uuidv4 } from 'uuid';

export type LiveActivityMode = 'commute' | 'return';

export class LiveActivityToken {
  readonly id: string;
  readonly userId: string;
  readonly activityId: string;
  readonly pushToken: string;
  readonly mode: LiveActivityMode;
  readonly settingId: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(
    userId: string,
    activityId: string,
    pushToken: string,
    mode: LiveActivityMode,
    options?: {
      id?: string;
      settingId?: string | null;
      isActive?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) {
    this.id = options?.id || uuidv4();
    this.userId = userId;
    this.activityId = activityId;
    this.pushToken = pushToken;
    this.mode = mode;
    this.settingId = options?.settingId ?? null;
    this.isActive = options?.isActive ?? true;
    this.createdAt = options?.createdAt || new Date();
    this.updatedAt = options?.updatedAt || new Date();
  }

  static create(
    userId: string,
    activityId: string,
    pushToken: string,
    mode: LiveActivityMode,
    settingId?: string,
  ): LiveActivityToken {
    if (!activityId || activityId.trim() === '') {
      throw new Error('activityId is required');
    }
    if (!pushToken || pushToken.trim() === '') {
      throw new Error('pushToken is required');
    }
    if (mode !== 'commute' && mode !== 'return') {
      throw new Error(`Invalid mode: ${mode}. Must be 'commute' or 'return'`);
    }

    return new LiveActivityToken(userId, activityId, pushToken, mode, {
      settingId: settingId ?? null,
      isActive: true,
    });
  }

  deactivate(): LiveActivityToken {
    return new LiveActivityToken(
      this.userId,
      this.activityId,
      this.pushToken,
      this.mode,
      {
        id: this.id,
        settingId: this.settingId,
        isActive: false,
        createdAt: this.createdAt,
        updatedAt: new Date(),
      },
    );
  }

  updatePushToken(newToken: string): LiveActivityToken {
    return new LiveActivityToken(
      this.userId,
      this.activityId,
      newToken,
      this.mode,
      {
        id: this.id,
        settingId: this.settingId,
        isActive: this.isActive,
        createdAt: this.createdAt,
        updatedAt: new Date(),
      },
    );
  }
}
