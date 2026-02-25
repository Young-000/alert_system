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
      expect(result.missionType).toBe('commute');
      expect(result.userId).toBe('user-1');
      expect(result.isActive).toBe(true);
      expect(result.sortOrder).toBe(0);
      expect(repo.saveMission).toHaveBeenCalled();
    });

    it('기존 미션이 있으면 sortOrder를 기존 개수로 설정한다', async () => {
      repo.countByUserAndType.mockResolvedValue(2);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.createMission('user-1', '독서', 'commute');
      expect(result.sortOrder).toBe(2);
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
      expect(result[0].title).toBe('독서');
      expect(result[1].title).toBe('회고');
    });

    it('미션이 없으면 빈 배열을 반환한다', async () => {
      repo.findByUserId.mockResolvedValue([]);

      const result = await useCase.getUserMissions('user-1');
      expect(result).toHaveLength(0);
    });
  });

  describe('updateMission', () => {
    it('미션 제목을 수정한다', async () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      repo.findById.mockResolvedValue(mission);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.updateMission(mission.id, 'user-1', { title: '독서 30분' });
      expect(result.title).toBe('독서 30분');
      expect(repo.saveMission).toHaveBeenCalled();
    });

    it('미션 타입을 수정한다', async () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      repo.findById.mockResolvedValue(mission);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.updateMission(mission.id, 'user-1', { missionType: 'return' });
      expect(result.missionType).toBe('return');
    });

    it('다른 사용자의 미션은 수정할 수 없다', async () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      repo.findById.mockResolvedValue(mission);

      await expect(
        useCase.updateMission(mission.id, 'user-2', { title: '해킹' }),
      ).rejects.toThrow('권한이 없습니다');
    });

    it('존재하지 않는 미션을 수정하면 에러를 던진다', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        useCase.updateMission('non-existent', 'user-1', { title: '수정' }),
      ).rejects.toThrow('미션을 찾을 수 없습니다');
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

    it('다른 사용자의 미션은 삭제할 수 없다', async () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      repo.findById.mockResolvedValue(mission);

      await expect(
        useCase.deleteMission(mission.id, 'user-2'),
      ).rejects.toThrow('권한이 없습니다');
    });

    it('존재하지 않는 미션을 삭제하면 에러를 던진다', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        useCase.deleteMission('non-existent', 'user-1'),
      ).rejects.toThrow('미션을 찾을 수 없습니다');
    });
  });

  describe('toggleActive', () => {
    it('미션 활성화를 토글한다 (true → false)', async () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      expect(mission.isActive).toBe(true);

      repo.findById.mockResolvedValue(mission);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.toggleActive(mission.id, 'user-1');
      expect(result.isActive).toBe(false);
      expect(repo.saveMission).toHaveBeenCalled();
    });

    it('다른 사용자의 미션은 토글할 수 없다', async () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      repo.findById.mockResolvedValue(mission);

      await expect(
        useCase.toggleActive(mission.id, 'user-2'),
      ).rejects.toThrow('권한이 없습니다');
    });
  });

  describe('reorder', () => {
    it('미션 순서를 변경한다', async () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      mission.sortOrder = 0;

      repo.findById.mockResolvedValue(mission);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.reorder(mission.id, 'user-1', 2);
      expect(result.sortOrder).toBe(2);
      expect(repo.saveMission).toHaveBeenCalled();
    });

    it('다른 사용자의 미션 순서는 변경할 수 없다', async () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      repo.findById.mockResolvedValue(mission);

      await expect(
        useCase.reorder(mission.id, 'user-2', 1),
      ).rejects.toThrow('권한이 없습니다');
    });
  });
});
