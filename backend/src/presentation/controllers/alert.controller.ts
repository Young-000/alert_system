import { Controller, Post, Body, Get, Param, Delete, Patch, Inject, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateAlertUseCase } from '@application/use-cases/create-alert.use-case';
import { DeleteAlertUseCase } from '@application/use-cases/delete-alert.use-case';
import { UpdateAlertUseCase } from '@application/use-cases/update-alert.use-case';
import { CreateAlertDto } from '@application/dto/create-alert.dto';
import { UpdateAlertDto } from '@application/dto/update-alert.dto';
import { IAlertRepository } from '@domain/repositories/alert.repository';

@Controller('alerts')
export class AlertController {
  constructor(
    private createAlertUseCase: CreateAlertUseCase,
    private deleteAlertUseCase: DeleteAlertUseCase,
    private updateAlertUseCase: UpdateAlertUseCase,
    @Inject('IAlertRepository') private alertRepository: IAlertRepository
  ) {}

  @Post()
  async create(@Body() createAlertDto: CreateAlertDto, @Request() req: any) {
    // 자신의 알림만 생성 가능 (Authorization)
    if (req.user.userId !== createAlertDto.userId) {
      throw new ForbiddenException('다른 사용자의 알림을 생성할 수 없습니다.');
    }
    return this.createAlertUseCase.execute(createAlertDto);
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string, @Request() req: any) {
    // 자신의 알림만 조회 가능 (Authorization)
    if (req.user.userId !== userId) {
      throw new ForbiddenException('다른 사용자의 알림을 조회할 수 없습니다.');
    }
    return this.alertRepository.findByUserId(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const alert = await this.alertRepository.findById(id);
    if (!alert) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }
    // 자신의 알림만 조회 가능 (Authorization)
    if (req.user.userId !== alert.userId) {
      throw new ForbiddenException('다른 사용자의 알림을 조회할 수 없습니다.');
    }
    return alert;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateAlertDto: UpdateAlertDto, @Request() req: any) {
    const alert = await this.alertRepository.findById(id);
    if (!alert) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }
    // 자신의 알림만 수정 가능 (Authorization)
    if (req.user.userId !== alert.userId) {
      throw new ForbiddenException('다른 사용자의 알림을 수정할 수 없습니다.');
    }
    return this.updateAlertUseCase.execute(id, updateAlertDto);
  }

  @Patch(':id/toggle')
  async toggle(@Param('id') id: string, @Request() req: any) {
    const alert = await this.alertRepository.findById(id);
    if (!alert) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }
    // 자신의 알림만 토글 가능 (Authorization)
    if (req.user.userId !== alert.userId) {
      throw new ForbiddenException('다른 사용자의 알림을 수정할 수 없습니다.');
    }
    const newEnabled = !alert.enabled;
    return this.updateAlertUseCase.execute(id, { enabled: newEnabled });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const alert = await this.alertRepository.findById(id);
    if (!alert) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }
    // 자신의 알림만 삭제 가능 (Authorization)
    if (req.user.userId !== alert.userId) {
      throw new ForbiddenException('다른 사용자의 알림을 삭제할 수 없습니다.');
    }
    await this.deleteAlertUseCase.execute(id);
    return { message: 'Alert deleted' };
  }
}
