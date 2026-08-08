import { BadRequestException } from '@nestjs/common';
import { ManageMissionUseCase } from './manage-mission.use-case';
import { IMissionRepository } from '@domain/repositories/mission.repository';
import { Mission, MissionType } from '@domain/entities/mission.entity';

describe('ManageMissionUseCase', () => {
  let useCase: ManageMissionUseCase;
  let repo: jest.Mocked<IMissionRepository>;

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
    useCase = new ManageMissionUseCase(repo);
  });

  /** sortOrder/isActive를 지정한 기존 미션 */
  function existing(
    sortOrder: number,
    options: { missionType?: MissionType; isActive?: boolean } = {},
  ): Mission {
    return new Mission({
      userId: 'user-1',
      title: `미션 ${sortOrder}`,
      missionType: options.missionType ?? 'commute',
      isActive: options.isActive ?? true,
      sortOrder,
    });
  }

  describe('createMission', () => {
    it('미션을 생성한다', async () => {
      repo.findByUserId.mockResolvedValue([]);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.createMission('user-1', '영어 단어', 'commute');
      expect(result.title).toBe('영어 단어');
      expect(result.missionType).toBe('commute');
      expect(result.userId).toBe('user-1');
      expect(result.isActive).toBe(true);
      expect(result.sortOrder).toBe(0);
      expect(repo.saveMission).toHaveBeenCalled();
    });

    it('기존 미션이 있으면 마지막 sortOrder 다음 값을 쓴다', async () => {
      repo.findByUserId.mockResolvedValue([existing(0), existing(1)]);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.createMission('user-1', '독서', 'commute');
      expect(result.sortOrder).toBe(2);
    });

    it('다른 타입 미션의 sortOrder는 계산에 넣지 않는다', async () => {
      repo.findByUserId.mockResolvedValue([
        existing(0, { missionType: 'return' }),
        existing(1, { missionType: 'return' }),
      ]);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.createMission('user-1', '독서', 'commute');
      expect(result.sortOrder).toBe(0);
    });

    // 회귀 방지: sortOrder를 "개수"로 잡으면 중간 미션을 지운 뒤 만든 미션이
    // 남아 있는 미션과 같은 sortOrder를 갖는다. 그러면 목록 정렬이 비결정적이 되고
    // 순서 변경(swap) 버튼이 같은 값을 두 번 써서 아무 일도 하지 않는다.
    it('중간 미션을 삭제한 뒤 만들어도 기존 sortOrder와 겹치지 않는다', async () => {
      repo.findByUserId.mockResolvedValue([existing(0), existing(2)]);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.createMission('user-1', '독서', 'commute');
      expect(result.sortOrder).toBe(3);
    });

    // 회귀 방지: 비활성 미션도 목록에 남아 자리를 차지하므로 sortOrder를 점유한다.
    it('비활성 미션의 sortOrder도 피해서 배정한다', async () => {
      repo.findByUserId.mockResolvedValue([
        existing(0),
        existing(1, { isActive: false }),
      ]);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.createMission('user-1', '독서', 'commute');
      expect(result.sortOrder).toBe(2);
    });

    it('같은 타입 미션이 3개면 에러를 던진다', async () => {
      repo.findByUserId.mockResolvedValue([existing(0), existing(1), existing(2)]);

      await expect(
        useCase.createMission('user-1', '네 번째', 'commute'),
      ).rejects.toThrow('commute 미션은 최대 3개까지 설정할 수 있습니다');
    });

    // 회귀 방지: 활성 미션만 세면 3개 중 하나를 끄고 새로 만든 뒤 다시 켜서
    // 유형별 3개 제한을 넘길 수 있었다. 프론트엔드는 비활성 포함 3개에서 추가를 막는다.
    it('비활성 미션을 포함해 3개면 에러를 던진다', async () => {
      repo.findByUserId.mockResolvedValue([
        existing(0),
        existing(1, { isActive: false }),
        existing(2),
      ]);

      await expect(
        useCase.createMission('user-1', '네 번째', 'commute'),
      ).rejects.toThrow('commute 미션은 최대 3개까지 설정할 수 있습니다');
    });

    it('공백뿐인 제목은 400으로 거절한다', async () => {
      repo.findByUserId.mockResolvedValue([]);

      await expect(
        useCase.createMission('user-1', '   ', 'commute'),
      ).rejects.toBeInstanceOf(BadRequestException);
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
      repo.findByUserId.mockResolvedValue([mission]);
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

    it('공백뿐인 제목은 400으로 거절한다', async () => {
      // bare Error를 던지면 전역 필터가 500 + Internal server error로 바꾼다.
      const mission = Mission.createNew('user-1', '독서', 'commute');
      repo.findById.mockResolvedValue(mission);

      await expect(
        useCase.updateMission(mission.id, 'user-1', { title: '   ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('타입을 바꿀 때 대상 타입이 이미 최대치면 거절한다', async () => {
      // 생성 때만 3개 제한을 걸면, 타입 변경으로 제한을 우회할 수 있다.
      const target = Mission.createNew('user-1', '독서', 'commute');
      repo.findById.mockResolvedValue(target);
      repo.findByUserId.mockResolvedValue([
        target,
        existing(0, { missionType: 'return' }),
        existing(1, { missionType: 'return' }),
        existing(2, { missionType: 'return' }),
      ]);

      await expect(
        useCase.updateMission(target.id, 'user-1', { missionType: 'return' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('같은 타입 안에서의 수정은 개수 제한에 걸리지 않는다', async () => {
      const target = Mission.createNew('user-1', '독서', 'commute');
      repo.findById.mockResolvedValue(target);
      repo.findByUserId.mockResolvedValue([
        target,
        existing(1, { missionType: 'commute' }),
        existing(2, { missionType: 'commute' }),
      ]);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.updateMission(target.id, 'user-1', {
        title: '독서 30분',
        missionType: 'commute',
      });
      expect(result.title).toBe('독서 30분');
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

  describe('emoji 보존', () => {
    it('생성 시 사용자가 고른 emoji를 저장한다', async () => {
      repo.findByUserId.mockResolvedValue([]);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.createMission('user-1', '영어 단어', 'commute', '🧘');
      expect(result.emoji).toBe('🧘');
    });

    it('수정 시 사용자가 고른 emoji를 저장한다', async () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      repo.findById.mockResolvedValue(mission);
      repo.saveMission.mockImplementation(async (m) => m);

      const result = await useCase.updateMission(mission.id, 'user-1', {
        title: '독서하기',
        emoji: '🎧',
      });
      expect(result.emoji).toBe('🎧');
    });
  });
});
