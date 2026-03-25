import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WidgetDataService } from '@application/services/widget-data.service';
import { WidgetDataQueryDto, WidgetDataResponseDto } from '@application/dto/widget-data.dto';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

@Controller('widget')
@UseGuards(AuthGuard('jwt'))
export class WidgetController {
  constructor(private readonly widgetDataService: WidgetDataService) {}

  @Get('data')
  async getData(
    @Query() query: WidgetDataQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<WidgetDataResponseDto> {
    return this.widgetDataService.getData(
      req.user.userId,
      query.lat,
      query.lng,
      query.mode,
    );
  }
}
