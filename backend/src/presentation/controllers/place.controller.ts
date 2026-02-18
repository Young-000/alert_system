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
import { ManagePlacesUseCase } from '@application/use-cases/manage-places.use-case';
import { CreatePlaceDto } from '@application/dto/create-place.dto';
import { UpdatePlaceDto } from '@application/dto/update-place.dto';
import type { PlaceResponseDto } from '@application/dto/place-response.dto';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

@Controller('places')
@UseGuards(AuthGuard('jwt'))
export class PlaceController {
  private readonly logger = new Logger(PlaceController.name);

  constructor(
    private readonly managePlacesUseCase: ManagePlacesUseCase,
  ) {}

  /**
   * 내 장소 목록 조회
   */
  @Get()
  async getPlaces(
    @Request() req: AuthenticatedRequest,
  ): Promise<PlaceResponseDto[]> {
    return this.managePlacesUseCase.getPlacesByUserId(req.user.userId);
  }

  /**
   * 장소 등록
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPlace(
    @Body() dto: CreatePlaceDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PlaceResponseDto> {
    this.logger.log(
      `Creating place for user ${req.user.userId}: ${dto.placeType} "${dto.label}"`
    );
    return this.managePlacesUseCase.createPlace(req.user.userId, dto);
  }

  /**
   * 장소 수정
   */
  @Put(':id')
  async updatePlace(
    @Param('id') id: string,
    @Body() dto: UpdatePlaceDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PlaceResponseDto> {
    this.logger.log(`Updating place ${id} for user ${req.user.userId}`);
    return this.managePlacesUseCase.updatePlace(id, req.user.userId, dto);
  }

  /**
   * 장소 삭제
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePlace(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    this.logger.log(`Deleting place ${id} for user ${req.user.userId}`);
    await this.managePlacesUseCase.deletePlace(id, req.user.userId);
  }

  /**
   * 장소 Geofence 활성/비활성 토글
   */
  @Patch(':id/toggle')
  async togglePlace(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<PlaceResponseDto> {
    this.logger.log(`Toggling place ${id} for user ${req.user.userId}`);
    return this.managePlacesUseCase.togglePlace(id, req.user.userId);
  }
}
