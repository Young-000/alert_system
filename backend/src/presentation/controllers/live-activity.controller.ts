import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveActivityTokenEntity } from '@infrastructure/persistence/typeorm/live-activity-token.entity';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';
import {
  RegisterLiveActivityDto,
  RegisterLiveActivityResponseDto,
  LiveActivityTokenResponseDto,
} from '@application/dto/live-activity.dto';

@Controller('live-activity')
@UseGuards(AuthGuard('jwt'))
export class LiveActivityController {
  private readonly logger = new Logger(LiveActivityController.name);

  constructor(
    @InjectRepository(LiveActivityTokenEntity)
    private readonly tokenRepo: Repository<LiveActivityTokenEntity>,
  ) {}

  /**
   * Register a Live Activity push token.
   * Upserts: if an activityId already exists, update its push token.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RegisterLiveActivityDto,
  ): Promise<RegisterLiveActivityResponseDto> {
    const userId = req.user.userId;

    this.logger.log(
      `Registering Live Activity token for user ${userId}, activityId=${dto.activityId}, mode=${dto.mode}`,
    );

    // Deactivate any existing active tokens for this user (only one Live Activity at a time)
    await this.tokenRepo.update(
      { userId, isActive: true },
      { isActive: false },
    );

    // Upsert: check if activityId already exists
    const existing = await this.tokenRepo.findOne({
      where: { activityId: dto.activityId },
    });

    if (existing) {
      existing.userId = userId;
      existing.pushToken = dto.pushToken;
      existing.mode = dto.mode;
      existing.settingId = dto.settingId ?? null;
      existing.isActive = true;
      await this.tokenRepo.save(existing);

      return { id: existing.id, registered: true };
    }

    const saved = await this.tokenRepo.save({
      userId,
      activityId: dto.activityId,
      pushToken: dto.pushToken,
      mode: dto.mode,
      settingId: dto.settingId ?? null,
      isActive: true,
    });

    return { id: saved.id, registered: true };
  }

  /**
   * Deactivate a Live Activity token by activityId.
   */
  @Delete(':activityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @Param('activityId') activityId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    const userId = req.user.userId;

    this.logger.log(
      `Deactivating Live Activity token for user ${userId}, activityId=${activityId}`,
    );

    const result = await this.tokenRepo.update(
      { activityId, userId },
      { isActive: false },
    );

    if (result.affected === 0) {
      throw new NotFoundException(
        `Live Activity token with activityId ${activityId} not found`,
      );
    }
  }

  /**
   * Get the active Live Activity for the current user.
   */
  @Get('active')
  async getActive(
    @Request() req: AuthenticatedRequest,
  ): Promise<LiveActivityTokenResponseDto | null> {
    const userId = req.user.userId;

    const token = await this.tokenRepo.findOne({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (!token) {
      return null;
    }

    return this.toResponseDto(token);
  }

  private toResponseDto(
    entity: LiveActivityTokenEntity,
  ): LiveActivityTokenResponseDto {
    const dto = new LiveActivityTokenResponseDto();
    dto.id = entity.id;
    dto.activityId = entity.activityId;
    dto.mode = entity.mode as 'commute' | 'return';
    dto.settingId = entity.settingId;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}
