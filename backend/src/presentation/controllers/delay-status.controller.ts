import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RouteDelayCheckService } from '@application/services/route-delay-check.service';
import { AlternativeSuggestionService } from '@application/services/alternative-suggestion.service';
import {
  COMMUTE_ROUTE_REPOSITORY,
  ICommuteRouteRepository,
} from '@domain/repositories/commute-route.repository';
import {
  ALTERNATIVE_MAPPING_REPOSITORY,
  IAlternativeMappingRepository,
} from '@domain/repositories/alternative-mapping.repository';
import { AlternativeMapping } from '@domain/entities/alternative-mapping.entity';
import {
  DelayStatusResponseDto,
  AlternativeMappingResponseDto,
  CreateAlternativeMappingDto,
} from '@application/dto/delay-status.dto';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class DelayStatusController {
  private readonly logger = new Logger(DelayStatusController.name);

  constructor(
    private readonly delayCheckService: RouteDelayCheckService,
    private readonly alternativeSuggestionService: AlternativeSuggestionService,
    @Inject(COMMUTE_ROUTE_REPOSITORY)
    private readonly routeRepository: ICommuteRouteRepository,
    @Inject(ALTERNATIVE_MAPPING_REPOSITORY)
    private readonly mappingRepository: IAlternativeMappingRepository,
  ) {}

  /**
   * Check real-time delay status for a route's transit segments
   */
  @Get('routes/:routeId/delay-status')
  async getDelayStatus(
    @Param('routeId') routeId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<DelayStatusResponseDto> {
    const route = await this.routeRepository.findById(routeId);

    if (!route) {
      throw new NotFoundException('경로를 찾을 수 없습니다.');
    }

    if (route.userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 경로에 접근할 수 없습니다.');
    }

    this.logger.log(`Checking delay status for route ${routeId}`);

    const delayResult = await this.delayCheckService.checkRouteDelays(route);
    const alternatives = await this.alternativeSuggestionService.findAlternatives(
      delayResult.segments,
    );

    return {
      routeId: route.id,
      routeName: route.name,
      checkedAt: new Date().toISOString(),
      overallStatus: delayResult.overallStatus,
      totalExpectedDuration: delayResult.totalExpectedDuration,
      totalEstimatedDuration: delayResult.totalEstimatedDuration,
      totalDelayMinutes: delayResult.totalDelayMinutes,
      segments: delayResult.segments,
      alternatives,
    };
  }

  /**
   * List all alternative mappings
   */
  @Get('alternatives/mappings')
  async listMappings(): Promise<{ mappings: AlternativeMappingResponseDto[] }> {
    const mappings = await this.mappingRepository.findAll();
    return {
      mappings: mappings.map((m) => this.toMappingResponse(m)),
    };
  }

  /**
   * Create a new alternative mapping
   */
  @Post('alternatives/mappings')
  async createMapping(
    @Body() dto: CreateAlternativeMappingDto,
  ): Promise<AlternativeMappingResponseDto> {
    this.logger.log(
      `Creating alternative mapping: ${dto.fromStationName} ${dto.fromLine} -> ${dto.toStationName} ${dto.toLine}`,
    );

    const mapping = new AlternativeMapping(
      dto.fromStationName,
      dto.fromLine,
      dto.toStationName,
      dto.toLine,
      dto.walkingMinutes,
      {
        walkingDistanceMeters: dto.walkingDistanceMeters,
        description: dto.description,
        isBidirectional: dto.isBidirectional ?? true,
      },
    );

    const saved = await this.mappingRepository.save(mapping);
    return this.toMappingResponse(saved);
  }

  private toMappingResponse(m: AlternativeMapping): AlternativeMappingResponseDto {
    return {
      id: m.id,
      fromStationName: m.fromStationName,
      fromLine: m.fromLine,
      toStationName: m.toStationName,
      toLine: m.toLine,
      walkingMinutes: m.walkingMinutes,
      walkingDistanceMeters: m.walkingDistanceMeters,
      description: m.description,
      isBidirectional: m.isBidirectional,
      isActive: m.isActive,
    };
  }
}
