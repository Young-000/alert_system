import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SolapiMessageService } from 'solapi';

export interface AlimtalkMessage {
  to: string;
  templateId: string;
  variables: Record<string, string>;
}

export interface WeatherAlimtalkVariables {
  userName: string;
  temperature: string;
  condition: string;
  airLevel: string;
  humidity: string;
  tip: string;
}

export const SOLAPI_SERVICE = Symbol('SOLAPI_SERVICE');

export interface ISolapiService {
  sendAlimtalk(message: AlimtalkMessage): Promise<void>;
  sendWeatherAlert(to: string, variables: WeatherAlimtalkVariables): Promise<void>;
}

@Injectable()
export class SolapiService implements ISolapiService {
  private readonly logger = new Logger(SolapiService.name);
  private readonly client: SolapiMessageService | null;
  private readonly pfId: string;
  private readonly defaultTemplateId: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SOLAPI_API_KEY', '');
    const apiSecret = this.configService.get<string>('SOLAPI_API_SECRET', '');
    this.pfId = this.configService.get<string>('SOLAPI_PF_ID', '');
    this.defaultTemplateId = this.configService.get<string>('SOLAPI_TEMPLATE_ID', '');

    this.isConfigured = !!(apiKey && apiSecret && this.pfId);

    if (this.isConfigured) {
      this.client = new SolapiMessageService(apiKey, apiSecret);
    } else {
      this.client = null;
      this.logger.warn('Solapi credentials not configured. Alimtalk disabled.');
    }
  }

  async sendAlimtalk(message: AlimtalkMessage): Promise<void> {
    if (!this.isConfigured || !this.client) {
      this.logger.log(`[Mock Alimtalk] to: ${message.to}, template: ${message.templateId}`);
      this.logger.log(`[Mock Alimtalk] variables: ${JSON.stringify(message.variables)}`);
      return;
    }

    try {
      const response = await this.client.sendOne({
        to: this.formatPhoneNumber(message.to),
        kakaoOptions: {
          pfId: this.pfId,
          templateId: message.templateId,
          variables: message.variables,
        },
      });

      this.logger.log(`Alimtalk sent successfully to ${message.to}`);
      this.logger.debug(`Response: ${JSON.stringify(response)}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send Alimtalk: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async sendWeatherAlert(to: string, variables: WeatherAlimtalkVariables): Promise<void> {
    const stringVariables: Record<string, string> = {
      userName: variables.userName,
      temperature: variables.temperature,
      condition: variables.condition,
      airLevel: variables.airLevel,
      humidity: variables.humidity,
      tip: variables.tip,
    };

    await this.sendAlimtalk({
      to,
      templateId: this.defaultTemplateId,
      variables: stringVariables,
    });
  }

  private formatPhoneNumber(phone: string): string {
    return phone.replace(/-/g, '');
  }
}

// 테스트용 Noop 서비스
@Injectable()
export class NoopSolapiService implements ISolapiService {
  private readonly logger = new Logger(NoopSolapiService.name);

  async sendAlimtalk(message: AlimtalkMessage): Promise<void> {
    this.logger.log(`[Noop Alimtalk] to: ${message.to}, template: ${message.templateId}`);
  }

  async sendWeatherAlert(to: string, variables: WeatherAlimtalkVariables): Promise<void> {
    this.logger.log(`[Noop Weather Alert] to: ${to}`);
    this.logger.log(`[Noop Weather Alert] variables: ${JSON.stringify(variables)}`);
  }
}
