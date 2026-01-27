import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@infrastructure/auth/public.decorator';

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('health')
  @Public()
  @ApiOperation({ summary: '헬스 체크' })
  @ApiResponse({ status: 200, description: 'OK' })
  health(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
