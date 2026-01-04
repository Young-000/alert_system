import { Controller, Post, Body, Get, Param, Delete, Inject } from '@nestjs/common';
import { CreateAlertUseCase } from '@application/use-cases/create-alert.use-case';
import { DeleteAlertUseCase } from '@application/use-cases/delete-alert.use-case';
import { CreateAlertDto } from '@application/dto/create-alert.dto';
import { IAlertRepository } from '@domain/repositories/alert.repository';

@Controller('alerts')
export class AlertController {
  constructor(
    private createAlertUseCase: CreateAlertUseCase,
    private deleteAlertUseCase: DeleteAlertUseCase,
    @Inject('IAlertRepository') private alertRepository: IAlertRepository
  ) {}

  @Post()
  async create(@Body() createAlertDto: CreateAlertDto) {
    return this.createAlertUseCase.execute(createAlertDto);
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.alertRepository.findByUserId(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.alertRepository.findById(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.deleteAlertUseCase.execute(id);
    return { message: 'Alert deleted' };
  }
}
