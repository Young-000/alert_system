# 출퇴근 미션 시스템 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 사용자가 직접 출퇴근 미션을 정의하고 매일 셀프 체크하며 점수/뱃지로 동기부여하는 시스템 구축

**Architecture:** Clean Architecture 레이어 유지 (domain → application → infrastructure → presentation). 새 엔티티 3개(Mission, DailyMissionRecord, MissionScore) 생성. 기존 UserBadge 재활용(challengeId nullable). 프론트엔드는 /missions 전용 페이지 + 홈 요약 카드.

**Tech Stack:** NestJS + TypeORM (backend), React + React Query (frontend), Supabase PostgreSQL (DB, schema: alert_system)

**Design Doc:** `docs/plans/2026-02-25-commute-mission-design.md`

---

## Task 1: Backend Domain — Mission 엔티티

**Files:**
- Create: `backend/src/domain/entities/mission.entity.ts`

**Context:** 사용자가 정의하는 미션(출근/퇴근). 기존 도메인 엔티티 패턴(plain TS class + factory method)을 따른다. `backend/src/domain/entities/commute-streak.entity.ts`를 참고.

**Step 1: Write the failing test**

Create: `backend/src/domain/entities/mission.entity.spec.ts`

```typescript
import { Mission, MissionType } from './mission.entity';

describe('Mission', () => {
  describe('createNew', () => {
    it('출근 미션을 생성한다', () => {
      const mission = Mission.createNew('user-1', '영어 단어 10개', 'commute');
      expect(mission.userId).toBe('user-1');
      expect(mission.title).toBe('영어 단어 10개');
      expect(mission.missionType).toBe('commute');
      expect(mission.isActive).toBe(true);
      expect(mission.sortOrder).toBe(0);
      expect(mission.emoji).toBe('📖'); // '영어' keyword match
      expect(mission.id).toBeDefined();
    });

    it('퇴근 미션을 생성한다', () => {
      const mission = Mission.createNew('user-1', '하루 회고 쓰기', 'return');
      expect(mission.missionType).toBe('return');
      expect(mission.emoji).toBe('📝'); // '회고' keyword match
    });

    it('빈 제목이면 에러를 던진다', () => {
      expect(() => Mission.createNew('user-1', '', 'commute'))
        .toThrow('title은 1~100자여야 합니다');
    });

    it('100자 초과하면 에러를 던진다', () => {
      const longTitle = 'a'.repeat(101);
      expect(() => Mission.createNew('user-1', longTitle, 'commute'))
        .toThrow('title은 1~100자여야 합니다');
    });
  });

  describe('matchEmoji', () => {
    it.each([
      ['영어 단어 외우기', '📖'],
      ['독서 30분', '📚'],
      ['팟캐스트 듣기', '🎧'],
      ['뉴스 읽기', '📰'],
      ['일기 쓰기', '📝'],
      ['스트레칭 5분', '💪'],
      ['명상 10분', '🧘'],
      ['강의 듣기', '🎓'],
      ['알 수 없는 미션', '🎯'],
    ])('"%s"는 "%s" 이모지를 반환한다', (title, expectedEmoji) => {
      const mission = Mission.createNew('user-1', title, 'commute');
      expect(mission.emoji).toBe(expectedEmoji);
    });
  });

  describe('update', () => {
    it('제목을 수정하면 이모지도 업데이트된다', () => {
      const mission = Mission.createNew('user-1', '영어 단어', 'commute');
      mission.update({ title: '스트레칭 10분' });
      expect(mission.title).toBe('스트레칭 10분');
      expect(mission.emoji).toBe('💪');
    });

    it('타입을 변경한다', () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      mission.update({ missionType: 'return' });
      expect(mission.missionType).toBe('return');
    });
  });

  describe('toggleActive', () => {
    it('활성화/비활성화를 토글한다', () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      expect(mission.isActive).toBe(true);
      mission.toggleActive();
      expect(mission.isActive).toBe(false);
      mission.toggleActive();
      expect(mission.isActive).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest --testPathPattern="mission.entity.spec" --no-coverage`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create: `backend/src/domain/entities/mission.entity.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';

export type MissionType = 'commute' | 'return';

const EMOJI_KEYWORDS: [string[], string][] = [
  [['영어', '단어', '외우기', '암기', '어휘'], '📖'],
  [['독서', '책', '읽기'], '📚'],
  [['팟캐스트', '듣기', '오디오', '라디오'], '🎧'],
  [['뉴스', '신문', '기사'], '📰'],
  [['일기', '회고', '쓰기', '저널', '기록'], '📝'],
  [['운동', '스트레칭', '헬스', '요가', '걷기', '달리기'], '💪'],
  [['명상', '호흡', '마인드풀'], '🧘'],
  [['공부', '강의', '인강', '학습', '수업'], '🎓'],
];

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
  ): Mission {
    if (!title || title.trim().length === 0 || title.length > 100) {
      throw new Error('title은 1~100자여야 합니다');
    }
    return new Mission({ userId, title: title.trim(), missionType });
  }

  update(fields: { title?: string; missionType?: MissionType }): void {
    if (fields.title !== undefined) {
      if (!fields.title || fields.title.trim().length === 0 || fields.title.length > 100) {
        throw new Error('title은 1~100자여야 합니다');
      }
      this.title = fields.title.trim();
      this.emoji = matchEmoji(this.title);
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
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest --testPathPattern="mission.entity.spec" --no-coverage`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add backend/src/domain/entities/mission.entity.ts backend/src/domain/entities/mission.entity.spec.ts
git commit -m "feat(mission): add Mission domain entity with emoji matching"
```

---

## Task 2: Backend Domain — DailyMissionRecord 엔티티

**Files:**
- Create: `backend/src/domain/entities/daily-mission-record.entity.ts`
- Create: `backend/src/domain/entities/daily-mission-record.entity.spec.ts`

**Context:** 일일 미션 체크 기록. 하루에 미션당 1개 레코드. 토글(체크/언체크) 지원.

**Step 1: Write the failing test**

```typescript
import { DailyMissionRecord } from './daily-mission-record.entity';

