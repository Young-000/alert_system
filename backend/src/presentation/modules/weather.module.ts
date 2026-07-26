import { Module } from '@nestjs/common';
import { WeatherController } from '../controllers/weather.controller';
import { ExternalApiModule } from './external-api.module';

@Module({
  imports: [ExternalApiModule],
  controllers: [WeatherController],
})
export class WeatherModule {}
