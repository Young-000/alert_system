import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Request,
  HttpCode,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { CommunityService } from '@application/services/community/community.service';
import { TipsService, TooManyTipsException } from '@application/services/community/tips.service';
import {
  NeighborStatsDto,
  TipsListResponseDto,
  CreateTipRequestDto,
  CreateTipResponseDto,
  ReportTipResponseDto,
  HelpfulTipResponseDto,
} from '@application/dto/community.dto';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';
import { parseBoundedInt } from '../utils/query-param';

/** 팁 목록 페이지 크기 상한 — TipsService가 적용하는 상한과 같은 값. */
const MAX_TIPS_PAGE_SIZE = 50;
/** 페이지 번호 상한. 이보다 깊은 페이지는 어떤 체크포인트에도 존재하지 않는다. */
const MAX_TIPS_PAGE = 10_000;

@Controller('community')
export class CommunityController {
  private readonly logger = new Logger(CommunityController.name);

  constructor(
    private readonly communityService: CommunityService,
    private readonly tipsService: TipsService,
  ) {}

  /**
   * GET /community/neighbors
   * Get neighbor stats for the current user's route.
   * Privacy: only aggregated counts and averages.
   */
  @Get('neighbors')
  async getNeighbors(
    @Request() req: AuthenticatedRequest,
    @Query('routeId') routeId?: string,
  ): Promise<NeighborStatsDto> {
    return this.communityService.getNeighborStats(req.user.userId, routeId);
  }

  /**
   * GET /community/tips
   * Get tips for a checkpoint (paginated).
   * Privacy: no author info in response.
   */
  @Get('tips')
  async getTips(
    @Request() req: AuthenticatedRequest,
    @Query('checkpointKey') checkpointKey: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ): Promise<TipsListResponseDto> {
    // `parseInt(raw, 10) || fallback`은 하한을 놓쳐 음수를 그대로 통과시킨다.
    // page/limit은 결국 TypeORM의 skip/take가 되므로 경계에서 함께 보정한다.
    const page = parseBoundedInt(pageStr, { fallback: 1, min: 1, max: MAX_TIPS_PAGE });
    const limit = parseBoundedInt(limitStr, { fallback: 20, min: 1, max: MAX_TIPS_PAGE_SIZE });

    return this.tipsService.getTips(
      checkpointKey,
      req.user?.userId ?? null,
      page,
      limit,
    );
  }

  /**
   * POST /community/tips
   * Create a new tip (rate limited: 3/day).
   */
  @Post('tips')
  @HttpCode(HttpStatus.CREATED)
  async createTip(
    @Request() req: AuthenticatedRequest,
    @Body() body: CreateTipRequestDto,
  ): Promise<CreateTipResponseDto> {
    try {
      return await this.tipsService.createTip(req.user.userId, body);
    } catch (error) {
      if (error instanceof TooManyTipsException) {
        throw new HttpException(error.message, 429);
      }
      throw error;
    }
  }

  /**
   * POST /community/tips/:id/report
   * Report a tip.
   */
  @Post('tips/:id/report')
  @HttpCode(HttpStatus.OK)
  async reportTip(
    @Request() req: AuthenticatedRequest,
    @Param('id') tipId: string,
  ): Promise<ReportTipResponseDto> {
    return this.tipsService.reportTip(tipId, req.user.userId);
  }

  /**
   * POST /community/tips/:id/helpful
   * Toggle helpful on a tip.
   */
  @Post('tips/:id/helpful')
  @HttpCode(HttpStatus.OK)
  async toggleHelpful(
    @Request() req: AuthenticatedRequest,
    @Param('id') tipId: string,
  ): Promise<HelpfulTipResponseDto> {
    return this.tipsService.toggleHelpful(tipId, req.user.userId);
  }
}
