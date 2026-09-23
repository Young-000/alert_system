import { Test, TestingModule } from '@nestjs/testing';
import { UpdateStreakUseCase } from './update-streak.use-case';
import { COMMUTE_STREAK_REPOSITORY } from '@domain/repositories/commute-streak.repository';
import { CommuteStreak } from '@domain/entities/commute-streak.entity';

/**
 * `updateSettings`가 insert(save)와 update 중 무엇을 부르는지는 **조회 결과**로
 * 정해져야 한다. 같은 파일의 `recordCompletion`은 이미 그렇게 판정한다(`!streak`).
 *
 * 예전에는 `!streak.id`로 판정했다. 지금은 `CommuteStreak.createNew`가 id를 비워
 * 두어서 두 기준이 우연히 같은 답을 내지만, 엔티티가 id를 미리 채우도록 바뀌면
 * (uuid를 애플리케이션에서 만드는 흔한 변경) 새 스트릭인데 `update`가 불려
 * **없는 행을 고치고 조용히 아무 일도 일어나지 않는다** — 사용자는 주간 목표를
 * 저장했다고 보지만 다음 조회에 기본값이 돌아온다.
 */
describe('UpdateStreakUseCase.updateSettings 저장 경로', () => {
  let useCase: UpdateStreakUseCase;
  let repository: {
    findByUserId: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    saveDailyLog: jest.Mock;
  };

  const userId = 'user-1';

  beforeEach(async () => {
    repository = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      saveDailyLog: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateStreakUseCase,
        { provide: COMMUTE_STREAK_REPOSITORY, useValue: repository },
      ],
    }).compile();

    useCase = module.get<UpdateStreakUseCase>(UpdateStreakUseCase);
  });

  it('기록이 없으면 save로 새로 넣는다 — 엔티티가 id를 들고 있어도 마찬가지다', async () => {
    repository.findByUserId.mockResolvedValue(null);

    // 엔티티가 id를 미리 채우는 미래를 흉내 낸다. 판정 근거는 엔티티의 id가 아니라
    // "저장소에 없었다"는 사실이어야 한다.
    const withPrefilledId = CommuteStreak.createNew(userId);
    (withPrefilledId as { id?: string }).id = 'pre-generated-uuid';
    jest.spyOn(CommuteStreak, 'createNew').mockReturnValue(withPrefilledId);

    await useCase.updateSettings(userId, { weeklyGoal: 4 });

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('기존 기록이 있으면 update로 고친다', async () => {
    const existing = CommuteStreak.createNew(userId);
    (existing as { id?: string }).id = 'existing-row';
    repository.findByUserId.mockResolvedValue(existing);

    await useCase.updateSettings(userId, { weeklyGoal: 6 });

    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
