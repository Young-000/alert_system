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

    it('totalMissions와 completedMissions를 응답에 포함한다', async () => {
      // 화면이 "N/M 달성"을 그리려면 집계 수치가 응답에 실려야 한다.
      // 계산만 하고 반환에서 누락하면 클라이언트가 undefined를 읽는다.
      const commute1 = Mission.createNew(USER_ID, '영어 단어', 'commute');
      const commute2 = Mission.createNew(USER_ID, '뉴스 읽기', 'commute');
      const returnMission = Mission.createNew(USER_ID, '회고', 'return');
      const record = DailyMissionRecord.createForToday(USER_ID, commute1.id, TODAY);
      record.toggleCheck();

      repo.findByUserId.mockResolvedValue([commute1, commute2, returnMission]);
      repo.findDailyRecords.mockResolvedValue([record]);
      repo.findScore.mockResolvedValue(null);
      repo.findLatestStreak.mockResolvedValue(0);

      const result = await useCase.getDailyStatus(USER_ID, TODAY);

      expect(result.totalMissions).toBe(3);
      expect(result.completedMissions).toBe(1);
    });

    it('비활성 미션은 집계 수치에서 제외한다', async () => {
      const active = Mission.createNew(USER_ID, '영어 단어', 'commute');
      const inactive = Mission.createNew(USER_ID, '독서', 'return');
      inactive.toggleActive(); // isActive = false

      repo.findByUserId.mockResolvedValue([active, inactive]);
      repo.findDailyRecords.mockResolvedValue([]);
      repo.findScore.mockResolvedValue(null);
      repo.findLatestStreak.mockResolvedValue(0);

      const result = await useCase.getDailyStatus(USER_ID, TODAY);

      expect(result.totalMissions).toBe(1);
      expect(result.completedMissions).toBe(0);
    });

    it('미션이 없으면 빈 결과를 반환한다', async () => {
      repo.findByUserId.mockResolvedValue([]);
      repo.findDailyRecords.mockResolvedValue([]);
      repo.findScore.mockResolvedValue(null);
      repo.findLatestStreak.mockResolvedValue(0);

      const result = await useCase.getDailyStatus(USER_ID, TODAY);

      expect(result.commuteMissions).toHaveLength(0);
      expect(result.returnMissions).toHaveLength(0);
      expect(result.totalMissions).toBe(0);
      expect(result.completedMissions).toBe(0);
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
      // 오늘 이전(exclusive)으로 조회해야 한다 — 날짜를 안 넘기면 방금 저장한
      // 오늘 행이 previousStreak으로 잡혀 미션 2개 이상이면 스트릭이 매일 리셋된다
      expect(repo.findLatestStreak).toHaveBeenCalledWith(USER_ID, TODAY);
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

    it('비활성 미션의 완료 기록은 집계에서 제외한다 (달성률 100% 초과 방지)', async () => {
      // 미션을 완료한 뒤 비활성화하면 분모(활성 미션)만 줄고 분자(완료 기록)는 남아
      // 달성률이 100을 넘는다. MissionScore.calculate는 `=== 100`일 때만 스트릭을
      // 이어가므로, 150%가 되는 순간 스트릭이 조용히 0으로 끊긴다.
      const active = Mission.createNew(USER_ID, '영어 단어', 'commute');
      const retired = Mission.createNew(USER_ID, '독서', 'commute');
      retired.toggleActive(); // isActive = false

      const activeRecord = DailyMissionRecord.createForToday(USER_ID, active.id, TODAY);
      activeRecord.toggleCheck();
      const retiredRecord = DailyMissionRecord.createForToday(USER_ID, retired.id, TODAY);
      retiredRecord.toggleCheck();

      repo.findById.mockResolvedValue(active);
      repo.findDailyRecord.mockResolvedValue(null);
      repo.saveDailyRecord.mockImplementation(async (r) => r);
      repo.findByUserId.mockResolvedValue([active, retired]);
      repo.findDailyRecords.mockResolvedValue([activeRecord, retiredRecord]);
      repo.findLatestStreak.mockResolvedValue(4);
      repo.findScore.mockResolvedValue(null);
      repo.saveScore.mockImplementation(async (s) => s);

      await useCase.toggleCheck(USER_ID, active.id, TODAY);

      expect(repo.saveScore).toHaveBeenCalledWith(
        expect.objectContaining({
          totalMissions: 1,
          completedMissions: 1,
          completionRate: 100,
          streakDay: 5, // previousStreak(4) + 1
        }),
      );
    });

    it('비활성 미션의 완료 기록이 활성 미션의 미완료를 가리지 않는다', async () => {
      // 반대 방향: 활성 미션은 아직 미완료인데 비활성 미션의 완료 기록이
      // 그 자리를 메우면 "오늘 다 했다"고 잘못 판정해 스트릭이 부당하게 올라간다.
      const active = Mission.createNew(USER_ID, '영어 단어', 'commute');
      const retired = Mission.createNew(USER_ID, '독서', 'commute');
      retired.toggleActive(); // isActive = false

      const retiredRecord = DailyMissionRecord.createForToday(USER_ID, retired.id, TODAY);
      retiredRecord.toggleCheck();

      repo.findById.mockResolvedValue(active);
      repo.findDailyRecord.mockResolvedValue(null);
      repo.saveDailyRecord.mockImplementation(async (r) => r);
      repo.findByUserId.mockResolvedValue([active, retired]);
      repo.findDailyRecords.mockResolvedValue([retiredRecord]);
      repo.findLatestStreak.mockResolvedValue(4);
      repo.findScore.mockResolvedValue(null);
      repo.saveScore.mockImplementation(async (s) => s);

      await useCase.toggleCheck(USER_ID, active.id, TODAY);

      expect(repo.saveScore).toHaveBeenCalledWith(
        expect.objectContaining({
          totalMissions: 1,
          completedMissions: 0,
          completionRate: 0,
          streakDay: 0,
        }),
      );
    });

    it('삭제된 미션의 잔존 기록도 집계에서 제외한다', async () => {
      // 미션이 지워져도 그날의 기록 행이 남아 있으면 같은 방식으로 분자가 부풀려진다.
      const active = Mission.createNew(USER_ID, '영어 단어', 'commute');
      const orphanRecord = DailyMissionRecord.createForToday(USER_ID, 'deleted-mission-id', TODAY);
      orphanRecord.toggleCheck();

      repo.findById.mockResolvedValue(active);
      repo.findDailyRecord.mockResolvedValue(null);
      repo.saveDailyRecord.mockImplementation(async (r) => r);
      repo.findByUserId.mockResolvedValue([active]);
      repo.findDailyRecords.mockResolvedValue([orphanRecord]);
      repo.findLatestStreak.mockResolvedValue(0);
      repo.findScore.mockResolvedValue(null);
      repo.saveScore.mockImplementation(async (s) => s);

      await useCase.toggleCheck(USER_ID, active.id, TODAY);

      expect(repo.saveScore).toHaveBeenCalledWith(
        expect.objectContaining({
          totalMissions: 1,
          completedMissions: 0,
          completionRate: 0,
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