describe('DailyMissionRecord', () => {
  describe('createForToday', () => {
    it('오늘 날짜로 미완료 상태의 레코드를 생성한다', () => {
      const record = DailyMissionRecord.createForToday('user-1', 'mission-1', '2026-02-25');
      expect(record.userId).toBe('user-1');
      expect(record.missionId).toBe('mission-1');
      expect(record.date).toBe('2026-02-25');
      expect(record.isCompleted).toBe(false);
      expect(record.completedAt).toBeNull();
    });
  });

  describe('toggleCheck', () => {
    it('미완료 → 완료로 토글하면 completedAt이 설정된다', () => {
      const record = DailyMissionRecord.createForToday('user-1', 'mission-1', '2026-02-25');
      record.toggleCheck();
      expect(record.isCompleted).toBe(true);
      expect(record.completedAt).toBeInstanceOf(Date);
    });

    it('완료 → 미완료로 토글하면 completedAt이 null이 된다', () => {
      const record = DailyMissionRecord.createForToday('user-1', 'mission-1', '2026-02-25');
      record.toggleCheck(); // complete
      record.toggleCheck(); // uncomplete
      expect(record.isCompleted).toBe(false);
      expect(record.completedAt).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest --testPathPattern="daily-mission-record.entity.spec" --no-coverage`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
import { v4 as uuidv4 } from 'uuid';

type DailyMissionRecordOptions = {
  id?: string;
  userId: string;
  missionId: string;
  date: string; // YYYY-MM-DD (KST)
  isCompleted?: boolean;
  completedAt?: Date | null;
  createdAt?: Date;
};

export class DailyMissionRecord {
  id: string;
  userId: string;
  missionId: string;
  date: string;
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;

  constructor(options: DailyMissionRecordOptions) {
    this.id = options.id ?? uuidv4();
    this.userId = options.userId;
    this.missionId = options.missionId;
    this.date = options.date;
    this.isCompleted = options.isCompleted ?? false;
    this.completedAt = options.completedAt ?? null;
    this.createdAt = options.createdAt ?? new Date();
  }

  static createForToday(userId: string, missionId: string, todayKST: string): DailyMissionRecord {
    return new DailyMissionRecord({ userId, missionId, date: todayKST });
  }

  toggleCheck(): void {
    this.isCompleted = !this.isCompleted;
    this.completedAt = this.isCompleted ? new Date() : null;
  }
}
```

**Step 4: Run tests → PASS**

**Step 5: Commit**

```bash
git add backend/src/domain/entities/daily-mission-record.entity.ts backend/src/domain/entities/daily-mission-record.entity.spec.ts
git commit -m "feat(mission): add DailyMissionRecord domain entity"
```

---

## Task 3: Backend Domain — MissionScore 엔티티

**Files:**
- Create: `backend/src/domain/entities/mission-score.entity.ts`
- Create: `backend/src/domain/entities/mission-score.entity.spec.ts`

**Context:** 일간 점수 집계. 달성률과 스트릭 계산 포함.

**Step 1: Write the failing test**

```typescript
import { MissionScore } from './mission-score.entity';

describe('MissionScore', () => {
  describe('calculate', () => {
    it('달성률을 계산한다', () => {
      const score = MissionScore.calculate('user-1', '2026-02-25', 5, 3, 4);
      expect(score.totalMissions).toBe(5);
      expect(score.completedMissions).toBe(3);
      expect(score.completionRate).toBe(60);
      expect(score.streakDay).toBe(4);
    });

    it('미션이 0개면 달성률 0이다', () => {
      const score = MissionScore.calculate('user-1', '2026-02-25', 0, 0, 0);
      expect(score.completionRate).toBe(0);
    });

    it('100% 달성이면 달성률 100이다', () => {
      const score = MissionScore.calculate('user-1', '2026-02-25', 4, 4, 10);
      expect(score.completionRate).toBe(100);
    });
  });

  describe('isPerfect', () => {
    it('100% 달성이면 true', () => {
      const score = MissionScore.calculate('user-1', '2026-02-25', 3, 3, 1);
      expect(score.isPerfect()).toBe(true);
    });

    it('미달성이면 false', () => {
      const score = MissionScore.calculate('user-1', '2026-02-25', 3, 2, 0);
      expect(score.isPerfect()).toBe(false);
    });
  });
});
```

**Step 2: Run test → FAIL**

**Step 3: Write implementation**

```typescript
import { v4 as uuidv4 } from 'uuid';

type MissionScoreOptions = {
  id?: string;
  userId: string;
  date: string;
  totalMissions: number;
  completedMissions: number;
  completionRate: number;
  streakDay: number;
  createdAt?: Date;
};

export class MissionScore {
  id: string;
  userId: string;
  date: string;
  totalMissions: number;
  completedMissions: number;
  completionRate: number;
  streakDay: number;
  createdAt: Date;

  constructor(options: MissionScoreOptions) {
    this.id = options.id ?? uuidv4();
    this.userId = options.userId;
    this.date = options.date;
    this.totalMissions = options.totalMissions;
    this.completedMissions = options.completedMissions;
    this.completionRate = options.completionRate;
    this.streakDay = options.streakDay;
    this.createdAt = options.createdAt ?? new Date();
  }

  static calculate(
    userId: string,
    date: string,
    totalMissions: number,
    completedMissions: number,
    previousStreakDay: number,
  ): MissionScore {
    const completionRate =
      totalMissions === 0 ? 0 : Math.round((completedMissions / totalMissions) * 100);
    const streakDay =
      completionRate === 100 ? previousStreakDay + 1 : 0;

    return new MissionScore({
      userId,
      date,
      totalMissions,
      completedMissions,
      completionRate,
      streakDay,
    });
  }

  isPerfect(): boolean {
    return this.completionRate === 100;
  }
}
```

**Step 4: Run tests → PASS**

**Step 5: Commit**

```bash
git add backend/src/domain/entities/mission-score.entity.ts backend/src/domain/entities/mission-score.entity.spec.ts
git commit -m "feat(mission): add MissionScore domain entity"
```

---

## Task 4: Backend Domain — Repository 인터페이스

**Files:**
- Create: `backend/src/domain/repositories/mission.repository.ts`

**Context:** 도메인 레이어의 리포지토리 인터페이스. `backend/src/domain/repositories/challenge.repository.ts` 패턴을 따른다.

**Step 1: Write implementation (인터페이스는 테스트 불필요)**

```typescript
import { Mission, MissionType } from '@domain/entities/mission.entity';
import { DailyMissionRecord } from '@domain/entities/daily-mission-record.entity';
import { MissionScore } from '@domain/entities/mission-score.entity';

export interface IMissionRepository {
  // Mission CRUD
  findByUserId(userId: string): Promise<Mission[]>;
  findById(id: string): Promise<Mission | null>;
  countByUserAndType(userId: string, missionType: MissionType): Promise<number>;
  saveMission(mission: Mission): Promise<Mission>;
  deleteMission(id: string): Promise<void>;

  // Daily Records
  findDailyRecords(userId: string, date: string): Promise<DailyMissionRecord[]>;
  findDailyRecord(userId: string, missionId: string, date: string): Promise<DailyMissionRecord | null>;
  saveDailyRecord(record: DailyMissionRecord): Promise<DailyMissionRecord>;

  // Scores
  findScore(userId: string, date: string): Promise<MissionScore | null>;
  findScoreRange(userId: string, startDate: string, endDate: string): Promise<MissionScore[]>;
  saveScore(score: MissionScore): Promise<MissionScore>;

  // Stats
  findLatestStreak(userId: string): Promise<number>;
}
```

**Step 2: Commit**

```bash
git add backend/src/domain/repositories/mission.repository.ts
git commit -m "feat(mission): add IMissionRepository interface"
```

---

## Task 5: Backend Persistence — TypeORM 엔티티

**Files:**
- Create: `backend/src/infrastructure/persistence/typeorm/mission.entity.ts`
- Create: `backend/src/infrastructure/persistence/typeorm/daily-mission-record.entity.ts`
- Create: `backend/src/infrastructure/persistence/typeorm/mission-score.entity.ts`
- Modify: `backend/src/infrastructure/persistence/database.config.ts`

**Context:** TypeORM ORM 엔티티. `schema: 'alert_system'` 필수. `backend/src/infrastructure/persistence/typeorm/user-badge.entity.ts` 패턴 참고.

**Step 1: Create MissionEntity**

```typescript
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('missions', { schema: 'alert_system' })
@Index(['userId', 'missionType'])
export class MissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'varchar', length: 10, default: '🎯' })
  emoji: string;

  @Column({ type: 'varchar', length: 20, name: 'mission_type' })
  missionType: string; // 'commute' | 'return'

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**Step 2: Create DailyMissionRecordEntity**

```typescript
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { MissionEntity } from './mission.entity';

@Entity('daily_mission_records', { schema: 'alert_system' })
@Index(['userId', 'date'])
@Unique(['userId', 'missionId', 'date'])
export class DailyMissionRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'mission_id' })
  missionId: string;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  @Column({ type: 'boolean', name: 'is_completed', default: false })
  isCompleted: boolean;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @ManyToOne(() => MissionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mission_id' })
  mission?: MissionEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

**Step 3: Create MissionScoreEntity**

```typescript
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('mission_scores', { schema: 'alert_system' })
@Index(['userId', 'date'])
@Unique(['userId', 'date'])
export class MissionScoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int', name: 'total_missions' })
  totalMissions: number;

  @Column({ type: 'int', name: 'completed_missions' })
  completedMissions: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'completion_rate' })
  completionRate: number;

  @Column({ type: 'int', name: 'streak_day', default: 0 })
  streakDay: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

**Step 4: Register entities in database.config.ts**

Add imports and include all 3 new entities in both `allEntities` arrays (SQLite and PostgreSQL).

```typescript
// Add to imports:
import { MissionEntity } from './typeorm/mission.entity';
import { DailyMissionRecordEntity } from './typeorm/daily-mission-record.entity';
import { MissionScoreEntity } from './typeorm/mission-score.entity';

// Add to both allEntities arrays after "// Challenge system":
    // Mission system
    MissionEntity,
    DailyMissionRecordEntity,
    MissionScoreEntity,
```

**Step 5: Verify build**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add backend/src/infrastructure/persistence/typeorm/mission.entity.ts \
  backend/src/infrastructure/persistence/typeorm/daily-mission-record.entity.ts \
  backend/src/infrastructure/persistence/typeorm/mission-score.entity.ts \
  backend/src/infrastructure/persistence/database.config.ts
git commit -m "feat(mission): add TypeORM entities and register in database config"
```

---

## Task 6: Backend Persistence — Repository 구현

**Files:**
- Create: `backend/src/infrastructure/persistence/mission.repository.impl.ts`

**Context:** IMissionRepository의 TypeORM 구현체. `backend/src/infrastructure/persistence/` 내 기존 구현체 패턴을 따른다. InjectRepository + TypeORM Repository 패턴.

**Step 1: Write implementation**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { IMissionRepository } from '@domain/repositories/mission.repository';
import { Mission, MissionType } from '@domain/entities/mission.entity';
import { DailyMissionRecord } from '@domain/entities/daily-mission-record.entity';
import { MissionScore } from '@domain/entities/mission-score.entity';
import { MissionEntity } from './typeorm/mission.entity';
import { DailyMissionRecordEntity } from './typeorm/daily-mission-record.entity';
import { MissionScoreEntity } from './typeorm/mission-score.entity';

@Injectable()
export class MissionRepositoryImpl implements IMissionRepository {
  constructor(
    @InjectRepository(MissionEntity)
    private readonly missionRepo: Repository<MissionEntity>,
    @InjectRepository(DailyMissionRecordEntity)
    private readonly recordRepo: Repository<DailyMissionRecordEntity>,
    @InjectRepository(MissionScoreEntity)
    private readonly scoreRepo: Repository<MissionScoreEntity>,
  ) {}

  async findByUserId(userId: string): Promise<Mission[]> {
    const entities = await this.missionRepo.find({
      where: { userId },
      order: { missionType: 'ASC', sortOrder: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findById(id: string): Promise<Mission | null> {
    const entity = await this.missionRepo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async countByUserAndType(userId: string, missionType: MissionType): Promise<number> {
    return this.missionRepo.count({ where: { userId, missionType, isActive: true } });
  }

  async saveMission(mission: Mission): Promise<Mission> {
    const entity = this.missionRepo.create({
      id: mission.id,
      userId: mission.userId,
      title: mission.title,
      emoji: mission.emoji,
      missionType: mission.missionType,
      isActive: mission.isActive,
      sortOrder: mission.sortOrder,
    });
    const saved = await this.missionRepo.save(entity);
    return this.toDomain(saved);
  }

  async deleteMission(id: string): Promise<void> {
    await this.missionRepo.delete(id);
  }

  async findDailyRecords(userId: string, date: string): Promise<DailyMissionRecord[]> {
    const entities = await this.recordRepo.find({ where: { userId, date } });
    return entities.map((e) => this.toRecordDomain(e));
  }

  async findDailyRecord(
    userId: string,
    missionId: string,
    date: string,
  ): Promise<DailyMissionRecord | null> {
    const entity = await this.recordRepo.findOne({
      where: { userId, missionId, date },
    });
    return entity ? this.toRecordDomain(entity) : null;
  }

  async saveDailyRecord(record: DailyMissionRecord): Promise<DailyMissionRecord> {
    const entity = this.recordRepo.create({
      id: record.id,
      userId: record.userId,
      missionId: record.missionId,
      date: record.date,
      isCompleted: record.isCompleted,
      completedAt: record.completedAt,
    });
    const saved = await this.recordRepo.save(entity);
    return this.toRecordDomain(saved);
  }

  async findScore(userId: string, date: string): Promise<MissionScore | null> {
    const entity = await this.scoreRepo.findOne({ where: { userId, date } });
    return entity ? this.toScoreDomain(entity) : null;
  }

  async findScoreRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<MissionScore[]> {
    const entities = await this.scoreRepo.find({
      where: { userId, date: Between(startDate, endDate) },
      order: { date: 'ASC' },
    });
    return entities.map((e) => this.toScoreDomain(e));
  }

  async saveScore(score: MissionScore): Promise<MissionScore> {
    const entity = this.scoreRepo.create({
      id: score.id,
      userId: score.userId,
      date: score.date,
      totalMissions: score.totalMissions,
      completedMissions: score.completedMissions,
      completionRate: score.completionRate,
      streakDay: score.streakDay,
    });
    const saved = await this.scoreRepo.save(entity);
    return this.toScoreDomain(saved);
  }

  async findLatestStreak(userId: string): Promise<number> {
    const latest = await this.scoreRepo.findOne({
      where: { userId },
      order: { date: 'DESC' },
    });
    return latest?.streakDay ?? 0;
  }

  private toDomain(entity: MissionEntity): Mission {
    return new Mission({
      id: entity.id,
      userId: entity.userId,
      title: entity.title,
      emoji: entity.emoji,
      missionType: entity.missionType as MissionType,
      isActive: entity.isActive,
      sortOrder: entity.sortOrder,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toRecordDomain(entity: DailyMissionRecordEntity): DailyMissionRecord {
    return new DailyMissionRecord({
      id: entity.id,
      userId: entity.userId,
      missionId: entity.missionId,
      date: entity.date,
      isCompleted: entity.isCompleted,
      completedAt: entity.completedAt,
      createdAt: entity.createdAt,
    });
  }

  private toScoreDomain(entity: MissionScoreEntity): MissionScore {
    return new MissionScore({
      id: entity.id,
      userId: entity.userId,
      date: entity.date,
      totalMissions: entity.totalMissions,
      completedMissions: entity.completedMissions,
      completionRate: Number(entity.completionRate),
      streakDay: entity.streakDay,
      createdAt: entity.createdAt,
    });
  }
}
```

**Step 2: TypeCheck**

Run: `cd backend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add backend/src/infrastructure/persistence/mission.repository.impl.ts
git commit -m "feat(mission): add MissionRepositoryImpl (TypeORM)"
```

---

## Task 7: Backend Application — ManageMissionUseCase

**Files:**
- Create: `backend/src/application/use-cases/manage-mission.use-case.ts`
- Create: `backend/src/application/use-cases/manage-mission.use-case.spec.ts`

**Context:** 미션 CRUD 유스케이스. 최대 3개 제한 검증 포함. `backend/src/application/use-cases/manage-challenge.use-case.ts` 패턴을 참고.

**Step 1: Write the failing test**

```typescript
import { ManageMissionUseCase } from './manage-mission.use-case';
import { IMissionRepository } from '@domain/repositories/mission.repository';
import { Mission } from '@domain/entities/mission.entity';

describe('ManageMissionUseCase', () => {
  let useCase: ManageMissionUseCase;
  let repo: jest.Mocked<IMissionRepository>;

  beforeEach(() => {
    repo = {
      findByUserId: jest.fn(),
      findById: jest.fn(),
      countByUserAndType: jest.fn(),
      saveMission: jest.fn(),
      deleteMission: jest.fn(),
      findDailyRecords: jest.fn(),
      findDailyRecord: jest.fn(),
      saveDailyRecord: jest.fn(),
      findScore: jest.fn(),
      findScoreRange: jest.fn(),
      saveScore: jest.fn(),
      findLatestStreak: jest.fn(),
    };
    useCase = new ManageMissionUseCase(repo);
  });

  describe('createMission', () => {
    it('미션을 생성한다', async () => {
      repo.countByUserAndType.mockResolvedValue(0);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.createMission('user-1', '영어 단어', 'commute');
      expect(result.title).toBe('영어 단어');
      expect(repo.saveMission).toHaveBeenCalled();
    });

    it('같은 타입 미션이 3개면 에러를 던진다', async () => {
      repo.countByUserAndType.mockResolvedValue(3);

      await expect(
        useCase.createMission('user-1', '네 번째', 'commute'),
      ).rejects.toThrow('commute 미션은 최대 3개까지 설정할 수 있습니다');
    });
  });

  describe('getUserMissions', () => {
    it('사용자의 미션 목록을 반환한다', async () => {
      const missions = [
        Mission.createNew('user-1', '독서', 'commute'),
        Mission.createNew('user-1', '회고', 'return'),
      ];
      repo.findByUserId.mockResolvedValue(missions);

      const result = await useCase.getUserMissions('user-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('updateMission', () => {
    it('미션 제목을 수정한다', async () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      repo.findById.mockResolvedValue(mission);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.updateMission(mission.id, 'user-1', { title: '독서 30분' });
      expect(result.title).toBe('독서 30분');
    });

    it('다른 사용자의 미션은 수정할 수 없다', async () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      repo.findById.mockResolvedValue(mission);

      await expect(
        useCase.updateMission(mission.id, 'user-2', { title: '해킹' }),
      ).rejects.toThrow('권한이 없습니다');
    });
  });

  describe('deleteMission', () => {
    it('미션을 삭제한다', async () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      repo.findById.mockResolvedValue(mission);
      repo.deleteMission.mockResolvedValue(undefined);

      await useCase.deleteMission(mission.id, 'user-1');
      expect(repo.deleteMission).toHaveBeenCalledWith(mission.id);
    });
  });

  describe('toggleActive', () => {
    it('미션 활성화를 토글한다', async () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      repo.findById.mockResolvedValue(mission);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.toggleActive(mission.id, 'user-1');
      expect(result.isActive).toBe(false);
    });
  });
});
```

**Step 2: Run test → FAIL**

**Step 3: Write implementation**

```typescript
import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IMissionRepository } from '@domain/repositories/mission.repository';
import { Mission, MissionType } from '@domain/entities/mission.entity';

const MISSION_REPOSITORY = Symbol('MISSION_REPOSITORY');
export { MISSION_REPOSITORY };

const MAX_MISSIONS_PER_TYPE = 3;

@Injectable()
export class ManageMissionUseCase {
  constructor(
    @Inject(MISSION_REPOSITORY) private readonly repo: IMissionRepository,
  ) {}

  async createMission(
    userId: string,
    title: string,
    missionType: MissionType,
  ): Promise<Mission> {
    const count = await this.repo.countByUserAndType(userId, missionType);
    if (count >= MAX_MISSIONS_PER_TYPE) {
      throw new BadRequestException(
        `${missionType} 미션은 최대 ${MAX_MISSIONS_PER_TYPE}개까지 설정할 수 있습니다`,
      );
    }

    const mission = Mission.createNew(userId, title, missionType);
    mission.sortOrder = count; // append at end
    return this.repo.saveMission(mission);
  }

  async getUserMissions(userId: string): Promise<Mission[]> {
    return this.repo.findByUserId(userId);
  }

  async updateMission(
    missionId: string,
    userId: string,
    fields: { title?: string; missionType?: MissionType },
  ): Promise<Mission> {
    const mission = await this.findOwnedMission(missionId, userId);
    mission.update(fields);
    return this.repo.saveMission(mission);
  }

  async deleteMission(missionId: string, userId: string): Promise<void> {
    await this.findOwnedMission(missionId, userId);
    await this.repo.deleteMission(missionId);
  }

  async toggleActive(missionId: string, userId: string): Promise<Mission> {
    const mission = await this.findOwnedMission(missionId, userId);
    mission.toggleActive();
    return this.repo.saveMission(mission);
  }

  async reorder(
    missionId: string,
    userId: string,
    newOrder: number,
  ): Promise<Mission> {
    const mission = await this.findOwnedMission(missionId, userId);
    mission.sortOrder = newOrder;
    return this.repo.saveMission(mission);
  }

  private async findOwnedMission(missionId: string, userId: string): Promise<Mission> {
    const mission = await this.repo.findById(missionId);
    if (!mission) {
      throw new NotFoundException('미션을 찾을 수 없습니다');
    }
    if (mission.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다');
    }
    return mission;
  }
}
```

**Step 4: Run tests → PASS**

**Step 5: Commit**

```bash
git add backend/src/application/use-cases/manage-mission.use-case.ts \
  backend/src/application/use-cases/manage-mission.use-case.spec.ts
git commit -m "feat(mission): add ManageMissionUseCase with max-3 validation"
```

---

## Task 8: Backend Application — DailyCheckUseCase

**Files:**
- Create: `backend/src/application/use-cases/daily-check.use-case.ts`
- Create: `backend/src/application/use-cases/daily-check.use-case.spec.ts`

**Context:** 일일 미션 체크/언체크 + 점수 재계산 + 뱃지 수여. 뱃지는 기존 UserBadge(challengeId nullable)를 재활용.

**Step 1: Write the failing test**

```typescript
import { DailyCheckUseCase } from './daily-check.use-case';
import { IMissionRepository } from '@domain/repositories/mission.repository';
import { Mission } from '@domain/entities/mission.entity';
import { DailyMissionRecord } from '@domain/entities/daily-mission-record.entity';

describe('DailyCheckUseCase', () => {
  let useCase: DailyCheckUseCase;
  let repo: jest.Mocked<IMissionRepository>;

  const mockMission = (id: string, type: string = 'commute') => {
    const m = Mission.createNew('user-1', '테스트 미션', type as 'commute' | 'return');
    (m as { id: string }).id = id;
    return m;
  };

  beforeEach(() => {
    repo = {
      findByUserId: jest.fn(),
      findById: jest.fn(),
      countByUserAndType: jest.fn(),
      saveMission: jest.fn(),
      deleteMission: jest.fn(),
      findDailyRecords: jest.fn(),
      findDailyRecord: jest.fn(),
      saveDailyRecord: jest.fn(),
      findScore: jest.fn(),
      findScoreRange: jest.fn(),
      saveScore: jest.fn(),
      findLatestStreak: jest.fn(),
    };
    useCase = new DailyCheckUseCase(repo);
  });

  describe('getDailyStatus', () => {
    it('오늘의 미션과 체크 상태를 반환한다', async () => {
      const missions = [mockMission('m1'), mockMission('m2', 'return')];
      repo.findByUserId.mockResolvedValue(missions);
      repo.findDailyRecords.mockResolvedValue([]);

      const result = await useCase.getDailyStatus('user-1', '2026-02-25');
      expect(result.commuteMissions).toHaveLength(1);
      expect(result.returnMissions).toHaveLength(1);
      expect(result.totalMissions).toBe(2);
      expect(result.completedMissions).toBe(0);
    });
  });

  describe('toggleCheck', () => {
    it('미완료 미션을 완료로 토글한다', async () => {
      const mission = mockMission('m1');
      repo.findById.mockResolvedValue(mission);
      repo.findDailyRecord.mockResolvedValue(null);
      repo.saveDailyRecord.mockImplementation(async (r) => r);
      repo.findByUserId.mockResolvedValue([mission]);
      repo.findDailyRecords.mockResolvedValue([]);
      repo.findLatestStreak.mockResolvedValue(0);
      repo.findScore.mockResolvedValue(null);
      repo.saveScore.mockImplementation(async (s) => s);

      const result = await useCase.toggleCheck('user-1', 'm1', '2026-02-25');
      expect(result.isCompleted).toBe(true);
    });

    it('완료 미션을 미완료로 토글한다', async () => {
      const mission = mockMission('m1');
      const record = DailyMissionRecord.createForToday('user-1', 'm1', '2026-02-25');
      record.toggleCheck(); // mark completed
      repo.findById.mockResolvedValue(mission);
      repo.findDailyRecord.mockResolvedValue(record);
      repo.saveDailyRecord.mockImplementation(async (r) => r);
      repo.findByUserId.mockResolvedValue([mission]);
      repo.findDailyRecords.mockResolvedValue([record]);
      repo.findLatestStreak.mockResolvedValue(0);
      repo.findScore.mockResolvedValue(null);
      repo.saveScore.mockImplementation(async (s) => s);

      const result = await useCase.toggleCheck('user-1', 'm1', '2026-02-25');
      expect(result.isCompleted).toBe(false);
    });
  });
});
```

**Step 2: Run test → FAIL**

**Step 3: Write implementation**

```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IMissionRepository } from '@domain/repositories/mission.repository';
import { Mission } from '@domain/entities/mission.entity';
import { DailyMissionRecord } from '@domain/entities/daily-mission-record.entity';
import { MissionScore } from '@domain/entities/mission-score.entity';
import { MISSION_REPOSITORY } from './manage-mission.use-case';

type MissionWithRecord = {
  mission: Mission;
  record: DailyMissionRecord | null;
  isCompleted: boolean;
};

type DailyStatus = {
  commuteMissions: MissionWithRecord[];
  returnMissions: MissionWithRecord[];
  totalMissions: number;
  completedMissions: number;
  completionRate: number;
  streakDay: number;
};

export type { DailyStatus, MissionWithRecord };

@Injectable()
export class DailyCheckUseCase {
  constructor(
    @Inject(MISSION_REPOSITORY) private readonly repo: IMissionRepository,
  ) {}

  async getDailyStatus(userId: string, todayKST: string): Promise<DailyStatus> {
    const missions = await this.repo.findByUserId(userId);
    const activeMissions = missions.filter((m) => m.isActive);
    const records = await this.repo.findDailyRecords(userId, todayKST);
    const recordMap = new Map(records.map((r) => [r.missionId, r]));

    const withRecords = activeMissions.map((mission) => {
      const record = recordMap.get(mission.id) ?? null;
      return {
        mission,
        record,
        isCompleted: record?.isCompleted ?? false,
      };
    });

    const commuteMissions = withRecords.filter((m) => m.mission.missionType === 'commute');
    const returnMissions = withRecords.filter((m) => m.mission.missionType === 'return');
    const totalMissions = activeMissions.length;
    const completedMissions = withRecords.filter((m) => m.isCompleted).length;
    const completionRate = totalMissions === 0 ? 0 : Math.round((completedMissions / totalMissions) * 100);
    const streakDay = await this.repo.findLatestStreak(userId);

    return {
      commuteMissions,
      returnMissions,
      totalMissions,
      completedMissions,
      completionRate,
      streakDay,
    };
  }

  async toggleCheck(
    userId: string,
    missionId: string,
    todayKST: string,
  ): Promise<DailyMissionRecord> {
    const mission = await this.repo.findById(missionId);
    if (!mission || mission.userId !== userId) {
      throw new NotFoundException('미션을 찾을 수 없습니다');
    }

    let record = await this.repo.findDailyRecord(userId, missionId, todayKST);
    if (!record) {
      record = DailyMissionRecord.createForToday(userId, missionId, todayKST);
    }
    record.toggleCheck();
    const saved = await this.repo.saveDailyRecord(record);

    // Recalculate daily score
    await this.recalculateScore(userId, todayKST);

    return saved;
  }

  async getDailyScore(userId: string, todayKST: string): Promise<MissionScore | null> {
    return this.repo.findScore(userId, todayKST);
  }

  private async recalculateScore(userId: string, todayKST: string): Promise<void> {
    const missions = await this.repo.findByUserId(userId);
    const activeMissions = missions.filter((m) => m.isActive);
    const records = await this.repo.findDailyRecords(userId, todayKST);

    const totalMissions = activeMissions.length;
    const completedMissions = records.filter((r) => r.isCompleted).length;
    const previousStreak = await this.repo.findLatestStreak(userId);

    const score = MissionScore.calculate(
      userId,
      todayKST,
      totalMissions,
      completedMissions,
      previousStreak,
    );

    // Check if existing score for today
    const existing = await this.repo.findScore(userId, todayKST);
    if (existing) {
      score.id = existing.id; // upsert
    }

    await this.repo.saveScore(score);
  }
}
```

**Step 4: Run tests → PASS**

**Step 5: Commit**

```bash
git add backend/src/application/use-cases/daily-check.use-case.ts \
  backend/src/application/use-cases/daily-check.use-case.spec.ts
git commit -m "feat(mission): add DailyCheckUseCase with score recalculation"
```

---

## Task 9: Backend Application — MissionStatsUseCase

**Files:**
- Create: `backend/src/application/use-cases/mission-stats.use-case.ts`
- Create: `backend/src/application/use-cases/mission-stats.use-case.spec.ts`

**Context:** 주간/월간 통계 + 스트릭 + 뱃지 확인.

**Step 1: Write the failing test**

```typescript
import { MissionStatsUseCase } from './mission-stats.use-case';
import { IMissionRepository } from '@domain/repositories/mission.repository';
import { MissionScore } from '@domain/entities/mission-score.entity';

describe('MissionStatsUseCase', () => {
  let useCase: MissionStatsUseCase;
  let repo: jest.Mocked<IMissionRepository>;

  beforeEach(() => {
    repo = {
      findByUserId: jest.fn(),
      findById: jest.fn(),
      countByUserAndType: jest.fn(),
      saveMission: jest.fn(),
      deleteMission: jest.fn(),
      findDailyRecords: jest.fn(),
      findDailyRecord: jest.fn(),
      saveDailyRecord: jest.fn(),
      findScore: jest.fn(),
      findScoreRange: jest.fn(),
      saveScore: jest.fn(),
      findLatestStreak: jest.fn(),
    };
    useCase = new MissionStatsUseCase(repo);
  });

  describe('getWeeklyStats', () => {
    it('주간 달성률을 계산한다', async () => {
      const scores = [
        MissionScore.calculate('user-1', '2026-02-24', 5, 5, 1),
        MissionScore.calculate('user-1', '2026-02-25', 5, 3, 0),
      ];
      repo.findScoreRange.mockResolvedValue(scores);

      const result = await useCase.getWeeklyStats('user-1', '2026-02-25');
      expect(result.totalCompleted).toBe(8);
      expect(result.totalMissions).toBe(10);
      expect(result.completionRate).toBe(80);
      expect(result.dailyScores).toHaveLength(2);
    });
  });

  describe('getStreak', () => {
    it('현재 스트릭을 반환한다', async () => {
      repo.findLatestStreak.mockResolvedValue(7);
      const result = await useCase.getStreak('user-1');
      expect(result).toBe(7);
    });
  });
});
```

**Step 2: Run test → FAIL**

**Step 3: Write implementation**

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { IMissionRepository } from '@domain/repositories/mission.repository';
import { MissionScore } from '@domain/entities/mission-score.entity';
import { MISSION_REPOSITORY } from './manage-mission.use-case';

type WeeklyStats = {
  totalCompleted: number;
  totalMissions: number;
  completionRate: number;
  dailyScores: MissionScore[];
};

type MonthlyStats = {
  totalCompleted: number;
  totalMissions: number;
  completionRate: number;
  dailyScores: MissionScore[];
};

export type { WeeklyStats, MonthlyStats };

@Injectable()
export class MissionStatsUseCase {
  constructor(
    @Inject(MISSION_REPOSITORY) private readonly repo: IMissionRepository,
  ) {}

  async getWeeklyStats(userId: string, todayKST: string): Promise<WeeklyStats> {
    const startDate = this.daysAgo(todayKST, 6); // 7 days including today
    const scores = await this.repo.findScoreRange(userId, startDate, todayKST);

    const totalCompleted = scores.reduce((sum, s) => sum + s.completedMissions, 0);
    const totalMissions = scores.reduce((sum, s) => sum + s.totalMissions, 0);
    const completionRate = totalMissions === 0 ? 0 : Math.round((totalCompleted / totalMissions) * 100);

    return { totalCompleted, totalMissions, completionRate, dailyScores: scores };
  }

  async getMonthlyStats(userId: string, todayKST: string): Promise<MonthlyStats> {
    const startDate = this.daysAgo(todayKST, 29); // 30 days including today
    const scores = await this.repo.findScoreRange(userId, startDate, todayKST);

    const totalCompleted = scores.reduce((sum, s) => sum + s.completedMissions, 0);
    const totalMissions = scores.reduce((sum, s) => sum + s.totalMissions, 0);
    const completionRate = totalMissions === 0 ? 0 : Math.round((totalCompleted / totalMissions) * 100);

    return { totalCompleted, totalMissions, completionRate, dailyScores: scores };
  }

  async getStreak(userId: string): Promise<number> {
    return this.repo.findLatestStreak(userId);
  }

  private daysAgo(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }
}
```

**Step 4: Run tests → PASS**

**Step 5: Commit**

```bash
git add backend/src/application/use-cases/mission-stats.use-case.ts \
  backend/src/application/use-cases/mission-stats.use-case.spec.ts
git commit -m "feat(mission): add MissionStatsUseCase for weekly/monthly stats"
```

---

## Task 10: Backend Presentation — Controller + Module

**Files:**
- Create: `backend/src/presentation/controllers/mission.controller.ts`
- Create: `backend/src/presentation/modules/mission.module.ts`
- Modify: `backend/src/app.module.ts` — import MissionModule

**Context:** NestJS 컨트롤러 + 모듈 등록. JWT 가드 적용. `backend/src/presentation/controllers/` 기존 컨트롤러 참고.

**Step 1: Create DTOs**

Create: `backend/src/presentation/dto/mission.dto.ts`

```typescript
export class CreateMissionDto {
  title: string;
  missionType: 'commute' | 'return';
}

export class UpdateMissionDto {
  title?: string;
  missionType?: 'commute' | 'return';
}

export class ReorderMissionDto {
  sortOrder: number;
}
```

**Step 2: Create Controller**

```typescript
import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, Req, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { ManageMissionUseCase } from '@application/use-cases/manage-mission.use-case';
import { DailyCheckUseCase } from '@application/use-cases/daily-check.use-case';
import { MissionStatsUseCase } from '@application/use-cases/mission-stats.use-case';
import { CreateMissionDto, UpdateMissionDto, ReorderMissionDto } from '../dto/mission.dto';

function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

@Controller('missions')
@UseGuards(JwtAuthGuard)
export class MissionController {
  constructor(
    private readonly manageMission: ManageMissionUseCase,
    private readonly dailyCheck: DailyCheckUseCase,
    private readonly missionStats: MissionStatsUseCase,
  ) {}

  @Get()
  async getMissions(@Req() req: { user: { sub: string } }) {
    return this.manageMission.getUserMissions(req.user.sub);
  }

  @Post()
  async createMission(
    @Req() req: { user: { sub: string } },
    @Body() dto: CreateMissionDto,
  ) {
    return this.manageMission.createMission(req.user.sub, dto.title, dto.missionType);
  }

  @Patch(':id')
  async updateMission(
    @Req() req: { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdateMissionDto,
  ) {
    return this.manageMission.updateMission(id, req.user.sub, dto);
  }

  @Delete(':id')
  async deleteMission(
    @Req() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    await this.manageMission.deleteMission(id, req.user.sub);
    return { success: true };
  }

  @Patch(':id/toggle')
  async toggleActive(
    @Req() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.manageMission.toggleActive(id, req.user.sub);
  }

  @Patch(':id/reorder')
  async reorder(
    @Req() req: { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: ReorderMissionDto,
  ) {
    return this.manageMission.reorder(id, req.user.sub, dto.sortOrder);
  }

  // --- Daily Check ---

  @Get('daily')
  async getDailyStatus(@Req() req: { user: { sub: string } }) {
    return this.dailyCheck.getDailyStatus(req.user.sub, getTodayKST());
  }

  @Post('daily/:missionId/check')
  async toggleCheck(
    @Req() req: { user: { sub: string } },
    @Param('missionId') missionId: string,
  ) {
    return this.dailyCheck.toggleCheck(req.user.sub, missionId, getTodayKST());
  }

  @Get('daily/score')
  async getDailyScore(@Req() req: { user: { sub: string } }) {
    return this.dailyCheck.getDailyScore(req.user.sub, getTodayKST());
  }

  // --- Stats ---

  @Get('stats/weekly')
  async getWeeklyStats(@Req() req: { user: { sub: string } }) {
    return this.missionStats.getWeeklyStats(req.user.sub, getTodayKST());
  }

  @Get('stats/monthly')
  async getMonthlyStats(@Req() req: { user: { sub: string } }) {
    return this.missionStats.getMonthlyStats(req.user.sub, getTodayKST());
  }

  @Get('streak')
  async getStreak(@Req() req: { user: { sub: string } }) {
    const streakDay = await this.missionStats.getStreak(req.user.sub);
    return { streakDay };
  }
}
```

**Step 3: Create Module**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionEntity } from '@infrastructure/persistence/typeorm/mission.entity';
import { DailyMissionRecordEntity } from '@infrastructure/persistence/typeorm/daily-mission-record.entity';
import { MissionScoreEntity } from '@infrastructure/persistence/typeorm/mission-score.entity';
import { MissionRepositoryImpl } from '@infrastructure/persistence/mission.repository.impl';
import { MISSION_REPOSITORY, ManageMissionUseCase } from '@application/use-cases/manage-mission.use-case';
import { DailyCheckUseCase } from '@application/use-cases/daily-check.use-case';
import { MissionStatsUseCase } from '@application/use-cases/mission-stats.use-case';
import { MissionController } from '../controllers/mission.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MissionEntity,
      DailyMissionRecordEntity,
      MissionScoreEntity,
    ]),
  ],
  controllers: [MissionController],
  providers: [
    {
      provide: MISSION_REPOSITORY,
      useClass: MissionRepositoryImpl,
    },
    ManageMissionUseCase,
    DailyCheckUseCase,
    MissionStatsUseCase,
  ],
  exports: [ManageMissionUseCase, DailyCheckUseCase, MissionStatsUseCase],
})
export class MissionModule {}
```

**Step 4: Register in app.module.ts**

Add `MissionModule` to the imports array in `backend/src/app.module.ts`.

**Step 5: Build check**

Run: `cd backend && npx tsc --noEmit`

**Step 6: Commit**

```bash
git add backend/src/presentation/controllers/mission.controller.ts \
  backend/src/presentation/modules/mission.module.ts \
  backend/src/presentation/dto/mission.dto.ts \
  backend/src/app.module.ts
git commit -m "feat(mission): add MissionController, Module, DTOs"
```

---

## Task 11: Frontend — API Client + Types

**Files:**
- Create: `frontend/src/infrastructure/api/mission-api.client.ts`
- Modify: `frontend/src/infrastructure/api/index.ts`

**Context:** 기존 ChallengeApiClient 패턴을 따른다. class 기반 + ApiClient 주입.

**Step 1: Create MissionApiClient**

```typescript
import { ApiClient } from './api-client';

export type MissionType = 'commute' | 'return';

export type Mission = {
  id: string;
  userId: string;
  title: string;
  emoji: string;
  missionType: MissionType;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type DailyMissionRecord = {
  id: string;
  userId: string;
  missionId: string;
  date: string;
  isCompleted: boolean;
  completedAt: string | null;
};

export type MissionWithRecord = {
  mission: Mission;
  record: DailyMissionRecord | null;
  isCompleted: boolean;
};

export type DailyStatus = {
  commuteMissions: MissionWithRecord[];
  returnMissions: MissionWithRecord[];
  totalMissions: number;
  completedMissions: number;
  completionRate: number;
  streakDay: number;
};

export type MissionScore = {
  id: string;
  userId: string;
  date: string;
  totalMissions: number;
  completedMissions: number;
  completionRate: number;
  streakDay: number;
};

export type WeeklyStats = {
  totalCompleted: number;
  totalMissions: number;
  completionRate: number;
  dailyScores: MissionScore[];
};

export type MonthlyStats = WeeklyStats;

export type CreateMissionDto = {
  title: string;
  missionType: MissionType;
};

export type UpdateMissionDto = {
  title?: string;
  missionType?: MissionType;
};

export class MissionApiClient {
  constructor(private apiClient: ApiClient) {}

  async getMissions(): Promise<Mission[]> {
    return this.apiClient.get<Mission[]>('/missions');
  }

  async createMission(dto: CreateMissionDto): Promise<Mission> {
    return this.apiClient.post<Mission>('/missions', dto);
  }

  async updateMission(id: string, dto: UpdateMissionDto): Promise<Mission> {
    return this.apiClient.patch<Mission>(`/missions/${id}`, dto);
  }

  async deleteMission(id: string): Promise<void> {
    await this.apiClient.delete(`/missions/${id}`);
  }

  async toggleActive(id: string): Promise<Mission> {
    return this.apiClient.patch<Mission>(`/missions/${id}/toggle`, {});
  }

  async reorder(id: string, sortOrder: number): Promise<Mission> {
    return this.apiClient.patch<Mission>(`/missions/${id}/reorder`, { sortOrder });
  }

  async getDailyStatus(): Promise<DailyStatus> {
    return this.apiClient.get<DailyStatus>('/missions/daily');
  }

  async toggleCheck(missionId: string): Promise<DailyMissionRecord> {
    return this.apiClient.post<DailyMissionRecord>(`/missions/daily/${missionId}/check`, {});
  }

  async getDailyScore(): Promise<MissionScore | null> {
    return this.apiClient.get<MissionScore | null>('/missions/daily/score');
  }

  async getWeeklyStats(): Promise<WeeklyStats> {
    return this.apiClient.get<WeeklyStats>('/missions/stats/weekly');
  }

  async getMonthlyStats(): Promise<MonthlyStats> {
    return this.apiClient.get<MonthlyStats>('/missions/stats/monthly');
  }

  async getStreak(): Promise<{ streakDay: number }> {
    return this.apiClient.get<{ streakDay: number }>('/missions/streak');
  }
}
```

**Step 2: Register in index.ts**

Add to `frontend/src/infrastructure/api/index.ts`:
- Import `MissionApiClient`
- Create singleton: `export const missionApiClient = new MissionApiClient(apiClient);`
- Export class and types

**Step 3: Commit**

```bash
git add frontend/src/infrastructure/api/mission-api.client.ts frontend/src/infrastructure/api/index.ts
git commit -m "feat(mission): add MissionApiClient with all endpoints"
```

---

## Task 12: Frontend — React Query Hooks

**Files:**
- Create: `frontend/src/infrastructure/query/use-missions-query.ts`
- Modify: `frontend/src/infrastructure/query/query-keys.ts`

**Context:** 기존 `use-challenges-query.ts` 패턴을 따른다.

**Step 1: Add query keys**

```typescript
// Add to query-keys.ts:
missions: {
  all: ['missions'] as const,
  daily: ['missions', 'daily'] as const,
  dailyScore: ['missions', 'daily', 'score'] as const,
  weeklyStats: ['missions', 'stats', 'weekly'] as const,
  monthlyStats: ['missions', 'stats', 'monthly'] as const,
  streak: ['missions', 'streak'] as const,
},
```

**Step 2: Create hooks**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { missionApiClient } from '../api';
import type { Mission, DailyStatus, MissionScore, WeeklyStats, MonthlyStats, CreateMissionDto, UpdateMissionDto } from '../api/mission-api.client';

export function useMissionsQuery() {
  return useQuery<Mission[]>({
    queryKey: queryKeys.missions.all,
    queryFn: () => missionApiClient.getMissions(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDailyStatusQuery() {
  return useQuery<DailyStatus>({
    queryKey: queryKeys.missions.daily,
    queryFn: () => missionApiClient.getDailyStatus(),
    staleTime: 30 * 1000, // 30s — frequently changing
  });
}

export function useDailyScoreQuery() {
  return useQuery<MissionScore | null>({
    queryKey: queryKeys.missions.dailyScore,
    queryFn: () => missionApiClient.getDailyScore(),
    staleTime: 30 * 1000,
  });
}

export function useWeeklyStatsQuery() {
  return useQuery<WeeklyStats>({
    queryKey: queryKeys.missions.weeklyStats,
    queryFn: () => missionApiClient.getWeeklyStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMonthlyStatsQuery() {
  return useQuery<MonthlyStats>({
    queryKey: queryKeys.missions.monthlyStats,
    queryFn: () => missionApiClient.getMonthlyStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStreakQuery() {
  return useQuery<{ streakDay: number }>({
    queryKey: queryKeys.missions.streak,
    queryFn: () => missionApiClient.getStreak(),
    staleTime: 60 * 1000,
  });
}

export function useCreateMissionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateMissionDto) => missionApiClient.createMission(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.missions.all });
      void qc.invalidateQueries({ queryKey: queryKeys.missions.daily });
    },
  });
}

export function useUpdateMissionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMissionDto }) =>
      missionApiClient.updateMission(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.missions.all });
    },
  });
}

export function useDeleteMissionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => missionApiClient.deleteMission(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.missions.all });
      void qc.invalidateQueries({ queryKey: queryKeys.missions.daily });
    },
  });
}

export function useToggleActiveMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => missionApiClient.toggleActive(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.missions.all });
      void qc.invalidateQueries({ queryKey: queryKeys.missions.daily });
    },
  });
}

export function useToggleCheckMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (missionId: string) => missionApiClient.toggleCheck(missionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.missions.daily });
      void qc.invalidateQueries({ queryKey: queryKeys.missions.dailyScore });
      void qc.invalidateQueries({ queryKey: queryKeys.missions.weeklyStats });
      void qc.invalidateQueries({ queryKey: queryKeys.missions.streak });
    },
  });
}
```

**Step 3: Commit**

```bash
git add frontend/src/infrastructure/query/use-missions-query.ts \
  frontend/src/infrastructure/query/query-keys.ts
git commit -m "feat(mission): add React Query hooks for missions"
```

---

## Task 13: Frontend — MissionsPage (메인 미션 페이지)

**Files:**
- Create: `frontend/src/presentation/pages/MissionsPage.tsx`
- Create: `frontend/src/presentation/styles/pages/missions.css`

**Context:** /missions 전용 페이지. 오늘의 미션 체크 + 주간 요약 + 뱃지. 설계 문서의 화면 2 참고.

**Step 1: Create MissionsPage component**

이 태스크는 코드 양이 많으므로 세부 구현은 서브에이전트에 위임. 핵심 구조:

```
MissionsPage
├── MissionCheckSection (출근/퇴근 미션 체크 목록)
│   ├── MissionCheckItem (개별 미션 체크 토글)
│   └── EmptyMissionState (미션 없을 때 온보딩 유도)
├── WeeklyOverview (이번 주 일별 달성 현황)
├── BadgeCollection (획득 뱃지 표시)
└── MissionManageButton (⚙️ 미션 관리로 이동)
```

- `useDailyStatusQuery()` 로 오늘 체크 현황
- `useToggleCheckMutation()` 으로 체크 토글
- `useWeeklyStatsQuery()` 로 주간 요약
- 미션 0개일 때 온보딩 화면 표시

**Step 2: Create CSS**

missions.css: 체크 카드, 토글 애니메이션, 주간 캘린더 그리드, 뱃지 가로 스크롤

**Step 3: Commit**

```bash
git add frontend/src/presentation/pages/MissionsPage.tsx \
  frontend/src/presentation/styles/pages/missions.css
git commit -m "feat(mission): add MissionsPage with daily check and weekly overview"
```

---

## Task 14: Frontend — 미션 설정/관리 컴포넌트

**Files:**
- Create: `frontend/src/presentation/pages/missions/MissionSettingsPage.tsx`
- Create: `frontend/src/presentation/pages/missions/MissionAddModal.tsx`

**Context:** 미션 추가/수정/삭제/토글/정렬. 설계 문서의 미션 관리 화면 참고.

**Step 1: Create MissionSettingsPage**

구조:
```
MissionSettingsPage
├── MissionTypeSection (출근 미션 그룹)
│   ├── MissionCard (드래그 핸들 + 토글 + 제목)
│   └── AddMissionButton (+ 추가, 3개 도달 시 비활성)
├── MissionTypeSection (퇴근 미션 그룹)
└── MissionAddModal (추가/수정 모달)
    ├── TextInput (자유 텍스트)
    ├── SuggestionChips (추천 미션 칩)
    └── TypeSelector (출근/퇴근 선택)
```

- `useMissionsQuery()` 로 미션 목록
- `useCreateMissionMutation()` 로 추가
- `useDeleteMissionMutation()` 로 삭제
- `useToggleActiveMutation()` 로 토글
- `useUpdateMissionMutation()` 로 수정

**Step 2: Commit**

```bash
git add frontend/src/presentation/pages/missions/
git commit -m "feat(mission): add mission settings page with add/edit/delete"
```

---

## Task 15: Frontend — 홈 화면 미션 요약 카드

**Files:**
- Create: `frontend/src/presentation/pages/home/MissionQuickCard.tsx`
- Modify: `frontend/src/presentation/pages/home/HomePage.tsx`

**Context:** 홈 화면에 미션 요약 카드 추가. ChallengeQuickCard를 MissionQuickCard로 교체.

**Step 1: Create MissionQuickCard**

```
MissionQuickCard
├── 프로그레스 바 (completedMissions / totalMissions)
├── "오늘의 미션 3/5" 텍스트
├── 스트릭 + 이번주 달성률 뱃지
└── "체크하기 >" 링크 → /missions
```

- `useDailyStatusQuery()` 사용
- 미션 0개 → "미션을 설정해보세요!" + /missions/settings 링크

**Step 2: Update HomePage**

- `ChallengeQuickCard` import → `MissionQuickCard`로 교체
- 미션 카드를 최상단으로 이동 (기존 날씨/교통 카드 아래)

**Step 3: Commit**

```bash
git add frontend/src/presentation/pages/home/MissionQuickCard.tsx \
  frontend/src/presentation/pages/home/HomePage.tsx
git commit -m "feat(mission): add MissionQuickCard to home page"
```

---

## Task 16: Frontend — 라우팅 + 네비게이션 업데이트

**Files:**
- Modify: `frontend/src/presentation/App.tsx`
- Modify: `frontend/src/presentation/components/BottomNavigation.tsx`

**Context:** /challenges → /missions 교체. 네비게이션 탭 변경.

**Step 1: Update App.tsx**

```typescript
// Remove:
const ChallengesPage = lazy(() => import('./pages/ChallengesPage').then(...));

// Add:
const MissionsPage = lazy(() => import('./pages/MissionsPage').then(m => ({ default: m.MissionsPage })));
const MissionSettingsPage = lazy(() => import('./pages/missions/MissionSettingsPage').then(m => ({ default: m.MissionSettingsPage })));

// Routes: replace /challenges with /missions
<Route path="/missions" element={<MissionsPage />} />
<Route path="/missions/settings" element={<MissionSettingsPage />} />
// Remove: <Route path="/challenges" element={<ChallengesPage />} />
```

**Step 2: Update BottomNavigation**

- 4번째 탭(설정) 자리에 미션 탭 추가하거나, 기존 경로/알림 사이에 미션 탭 삽입
- NAV_ITEMS에 미션 탭 추가:
```typescript
{
  path: '/missions',
  label: '미션',
  matchPaths: ['/missions'],
  icon: (active) => <MissionIcon active={active} />,
},
```
- PREFETCH_MAP에 `/missions` 추가
- useIdlePreload에 MissionsPage import 추가

**Step 3: Commit**

```bash
git add frontend/src/presentation/App.tsx \
  frontend/src/presentation/components/BottomNavigation.tsx
git commit -m "feat(mission): update routing and navigation (challenges → missions)"
```

---

## Task 17: 정리 — 기존 챌린지 참조 제거

**Files:**
- Modify: `frontend/src/presentation/pages/home/HomePage.tsx` — ChallengeQuickCard import 제거
- Keep (비활성): `backend/src/presentation/modules/challenge.module.ts` — 모듈은 유지 (DB 데이터 보존)
- Keep: 기존 Challenge 엔티티 파일들 — 삭제하지 않음 (데이터 보존)

**Context:** 프론트엔드에서 /challenges 관련 import/route 정리. 백엔드는 API는 유지하되 신규 사용 안 함.

**Step 1: Remove frontend challenge references**

- `ChallengesPage` lazy import 제거 (App.tsx — Task 16에서 이미 처리)
- `ChallengeQuickCard` import 제거 (HomePage — Task 15에서 이미 처리)
- useIdlePreload에서 ChallengesPage import 제거

**Step 2: Commit**

```bash
git add frontend/src/presentation/
git commit -m "chore: clean up old challenge references from frontend"
```

---

## Task 18: 통합 빌드 + 타입 체크

**Files:** None (검증만)

**Step 1: Backend build**

```bash
cd backend && npx tsc --noEmit && npm test
```

**Step 2: Frontend build**

```bash
cd frontend && npx tsc --noEmit && npm run build
```

**Step 3: Fix any errors**

**Step 4: Final commit**

```bash
git commit -m "chore: verify full build passes for mission system"
```

---

## 요약

| 태스크 | 영역 | 설명 |
|--------|------|------|
| 1 | Backend Domain | Mission 엔티티 + 이모지 매칭 |
| 2 | Backend Domain | DailyMissionRecord 엔티티 |
| 3 | Backend Domain | MissionScore 엔티티 |
| 4 | Backend Domain | IMissionRepository 인터페이스 |
| 5 | Backend Persistence | TypeORM 엔티티 3개 + DB 등록 |
| 6 | Backend Persistence | MissionRepositoryImpl |
| 7 | Backend Application | ManageMissionUseCase (CRUD) |
| 8 | Backend Application | DailyCheckUseCase (체크/점수) |
| 9 | Backend Application | MissionStatsUseCase (통계) |
| 10 | Backend Presentation | Controller + Module + DTO |
| 11 | Frontend API | MissionApiClient + types |
| 12 | Frontend Query | React Query hooks |
| 13 | Frontend Page | MissionsPage (체크인) |
| 14 | Frontend Page | MissionSettingsPage (관리) |
| 15 | Frontend Home | MissionQuickCard |
| 16 | Frontend Route | App.tsx + BottomNavigation |
| 17 | Frontend Cleanup | 기존 챌린지 참조 제거 |
| 18 | Integration | 전체 빌드 검증 |
