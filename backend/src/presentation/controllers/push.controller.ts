import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsNotEmpty, IsString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PushSubscriptionEntity } from '../../infrastructure/persistence/typeorm/push-subscription.entity';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

class PushKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;
}

class SubscribeDto {
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

class UnsubscribeDto {
  @IsString()
  @IsNotEmpty()
  endpoint: string;
}

class ExpoTokenDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^ExponentPushToken\[.+\]$/, {
    message: 'Invalid Expo Push Token format',
  })
  token: string;
}

@Controller('push')
@UseGuards(AuthGuard('jwt'))
export class PushController {
  constructor(
    @InjectRepository(PushSubscriptionEntity)
    private readonly subscriptionRepo: Repository<PushSubscriptionEntity>,
  ) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  async subscribe(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SubscribeDto,
  ): Promise<{ success: boolean }> {
    const existing = await this.subscriptionRepo.findOne({
      where: { endpoint: dto.endpoint },
    });

    const keysJson = JSON.stringify({ p256dh: dto.keys.p256dh, auth: dto.keys.auth });

    if (existing) {
      existing.userId = req.user.userId;
      existing.keys = keysJson;
      await this.subscriptionRepo.save(existing);
    } else {
      await this.subscriptionRepo.save({
        userId: req.user.userId,
        endpoint: dto.endpoint,
        keys: keysJson,
      });
    }

    return { success: true };
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  async unsubscribe(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UnsubscribeDto,
  ): Promise<{ success: boolean }> {
    await this.subscriptionRepo.delete({
      userId: req.user.userId,
      endpoint: dto.endpoint,
    });
    return { success: true };
  }

  @Post('expo-token')
  @HttpCode(HttpStatus.CREATED)
  async registerExpoToken(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ExpoTokenDto,
  ): Promise<{ success: boolean }> {
    const existing = await this.subscriptionRepo.findOne({
      where: { endpoint: dto.token },
    });

    if (existing) {
      existing.userId = req.user.userId;
      existing.platform = 'expo';
      await this.subscriptionRepo.save(existing);
    } else {
      await this.subscriptionRepo.save({
        userId: req.user.userId,
        endpoint: dto.token,
        keys: '{}',
        platform: 'expo',
      });
    }

    return { success: true };
  }

  @Delete('expo-token')
  @HttpCode(HttpStatus.OK)
  async removeExpoToken(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ExpoTokenDto,
  ): Promise<{ success: boolean }> {
    await this.subscriptionRepo.delete({
      userId: req.user.userId,
      endpoint: dto.token,
      platform: 'expo',
    });
    return { success: true };
  }
}
