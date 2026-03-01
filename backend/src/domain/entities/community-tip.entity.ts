const MAX_CONTENT_LENGTH = 100;
const AUTO_HIDE_REPORT_THRESHOLD = 3;
const DAILY_TIP_LIMIT = 3;

// Simple URL detection regex
const URL_PATTERN = /https?:\/\/|www\.|\.com|\.net|\.org|\.kr|\.io/i;

// Basic Korean profanity filter (common offensive words)
const PROFANITY_PATTERNS = [
  /시발/,
  /씨발/,
  /병신/,
  /지랄/,
  /꺼져/,
  /미친놈/,
  /미친년/,
  /개새끼/,
  /fuck/i,
  /shit/i,
  /damn/i,
  /bitch/i,
  /asshole/i,
];

export class CommunityTip {
  readonly id: string;
  readonly checkpointKey: string;
  readonly authorId: string;
  readonly content: string;
  readonly helpfulCount: number;
  readonly reportCount: number;
  readonly isHidden: boolean;
  readonly createdAt: Date;

  constructor(options: {
    id?: string;
    checkpointKey: string;
    authorId: string;
    content: string;
    helpfulCount?: number;
    reportCount?: number;
    isHidden?: boolean;
    createdAt?: Date;
  }) {
    this.id = options.id || '';
    this.checkpointKey = options.checkpointKey;
    this.authorId = options.authorId;
    this.content = options.content;
    this.helpfulCount = options.helpfulCount ?? 0;
    this.reportCount = options.reportCount ?? 0;
    this.isHidden = options.isHidden ?? false;
    this.createdAt = options.createdAt ?? new Date();
  }

  /**
   * Validate tip content.
   * Returns null if valid, or an error message string if invalid.
   */
  static validateContent(content: string): string | null {
    if (!content || content.trim().length === 0) {
      return '팁 내용을 입력해주세요.';
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return `팁은 ${MAX_CONTENT_LENGTH}자 이하로 작성해주세요.`;
    }
    if (URL_PATTERN.test(content)) {
      return 'URL은 포함할 수 없습니다.';
    }
    for (const pattern of PROFANITY_PATTERNS) {
      if (pattern.test(content)) {
        return '부적절한 표현이 포함되어 있습니다.';
      }
    }
    return null;
  }

  /**
   * Check if the tip should be auto-hidden based on report count.
   */
  shouldAutoHide(): boolean {
    return this.reportCount >= AUTO_HIDE_REPORT_THRESHOLD;
  }

  /**
   * Check if a user has exceeded the daily tip limit.
   */
  static exceedsDailyLimit(todayTipCount: number): boolean {
    return todayTipCount >= DAILY_TIP_LIMIT;
  }
}

export { MAX_CONTENT_LENGTH, AUTO_HIDE_REPORT_THRESHOLD, DAILY_TIP_LIMIT };
