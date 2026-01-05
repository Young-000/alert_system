import { Controller, Post, Body, Param, Inject } from '@nestjs/common';
import { SendAlimtalkUseCase } from '@application/use-cases/send-alimtalk.use-case';

export interface RegisterPhoneDto {
  userId: string;
  phoneNumber: string;
}

export interface SendAlimtalkDto {
  alertId: string;
}

export interface SendTestAlimtalkDto {
  phoneNumber: string;
  userName: string;
}

@Controller('alimtalk')
export class AlimtalkController {
  constructor(
    @Inject('SendAlimtalkUseCase')
    private sendAlimtalkUseCase: SendAlimtalkUseCase
  ) {}

  @Post('send')
  async sendAlimtalk(@Body() dto: SendAlimtalkDto) {
    const result = await this.sendAlimtalkUseCase.execute({
      alertId: dto.alertId,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      messageId: result.messageId,
    };
  }

  @Post('send/:alertId')
  async sendAlimtalkByAlertId(@Param('alertId') alertId: string) {
    const result = await this.sendAlimtalkUseCase.execute({ alertId });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      messageId: result.messageId,
    };
  }
}
