import { v4 as uuidv4 } from 'uuid';

export type MissionType = 'commute' | 'return';

const EMOJI_KEYWORDS: [string[], string][] = [
  [['영어', '단어', '외우기', '암기', '어휘'], '📖'],
  [['뉴스', '신문', '기사'], '📰'],
  [['독서', '책'], '📚'],
  [['팟캐스트', '오디오', '라디오'], '🎧'],
  [['일기', '회고', '저널'], '📝'],
  [['운동', '스트레칭', '헬스', '요가', '걷기', '달리기'], '💪'],
  [['명상', '호흡', '마인드풀'], '🧘'],
  [['공부', '강의', '인강', '학습', '수업'], '🎓'],
];

/** 빈 문자열·공백뿐인 값은 "지정 안 함"으로 본다 (제목 추론으로 폴백). */
function normalizeEmoji(emoji?: string): string | undefined {
  const trimmed = emoji?.trim();
  return trimmed ? trimmed : undefined;
}

function matchEmoji(title: string): string {
  const lowerTitle = title.toLowerCase();
  for (const [keywords, emoji] of EMOJI_KEYWORDS) {
    if (keywords.some((kw) => lowerTitle.includes(kw))) {
      return emoji;
    }
  }
  return '🎯';
}

type MissionOptions = {
  id?: string;
  userId: string;
  title: string;
  emoji?: string;
  missionType: MissionType;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export class Mission {
  id: string;
  userId: string;
  title: string;
  emoji: string;
  missionType: MissionType;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(options: MissionOptions) {
    this.id = options.id ?? uuidv4();
    this.userId = options.userId;
    this.title = options.title;
    this.emoji = options.emoji ?? matchEmoji(options.title);
    this.missionType = options.missionType;
    this.isActive = options.isActive ?? true;
    this.sortOrder = options.sortOrder ?? 0;
    this.createdAt = options.createdAt ?? new Date();
    this.updatedAt = options.updatedAt ?? new Date();
  }

  static createNew(
    userId: string,
    title: string,
    missionType: MissionType,
    emoji?: string,
  ): Mission {
    if (!title || title.trim().length === 0 || title.length > 100) {
      throw new Error('title은 1~100자여야 합니다');
    }
    return new Mission({
      userId,
      title: title.trim(),
      missionType,
      emoji: normalizeEmoji(emoji),
    });
  }

  update(fields: { title?: string; emoji?: string; missionType?: MissionType }): void {
    // 사용자가 고른 emoji가 제목 추론을 이긴다 — 제목만 보고 재계산하면
    // 화면에서 고른 이모지가 저장 직후 다른 것으로 바뀐다.
    const chosenEmoji = normalizeEmoji(fields.emoji);

    if (fields.title !== undefined) {
      if (!fields.title || fields.title.trim().length === 0 || fields.title.length > 100) {
        throw new Error('title은 1~100자여야 합니다');
      }
      this.title = fields.title.trim();
      this.emoji = chosenEmoji ?? matchEmoji(this.title);
    } else if (chosenEmoji) {
      this.emoji = chosenEmoji;
    }

    if (fields.missionType !== undefined) {
      this.missionType = fields.missionType;
    }
    this.updatedAt = new Date();
  }

  toggleActive(): void {
    this.isActive = !this.isActive;
    this.updatedAt = new Date();
  }
}
