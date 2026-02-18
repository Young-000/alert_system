import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ManageSmartDepartureUseCase } from '@application/use-cases/manage-smart-departure.use-case';
import { CalculateDepartureUseCase } from '@application/use-cases/calculate-departure.use-case';
import { ScheduleDepartureAlertsUseCase } from '@application/use-cases/schedule-departure-alerts.use-case';
import {
  CreateSmartDepartureSettingDto,
  UpdateSmartDepartureSettingDto,
  SmartDepartureSettingResponseDto,
  SmartDepartureTodayResponseDto,
  CalculateResponseDto,
} from '@application/dto/smart-departure.dto';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

@Controller('smart-departure')
@UseGuards(AuthGuard('jwt'))
export class SmartDepartureController {
  private readonly logger = new Logger(SmartDepartureController.name);

  constructor(
    private readonly manageDeparture: ManageSmartDepartureUseCase,
    private readonly calculateDeparture: CalculateDepartureUseCase,
    private readonly scheduleAlerts: ScheduleDepartureAlertsUseCase,
  ) {}

  /**
   * 내 스마트 출발 설정 조회 (출근 + 퇴근)
   */
  @Get('settings')
  async getSettings(
    @Request() req: AuthenticatedRequest,
  ): Promise<SmartDepartureSettingResponseDto[]> {
    return this.manageDeparture.getSettingsByUserId(req.user.userId);
  }

  /**
   * 스마트 출발 설정 생성
   */
  @Post('settings')
  @HttpCode(HttpStatus.CREATED)
  async createSetting(
    @Body() dto: CreateSmartDepartureSettingDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<SmartDepartureSettingResponseDto> {
    this.logger.log(
      `Creating smart departure setting for user ${req.user.userId}: ${dto.departureType} at ${dto.arrivalTarget}`,
    );

    const setting = await this.manageDeparture.createSetting(
      req.user.userId,
      dto,
    );

    // Trigger initial calculation for today
    try {
      await this.calculateDeparture.calculateForToday(req.user.userId);
    } catch (error) {
      this.logger.warn(
        `Initial calculation failed for user ${req.user.userId}: ${error}`,
      );
    }

    return setting;
  }

  /**
   * 스마트 출발 설정 수정
   */
  @Put('settings/:id')
  async updateSetting(
    @Param('id') id: string,
    @Body() dto: UpdateSmartDepartureSettingDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<SmartDepartureSettingResponseDto> {
    this.logger.log(
      `Updating smart departure setting ${id} for user ${req.user.userId}`,
    );

    const setting = await this.manageDeparture.updateSetting(
      id,
      req.user.userId,
      dto,
    );

    // Trigger recalculation for today
    try {
      await this.calculateDeparture.calculateForToday(req.user.userId);
    } catch (error) {
      this.logger.warn(
        `Recalculation failed after update for user ${req.user.userId}: ${error}`,
      );
    }

    return setting;
  }

  /**
   * 스마트 출발 설정 삭제
   */
  @Delete('settings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSetting(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    this.logger.log(
      `Deleting smart departure setting ${id} for user ${req.user.userId}`,
    );
    await this.manageDeparture.deleteSetting(id, req.user.userId);
  }

  /**
   * 스마트 출발 활성/비활성 토글
   */
  @Patch('settings/:id/toggle')
  async toggleSetting(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<SmartDepartureSettingResponseDto> {
    this.logger.log(
      `Toggling smart departure setting ${id} for user ${req.user.userId}`,
    );
    return this.manageDeparture.toggleSetting(id, req.user.userId);
  }

  /**
   * 오늘의 출발 정보 조회 (출근 + 퇴근)
   */
  @Get('today')
  async getToday(
    @Request() req: AuthenticatedRequest,
  ): Promise<SmartDepartureTodayResponseDto> {
    return this.calculateDeparture.getTodayDeparture(req.user.userId);
  }

  /**
   * 수동 재계산 요청
   */
  @Post('calculate')
  async calculate(
    @Request() req: AuthenticatedRequest,
  ): Promise<CalculateResponseDto> {
    this.logger.log(
      `Manual recalculation requested by user ${req.user.userId}`,
    );

    const recalculated = await this.calculateDeparture.calculateForToday(
      req.user.userId,
    );

    const response = new CalculateResponseDto();
    response.recalculated = recalculated;
    response.message = `${recalculated.length}개 설정이 재계산되었습니다.`;
    return response;
  }
}
