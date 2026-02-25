import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { IMissionRepository } from '@domain/repositories/mission.repository';
import { Mission, MissionType } from '@domain/entities/mission.entity';

export const MISSION_REPOSITORY = Symbol('MISSION_REPOSITORY');

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
    mission.sortOrder = count;
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
