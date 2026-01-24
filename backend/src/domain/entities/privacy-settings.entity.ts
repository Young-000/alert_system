/**
 * Privacy settings for user behavior tracking
 */
export interface PrivacySettings {
  tracking: {
    /** Track notification interactions (required for core functionality) */
    notificationInteractions: boolean;
    /** Track departure confirmations (optional, for pattern learning) */
    departureConfirmation: boolean;
    /** Track route usage preferences (optional) */
    routeUsage: boolean;
  };
  retention: {
    /** Maximum days to keep behavior events (default: 90) */
    behaviorEventsMaxDays: number;
    /** Maximum days to keep commute records (default: 180) */
    commuteRecordsMaxDays: number;
  };
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  tracking: {
    notificationInteractions: true, // Required
    departureConfirmation: true,
    routeUsage: false,
  },
  retention: {
    behaviorEventsMaxDays: 90,
    commuteRecordsMaxDays: 180,
  },
};

export class UserPrivacySettings {
  public readonly userId: string;
  public settings: PrivacySettings;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(userId: string, settings?: Partial<PrivacySettings>) {
    this.userId = userId;
    this.settings = {
      tracking: {
        ...DEFAULT_PRIVACY_SETTINGS.tracking,
        ...settings?.tracking,
      },
      retention: {
        ...DEFAULT_PRIVACY_SETTINGS.retention,
        ...settings?.retention,
      },
    };
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  updateSettings(settings: Partial<PrivacySettings>): void {
    if (settings.tracking) {
      this.settings.tracking = {
        ...this.settings.tracking,
        ...settings.tracking,
        // notificationInteractions is always true (required)
        notificationInteractions: true,
      };
    }
    if (settings.retention) {
      this.settings.retention = {
        ...this.settings.retention,
        ...settings.retention,
      };
    }
    this.updatedAt = new Date();
  }

  isTrackingEnabled(type: keyof PrivacySettings['tracking']): boolean {
    return this.settings.tracking[type];
  }
}
