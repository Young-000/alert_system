import { NotFoundException } from '@nestjs/common';
import { DailyCheckUseCase } from './daily-check.use-case';
import { IMissionRepository } from '@domain/repositories/mission.repository';
import { Mission } from '@domain/entities/mission.entity';
import { DailyMissionRecord } from '@domain/entities/daily-mission-record.entity';
import { MissionScore } from '@domain/entities/mission-score.entity';

describe('DailyCheckUseCase', () => {
  let useCase: DailyCheckUseCase;
  let repo: jest.Mocked<IMissionRepository>;

  const TODAY = '2026-02-25';
  const USER_ID = 'user-1';

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
    it('active 미션만 반환한다', async () => {
      const activeMission = Mission.createNew(USER_ID, '영어 단어', 'commute');
      const inactiveMission = Mission.createNew(USER_ID, '독서', 'return');
      inactiveMission.toggleActive(); // isActive = false

      repo.findByUserId.mockResolvedValue([activeMission, inactiveMission]);
      repo.findDailyRecords.mockResolvedValue([]);
      repo.findScore.mockResolvedValue(null);
      repo.findLatestStreak.mockResolvedValue(0);

      const result = await useCase.getDailyStatus(USER_ID, TODAY);

      expect(result.commuteMissions).toHaveLength(1);
      expect(result.returnMissions).toHaveLength(0);
      expect(result.commuteMissions[0].mission.title).toBe('영어 단어');
    });

    it('commute/return 미션을 분리하여 반환한다', async () => {
      const commuteMission = Mission.createNew(USER_ID, '영어 단어', 'commute');
      const returnMission = Mission.createNew(USER_ID, '회고', 'return');

      repo.findByUserId.mockResolvedValue([commuteMission, returnMission]);
      repo.findDailyRecords.mockResolvedValue([]);
      repo.findScore.mockResolvedValue(null);
      repo.findLatestStreak.mockResolvedValue(0);

      const result = await useCase.getDailyStatus(USER_ID, TODAY);

      expect(result.commuteMissions).toHaveLength(1);
      expect(result.commuteMissions[0].mission.id).toBe(commuteMission.id);
      expect(result.returnMissions).toHaveLength(1);
      expect(result.returnMissions[0].mission.id).toBe(returnMission.id);
    });

    it('기존 체크 기록이 있으면 isCompleted를 반영한다', async () => {
      const mission = Mission.createNew(USER_ID, '영어 단어', 'commute');
      const record = DailyMissionRecord.createForToday(USER_ID, mission.id, TODAY);
      record.toggleCheck(); // isCompleted = true

      repo.findByUserId.mockResolvedValue([mission]);
      repo.findDailyRecords.mockResolvedValue([record]);
      repo.findScore.mockResolvedValue(null);
      repo.findLatestStreak.mockResolvedValue(0);

      const result = await useCase.getDailyStatus(USER_ID, TODAY);

      expect(result.commuteMissions[0].record).not.toBeNull();
      expect(result.commuteMissions[0].record!.isCompleted).toBe(true);
    });

    it('체크 기록이 없으면 record가 null이다', async () => {
      const mission = Mission.createNew(USER_ID, '영어 단어', 'commute');

      repo.findByUserId.mockResolvedValue([mission]);
      repo.findDailyRecords.mockResolvedValue([]);
      repo.findScore.mockResolvedValue(null);
      repo.findLatestStreak.mockResolvedValue(0);

      const result = await useCase.getDailyStatus(USER_ID, TODAY);

      expect(result.commuteMissions[0].record).toBeNull();
    });

    it('completionRate와 streakDay를 반환한다', async () => {
      const mission1 = Mission.createNew(USER_ID, '영어 단어', 'commute');
      const mission2 = Mission.createNew(USER_ID, '독서', 'commute');
      const record = DailyMissionRecord.createForToday(USER_ID, mission1.id, TODAY);
      record.toggleCheck();

      repo.findByUserId.mockResolvedValue([mission1, mission2]);
      repo.findDailyRecords.mockResolvedValue([record]);
      repo.findScore.mockResolvedValue(null);
      repo.findLatestStreak.mockResolvedValue(3);

      const result = await useCase.getDailyStatus(USER_ID, TODAY);

      expect(result.completionRate).toBe(50); // 1 of 2
      expect(result.streakDay).toBe(3);
    });

    it('미션이 없으면 빈 결과를 반환한다', async () => {
      repo.findByUserId.mockResolvedValue([]);
      repo.findDailyRecords.mockResolvedValue([]);
      repo.findScore.mockResolvedValue(null);
      repo.findLatestStreak.mockResolvedValue(0);

      const result = await useCase.getDailyStatus(USER_ID, TODAY);

      expect(result.commuteMissions).toHaveLength(0);
      expect(result.returnMissions).toHaveLength(0);
      expect(result.completionRate).toBe(0);
      expect(result.streakDay).toBe(0);
    });

    it('score가 존재하면 streakDay를 score에서 가져온다', async () => {
      const mission = Mission.createNew(USER_ID, '영어 단어', 'commute');
      const score = new MissionScore({
        userId: USER_ID,
        date: TODAY,
        totalMissions: 1,
        completedMissions: 1,
        completionRate: 100,
        streakDay: 5,
      });

      repo.findByUserId.mockResolvedValue([mission]);
      repo.findDailyRecords.mockResolvedValue([]);
      repo.findScore.mockResolvedValue(score);
      repo.findLatestStreak.mockResolvedValue(0); // should not be used

      const result = await useCase.getDailyStatus(USER_ID, TODAY);

      expect(result.streakDay).toBe(5);
    });
  });

  describe('toggleCheck', () => {
    it('미완료 미션을 완료로 토글한다', async () => {
      const mission = Mission.createNew(USER_ID, '영어 단어', 'commute');
      repo.findById.mockResolvedValue(mission);
      repo.findDailyRecord.mockResolvedValue(null);
      repo.saveDailyRecord.mockImplementation(async (r) => r);
      // For recalculateScore
      repo.findByUserId.mockResolvedValue([mission]);
      repo.findDailyRecords.mockResolvedValue([]);
      repo.findLatestStreak.mockResolvedValue(0);
      repo.findScore.mockResolvedValue(null);
      repo.saveScore.mockImplementation(async (s) => s);

      const result = await useCase.toggleCheck(USER_ID, mission.id, TODAY);

      expect(result.isCompleted).toBe(true);
      expect(result.completedAt).not.toBeNull();
      expect(repo.saveDailyRecord).toHaveBeenCalled();
    });

    it('기존 레코드가 없으면 새로 생성하여 완료로 토글한다', async () => {
      const mission = Mission.createNew(USER_ID, '영어 단어', 'commute');
      repo.findById.mockResolvedValue(mission);
      repo.findDailyRecord.mockResolvedValue(null);
      repo.saveDailyRecord.mockImplementation(async (r) => r);
      repo.findByUserId.mockResolvedValue([mission]);
      repo.findDailyRecords.mockResolvedValue([]);
      repo.findLatestStreak.mockResolvedValue(0);
      repo.findScore.mockResolvedValue(null);
      repo.saveScore.mockImplementation(async (s) => s);

      const result = await useCase.toggleCheck(USER_ID, mission.id, TODAY);

      expect(result.isCompleted).toBe(true);
      expect(repo.saveDailyRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          missionId: mission.id,
          date: TODAY,
          isCompleted: true,
        }),
      );
    });

    it('완료된 미션을 미완료로 토글한다', async () => {
      const mission = Mission.createNew(USER_ID, '영어 단어', 'commute');
      const existingRecord = DailyMissionRecord.createForToday(USER_ID, mission.id, TODAY);
      existingRecord.toggleCheck(); // already completed

      repo.findById.mockResolvedValue(mission);
      repo.findDailyRecord.mockResolvedValue(existingRecord);
      repo.saveDailyRecord.mockImplementation(async (r) => r);
      repo.findByUserId.mockResolvedValue([mission]);
      repo.findDailyRecords.mockResolvedValue([]);
      repo.findLatestStreak.mockResolvedValue(0);
      repo.findScore.mockResolvedValue(null);
      repo.saveScore.mockImplementation(async (s) => s);

      const result = await useCase.toggleCheck(USER_ID, mission.id, TODAY);

      expect(result.isCompleted).toBe(false);
      expect(result.completedAt).toBeNull();
    });

    it('존재하지 않는 미션이면 에러를 던진다', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        useCase.toggleCheck(USER_ID, 'non-existent', TODAY),
      ).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 미션은 토글할 수 없다', async () => {
      const mission = Mission.createNew('other-user', '영어 단어', 'commute');
      repo.findById.mockResolvedValue(mission);

      await expect(
        useCase.toggleCheck(USER_ID, mission.id, TODAY),
      ).rejects.toThrow('권한이 없습니다');
    });

    it('토글 후 recalculateScore가 호출된다 (saveScore 호출 확인)', async () => {
      const mission = Mission.createNew(USER_ID, '영어 단어', 'commute');
      repo.findById.mockResolvedValue(mission);
      repo.findDailyRecord.mockResolvedValue(null);
      repo.saveDailyRecord.mockImplementation(async (r) => r);
      repo.findByUserId.mockResolvedValue([mission]);
      // After toggle, 1 record will be completed
      const completedRecord = DailyMissionRecord.createForToday(USER_ID, mission.id, TODAY);
      completedRecord.toggleCheck();
      repo.findDailyRecords.mockResolvedValue([completedRecord]);
      repo.findLatestStreak.mockResolvedValue(2);
      repo.findScore.mockResolvedValue(null);
      repo.saveScore.mockImplementation(async (s) => s);

      await useCase.toggleCheck(USER_ID, mission.id, TODAY);

      expect(repo.saveScore).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          date: TODAY,
          totalMissions: 1,
          completedMissions: 1,
          completionRate: 100,
          streakDay: 3, // previousStreak(2) + 1 since 100%
        }),
      );
    });

    it('일부만 완료하면 streak가 0이다', async () => {
      const mission1 = Mission.createNew(USER_ID, '영어 단어', 'commute');
      const mission2 = Mission.createNew(USER_ID, '독서', 'commute');

      repo.findById.mockResolvedValue(mission1);
      repo.findDailyRecord.mockResolvedValue(null);
      repo.saveDailyRecord.mockImplementation(async (r) => r);
      repo.findByUserId.mockResolvedValue([mission1, mission2]);
      // Only mission1 is completed
      const completedRecord = DailyMissionRecord.createForToday(USER_ID, mission1.id, TODAY);
      completedRecord.toggleCheck();
      repo.findDailyRecords.mockResolvedValue([completedRecord]);
      repo.findLatestStreak.mockResolvedValue(5);
      repo.findScore.mockResolvedValue(null);
      repo.saveScore.mockImplementation(async (s) => s);

      await useCase.toggleCheck(USER_ID, mission1.id, TODAY);

      expect(repo.saveScore).toHaveBeenCalledWith(
        expect.objectContaining({
          completionRate: 50,
          streakDay: 0, // not 100%, streak resets
        }),
      );
    });

    it('기존 score가 있으면 업데이트한다 (id 유지)', async () => {
      const mission = Mission.createNew(USER_ID, '영어 단어', 'commute');
      const existingScore = new MissionScore({
        id: 'existing-score-id',
        userId: USER_ID,
        date: TODAY,
        totalMissions: 1,
        completedMissions: 0,
        completionRate: 0,
        streakDay: 0,
      });

      repo.findById.mockResolvedValue(mission);
      repo.findDailyRecord.mockResolvedValue(null);
      repo.saveDailyRecord.mockImplementation(async (r) => r);
      repo.findByUserId.mockResolvedValue([mission]);
      const completedRecord = DailyMissionRecord.createForToday(USER_ID, mission.id, TODAY);
      completedRecord.toggleCheck();
      repo.findDailyRecords.mockResolvedValue([completedRecord]);
      repo.findLatestStreak.mockResolvedValue(0);
      repo.findScore.mockResolvedValue(existingScore);
      repo.saveScore.mockImplementation(async (s) => s);

      await useCase.toggleCheck(USER_ID, mission.id, TODAY);

      expect(repo.saveScore).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'existing-score-id', // reuses existing score id
          completionRate: 100,
        }),
      );
    });
  });

  describe('getDailyScore', () => {
    it('오늘의 점수를 반환한다', async () => {
      const score = new MissionScore({
        userId: USER_ID,
        date: TODAY,
        totalMissions: 3,
        completedMissions: 2,
        completionRate: 67,
        streakDay: 0,
      });
      repo.findScore.mockResolvedValue(score);

      const result = await useCase.getDailyScore(USER_ID, TODAY);

      expect(result).not.toBeNull();
      expect(result!.totalMissions).toBe(3);
      expect(result!.completedMissions).toBe(2);
      expect(result!.completionRate).toBe(67);
    });

    it('점수가 없으면 null을 반환한다', async () => {
      repo.findScore.mockResolvedValue(null);

      const result = await useCase.getDailyScore(USER_ID, TODAY);

      expect(result).toBeNull();
    });
  });
});
