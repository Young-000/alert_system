import { Controller, Get, Query, Request } from '@nestjs/common';
import { WidgetDataService } from '@application/services/widget-data.service';
import { WidgetDataQueryDto } from '@application/dto/widget-data.dto';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

@Controller('widget')
export class WidgetController {
  constructor(private readonly widgetDataService: WidgetDataService) {}

  @Get('data')
  async getData(
    @Query() query: WidgetDataQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.widgetDataService.getData(
      req.user.userId,
      query.lat,
      query.lng,
    );
  }
}
