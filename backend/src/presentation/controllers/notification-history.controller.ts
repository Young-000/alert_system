import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationLogEntity } from '../../infrastructure/persistence/typeorm/notification-log.entity';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationHistoryController {
  constructor(
    @InjectRepository(NotificationLogEntity)
    private readonly logRepo: Repository<NotificationLogEntity>,
  ) {}

  @Get('history')
  async getHistory(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ items: NotificationLogEntity[]; total: number }> {
    const take = Math.min(parseInt(limit || '20', 10) || 20, 50);
    const skip = parseInt(offset || '0', 10) || 0;

    const [items, total] = await this.logRepo.findAndCount({
      where: { userId: req.user.userId },
      order: { sentAt: 'DESC' },
      take,
      skip,
    });

    return { items, total };
  }
}
