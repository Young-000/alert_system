import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { IMissionRepository } from '@domain/repositories/mission.repository';
import {
  Mission,
  MissionType,
  InvalidMissionTitleError,
} from '@domain/entities/mission.entity';

export const MISSION_REPOSITORY = Symbol('MISSION_REPOSITORY');

const MAX_MISSIONS_PER_TYPE = 3;

/**
 * 도메인 제목 규칙 위반을 400으로 바꾼다.
 * 그대로 던지면 전역 필터가 500 + 'Internal server error'로 덮어 사용자는 사유를 못 받고,
 * 정상적인 입력 오류가 스택 트레이스와 함께 장애 로그에 쌓인다.
 */
function toBadRequestOnInvalidTitle(error: unknown): never {
  if (error instanceof InvalidMissionTitleError) {
    throw new BadRequestException('미션 제목은 1~100자여야 합니다');
  }
  throw error;
}

@Injectable()
export class ManageMissionUseCase {
  constructor(
    @Inject(MISSION_REPOSITORY) private readonly repo: IMissionRepository,
  ) {}

  async createMission(
    userId: string,
    title: string,
    missionType: MissionType,
    emoji?: string,
  ): Promise<Mission> {
    const missions = await this.repo.findByUserId(userId);
    const sameType = missions.filter((m) => m.missionType === missionType);

    // 비활성 미션도 목록에 남아 자리를 차지하므로 제한 대상에 포함한다.
    if (sameType.length >= MAX_MISSIONS_PER_TYPE) {
      throw new BadRequestException(
        `${missionType} 미션은 최대 ${MAX_MISSIONS_PER_TYPE}개까지 설정할 수 있습니다`,
      );
    }

    let mission: Mission;
    try {
      mission = Mission.createNew(userId, title, missionType, emoji);
    } catch (error) {
      toBadRequestOnInvalidTitle(error);
    }
    // 개수가 아니라 마지막 sortOrder 다음 값을 쓴다 — 중간 미션을 지운 뒤 만들면
    // 개수가 남은 sortOrder와 겹쳐 목록 정렬과 순서 변경이 망가진다.
    mission.sortOrder = sameType.reduce(
      (next, m) => Math.max(next, m.sortOrder + 1),
      0,
    );
    return this.repo.saveMission(mission);
  }

  async getUserMissions(userId: string): Promise<Mission[]> {
    return this.repo.findByUserId(userId);
  }

  async updateMission(
    missionId: string,
    userId: string,
    fields: { title?: string; emoji?: string; missionType?: MissionType },
  ): Promise<Mission> {
    const mission = await this.findOwnedMission(missionId, userId);

    // 생성 때만 개수를 세면 타입 변경으로 제한을 우회할 수 있다 —
    // 퇴근 미션 3개가 찬 상태에서 출근 미션의 타입만 바꾸면 4개가 된다.
    if (fields.missionType !== undefined && fields.missionType !== mission.missionType) {
      await this.assertTypeHasRoom(userId, fields.missionType, mission.id);
    }

    try {
      mission.update(fields);
    } catch (error) {
      toBadRequestOnInvalidTitle(error);
    }
    return this.repo.saveMission(mission);
  }

  private async assertTypeHasRoom(
    userId: string,
    missionType: MissionType,
    movingMissionId: string,
  ): Promise<void> {
    const missions = await this.repo.findByUserId(userId);
    const sameType = missions.filter(
      (m) => m.missionType === missionType && m.id !== movingMissionId,
    );

    if (sameType.length >= MAX_MISSIONS_PER_TYPE) {
      throw new BadRequestException(
        `${missionType} 미션은 최대 ${MAX_MISSIONS_PER_TYPE}개까지 설정할 수 있습니다`,
      );
    }
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

  private async findOwnedMission(
    missionId: string,
    userId: string,
  ): Promise<Mission> {
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
