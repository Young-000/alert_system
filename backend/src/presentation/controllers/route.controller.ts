import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ManageRouteUseCase } from '@application/use-cases/manage-route.use-case';
import { RecommendBestRouteUseCase } from '@application/use-cases/recommend-best-route.use-case';
import {
  CreateRouteDto,
  UpdateRouteDto,
  RouteResponseDto,
} from '@application/dto/commute.dto';
import {
  RouteRecommendationResponseDto,
  RouteRecommendationQueryDto,
} from '@application/dto/route-recommendation.dto';
import { RouteType } from '@domain/entities/commute-route.entity';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

@Controller('routes')
@UseGuards(AuthGuard('jwt'))
export class RouteController {
  private readonly logger = new Logger(RouteController.name);

  constructor(
    private readonly manageRouteUseCase: ManageRouteUseCase,
    private readonly recommendBestRouteUseCase: RecommendBestRouteUseCase,
  ) {}

  /**
   * 새 경로 생성
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRoute(
    @Body() dto: CreateRouteDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<RouteResponseDto> {
    // 권한 검사: 자신의 경로만 생성 가능
    if (dto.userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 경로를 생성할 수 없습니다.');
    }
    this.logger.log(`Creating route for user ${dto.userId}: ${dto.name}`);
    return this.manageRouteUseCase.createRoute(dto);
  }

  /**
   * 사용자의 모든 경로 조회
   * NOTE: 이 라우트는 @Get(':id') 보다 먼저 정의되어야 함 (NestJS 라우트 매칭 순서)
   */
  @Get('user/:userId')
  async getUserRoutes(
    @Param('userId') userId: string,
    @Query('type') routeType: string | undefined,
    @Request() req: AuthenticatedRequest,
  ): Promise<RouteResponseDto[]> {
    // 권한 검사: 자신의 경로만 조회 가능
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 경로를 조회할 수 없습니다.');
    }
    if (routeType) {
      return this.manageRouteUseCase.getRoutesByUserIdAndType(
        userId,
        routeType as RouteType
      );
    }
    return this.manageRouteUseCase.getRoutesByUserId(userId);
  }

  /**
   * 최적 경로 추천
   * 통근 기록을 분석하여 가장 빠르고 안정적인 경로를 추천합니다.
   */
  @Get('user/:userId/recommend')
  async getRouteRecommendation(
    @Param('userId') userId: string,
    @Query() query: RouteRecommendationQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<RouteRecommendationResponseDto> {
    // 권한 검사: 자신의 경로 추천만 조회 가능
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 추천 정보에 접근할 수 없습니다.');
    }
    this.logger.log(`Getting route recommendation for user ${userId}, weather: ${query.weather}`);
    return this.recommendBestRouteUseCase.execute(userId, query.weather);
  }

  /**
   * 특정 경로 조회
   */
  @Get(':id')
  async getRoute(@Param('id') id: string): Promise<RouteResponseDto> {
    return this.manageRouteUseCase.getRouteById(id);
  }

  /**
   * 경로 수정
   */
  @Patch(':id')
  async updateRoute(
    @Param('id') id: string,
    @Body() dto: UpdateRouteDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<RouteResponseDto> {
    // 권한 검사: 해당 경로가 본인의 것인지 확인
    const existingRoute = await this.manageRouteUseCase.getRouteById(id);
    if (existingRoute.userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 경로를 수정할 수 없습니다.');
    }
    this.logger.log(`Updating route ${id}`);
    return this.manageRouteUseCase.updateRoute(id, dto);
  }

  /**
   * 경로 삭제
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRoute(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    // 권한 검사: 해당 경로가 본인의 것인지 확인
    const existingRoute = await this.manageRouteUseCase.getRouteById(id);
    if (existingRoute.userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 경로를 삭제할 수 없습니다.');
    }
    this.logger.log(`Deleting route ${id}`);
    await this.manageRouteUseCase.deleteRoute(id);
  }
}
