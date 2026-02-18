import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  SmartDepartureSetting,
} from '@domain/entities/smart-departure-setting.entity';
import type { DepartureType } from '@domain/entities/smart-departure-setting.entity';
import {
  ISmartDepartureSettingRepository,
  SMART_DEPARTURE_SETTING_REPOSITORY,
} from '@domain/repositories/smart-departure-setting.repository';
import {
  ICommuteRouteRepository,
  COMMUTE_ROUTE_REPOSITORY,
} from '@domain/repositories/commute-route.repository';
import {
  CreateSmartDepartureSettingDto,
  UpdateSmartDepartureSettingDto,
  SmartDepartureSettingResponseDto,
} from '@application/dto/smart-departure.dto';

@Injectable()
export class ManageSmartDepartureUseCase {
  private readonly logger = new Logger(ManageSmartDepartureUseCase.name);

  constructor(
    @Inject(SMART_DEPARTURE_SETTING_REPOSITORY)
    private readonly settingRepo: ISmartDepartureSettingRepository,
    @Inject(COMMUTE_ROUTE_REPOSITORY)
    private readonly routeRepo: ICommuteRouteRepository,
  ) {}

  async getSettingsByUserId(userId: string): Promise<SmartDepartureSettingResponseDto[]> {
    const settings = await this.settingRepo.findByUserId(userId);
    return settings.map((s) => this.toResponseDto(s));
  }

  async createSetting(
    userId: string,
    dto: CreateSmartDepartureSettingDto,
  ): Promise<SmartDepartureSettingResponseDto> {
    // 1. Check unique constraint: one setting per user per departureType
    const existing = await this.settingRepo.findByUserIdAndType(
      userId,
      dto.departureType as DepartureType,
    );
    if (existing) {
      throw new ConflictException(
        `이미 ${dto.departureType === 'commute' ? '출근' : '퇴근'} 설정이 존재합니다.`,
      );
    }

    // 2. Verify route exists and belongs to user
    const route = await this.routeRepo.findById(dto.routeId);
    if (!route) {
      throw new NotFoundException(`경로를 찾을 수 없습니다: ${dto.routeId}`);
    }
    if (route.userId !== userId) {
      throw new ForbiddenException('다른 사용자의 경로에 접근할 수 없습니다.');
    }

    // 3. Create domain entity
    const setting = SmartDepartureSetting.create(
      userId,
      dto.routeId,
      dto.departureType as DepartureType,
      dto.arrivalTarget,
      {
        prepTimeMinutes: dto.prepTimeMinutes,
        activeDays: dto.activeDays,
        preAlerts: dto.preAlerts,
      },
    );

    // 4. Persist
    const saved = await this.settingRepo.save(setting);
    this.logger.log(
      `Created smart departure setting for user ${userId}: ${dto.departureType} at ${dto.arrivalTarget}`,
    );

    return this.toResponseDto(saved);
  }

  async updateSetting(
    id: string,
    userId: string,
    dto: UpdateSmartDepartureSettingDto,
  ): Promise<SmartDepartureSettingResponseDto> {
    const setting = await this.findAndVerifyOwnership(id, userId);

    // Verify route if changed
    if (dto.routeId && dto.routeId !== setting.routeId) {
      const route = await this.routeRepo.findById(dto.routeId);
      if (!route) {
        throw new NotFoundException(`경로를 찾을 수 없습니다: ${dto.routeId}`);
      }
      if (route.userId !== userId) {
        throw new ForbiddenException('다른 사용자의 경로에 접근할 수 없습니다.');
      }
    }

    const updated = setting.withUpdatedFields({
      routeId: dto.routeId,
      arrivalTarget: dto.arrivalTarget,
      prepTimeMinutes: dto.prepTimeMinutes,
      activeDays: dto.activeDays,
      preAlerts: dto.preAlerts,
    });

    await this.settingRepo.update(updated);
    this.logger.log(`Updated smart departure setting ${id} for user ${userId}`);

    return this.toResponseDto(updated);
  }

  async deleteSetting(id: string, userId: string): Promise<void> {
    await this.findAndVerifyOwnership(id, userId);
    await this.settingRepo.delete(id);
    this.logger.log(`Deleted smart departure setting ${id} for user ${userId}`);
  }

  async toggleSetting(
    id: string,
    userId: string,
  ): Promise<SmartDepartureSettingResponseDto> {
    const setting = await this.findAndVerifyOwnership(id, userId);
    const toggled = setting.toggleEnabled();

    await this.settingRepo.update(toggled);
    this.logger.log(
      `Toggled smart departure setting ${id}: isEnabled=${toggled.isEnabled}`,
    );

    return this.toResponseDto(toggled);
  }

  private async findAndVerifyOwnership(
    id: string,
    userId: string,
  ): Promise<SmartDepartureSetting> {
    const setting = await this.settingRepo.findById(id);
    if (!setting) {
      throw new NotFoundException(`스마트 출발 설정을 찾을 수 없습니다: ${id}`);
    }
    if (setting.userId !== userId) {
      throw new ForbiddenException('다른 사용자의 설정에 접근할 수 없습니다.');
    }
    return setting;
  }

  private toResponseDto(setting: SmartDepartureSetting): SmartDepartureSettingResponseDto {
    const dto = new SmartDepartureSettingResponseDto();
    dto.id = setting.id;
    dto.userId = setting.userId;
    dto.routeId = setting.routeId;
    dto.departureType = setting.departureType;
    dto.arrivalTarget = setting.arrivalTarget;
    dto.prepTimeMinutes = setting.prepTimeMinutes;
    dto.isEnabled = setting.isEnabled;
    dto.activeDays = setting.activeDays;
    dto.preAlerts = setting.preAlerts;
    dto.createdAt = setting.createdAt.toISOString();
    dto.updatedAt = setting.updatedAt.toISOString();
    return dto;
  }
}
