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
} from '@nestjs/common';
import { ManageRouteUseCase } from '@application/use-cases/manage-route.use-case';
import {
  CreateRouteDto,
  UpdateRouteDto,
  RouteResponseDto,
} from '@application/dto/commute.dto';
import { RouteType } from '@domain/entities/commute-route.entity';
import { Public } from '@infrastructure/auth/public.decorator';

@Controller('routes')
@Public()
export class RouteController {
  private readonly logger = new Logger(RouteController.name);

  constructor(private readonly manageRouteUseCase: ManageRouteUseCase) {}

  /**
   * 새 경로 생성
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRoute(@Body() dto: CreateRouteDto): Promise<RouteResponseDto> {
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
    @Query('type') routeType?: string
  ): Promise<RouteResponseDto[]> {
    if (routeType) {
      return this.manageRouteUseCase.getRoutesByUserIdAndType(
        userId,
        routeType as RouteType
      );
    }
    return this.manageRouteUseCase.getRoutesByUserId(userId);
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
    @Body() dto: UpdateRouteDto
  ): Promise<RouteResponseDto> {
    this.logger.log(`Updating route ${id}`);
    return this.manageRouteUseCase.updateRoute(id, dto);
  }

  /**
   * 경로 삭제
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRoute(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting route ${id}`);
    await this.manageRouteUseCase.deleteRoute(id);
  }
}
