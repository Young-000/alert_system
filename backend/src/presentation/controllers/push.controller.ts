import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
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
}
