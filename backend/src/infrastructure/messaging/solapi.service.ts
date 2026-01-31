import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SolapiMessageService } from 'solapi';

export interface AlimtalkMessage {
  to: string;
  templateId: string;
  variables: Record<string, string>;
}

// 템플릿 ID 상수
export const TEMPLATE_IDS = {
  // 출근용
  WEATHER_MORNING: 'KA01TP260131155222525E6X1O8FUzNm',
  TRANSIT_MORNING: 'KA01TP260131155224070HPJSziPp607',
  COMBINED_MORNING: 'KA01TP260131155225436CUtsZ3GKXZy',
  // 퇴근용
  WEATHER_EVENING: 'KA01TP260131155223254EyRuQ4nbx7O',
  TRANSIT_EVENING: 'KA01TP260131155224722J0Ven7XUy86',
  COMBINED_EVENING: 'KA01TP260131155226107EiDALL52BHD',
  // 기존 (하위호환)
  LEGACY: 'KA01TP2601181035243285qjwlwSLm5X',
} as const;

// 기존 템플릿 변수 (하위 호환)
export interface LegacyWeatherVariables {
  userName: string;
  temperature: string;
  condition: string;
  airLevel: string;
  humidity: string;
  tip: string;
}

// 날씨 알림 변수 (7개)
export interface WeatherAlertVariables {
  userName: string;
  date: string;           // "1월 31일 금요일"
  currentTemp: string;    // "-2"
  minTemp: string;        // "-5"
  weather: string;        // "오전 맑음 → 오후 구름 → 저녁 맑음"
  airQuality: string;     // "보통 (PM10 45㎍/㎥)"
  tip: string;
}

// 교통 알림 변수 (4개)
export interface TransitAlertVariables {
  userName: string;
  subwayInfo: string;     // "• 강남역 (2호선) 3분\n• 역삼역 (2호선) 5분"
  busInfo: string;        // "• 강남역정류장 - 146번 2분\n• 역삼역정류장 - 740번 5분"
  tip: string;
}

// 종합 알림 변수 (9개)
export interface CombinedAlertVariables {
  userName: string;
  date: string;
  currentTemp: string;
  minTemp: string;
  weather: string;
  airQuality: string;
  subwayInfo: string;
  busInfo: string;
  tip: string;
}

export type AlertTimeType = 'morning' | 'evening';

export const SOLAPI_SERVICE = Symbol('SOLAPI_SERVICE');

export interface ISolapiService {
  sendAlimtalk(message: AlimtalkMessage): Promise<void>;
  sendLegacyWeatherAlert(to: string, variables: LegacyWeatherVariables): Promise<void>;
  sendWeatherAlert(to: string, variables: WeatherAlertVariables, timeType: AlertTimeType): Promise<void>;
  sendTransitAlert(to: string, variables: TransitAlertVariables, timeType: AlertTimeType): Promise<void>;
  sendCombinedAlert(to: string, variables: CombinedAlertVariables, timeType: AlertTimeType): Promise<void>;
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

  // 기존 템플릿 (하위 호환)
  async sendLegacyWeatherAlert(to: string, variables: LegacyWeatherVariables): Promise<void> {
    const stringVariables: Record<string, string> = {
      '#{userName}': variables.userName,
      '#{temperature}': variables.temperature,
      '#{condition}': variables.condition,
      '#{airLevel}': variables.airLevel,
      '#{humidity}': variables.humidity,
      '#{tip}': variables.tip,
    };

    await this.sendAlimtalk({
      to,
      templateId: this.defaultTemplateId || TEMPLATE_IDS.LEGACY,
      variables: stringVariables,
    });
  }

  // 날씨 알림
  async sendWeatherAlert(to: string, variables: WeatherAlertVariables, timeType: AlertTimeType): Promise<void> {
    const templateId = timeType === 'morning' ? TEMPLATE_IDS.WEATHER_MORNING : TEMPLATE_IDS.WEATHER_EVENING;

    const stringVariables: Record<string, string> = {
      '#{userName}': variables.userName,
      '#{date}': variables.date,
      '#{currentTemp}': variables.currentTemp,
      '#{minTemp}': variables.minTemp,
      '#{weather}': variables.weather,
      '#{airQuality}': variables.airQuality,
      '#{tip}': variables.tip,
    };

    await this.sendAlimtalk({ to, templateId, variables: stringVariables });
  }

  // 교통 알림
  async sendTransitAlert(to: string, variables: TransitAlertVariables, timeType: AlertTimeType): Promise<void> {
    const templateId = timeType === 'morning' ? TEMPLATE_IDS.TRANSIT_MORNING : TEMPLATE_IDS.TRANSIT_EVENING;

    const stringVariables: Record<string, string> = {
      '#{userName}': variables.userName,
      '#{subwayInfo}': variables.subwayInfo,
      '#{busInfo}': variables.busInfo,
      '#{tip}': variables.tip,
    };

    await this.sendAlimtalk({ to, templateId, variables: stringVariables });
  }

  // 종합 알림 (날씨 + 교통)
  async sendCombinedAlert(to: string, variables: CombinedAlertVariables, timeType: AlertTimeType): Promise<void> {
    const templateId = timeType === 'morning' ? TEMPLATE_IDS.COMBINED_MORNING : TEMPLATE_IDS.COMBINED_EVENING;

    const stringVariables: Record<string, string> = {
      '#{userName}': variables.userName,
      '#{date}': variables.date,
      '#{currentTemp}': variables.currentTemp,
      '#{minTemp}': variables.minTemp,
      '#{weather}': variables.weather,
      '#{airQuality}': variables.airQuality,
      '#{subwayInfo}': variables.subwayInfo,
      '#{busInfo}': variables.busInfo,
      '#{tip}': variables.tip,
    };

    await this.sendAlimtalk({ to, templateId, variables: stringVariables });
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

  async sendLegacyWeatherAlert(to: string, variables: LegacyWeatherVariables): Promise<void> {
    this.logger.log(`[Noop Legacy Weather] to: ${to}, variables: ${JSON.stringify(variables)}`);
  }

  async sendWeatherAlert(to: string, variables: WeatherAlertVariables, timeType: AlertTimeType): Promise<void> {
    this.logger.log(`[Noop Weather ${timeType}] to: ${to}, variables: ${JSON.stringify(variables)}`);
  }

  async sendTransitAlert(to: string, variables: TransitAlertVariables, timeType: AlertTimeType): Promise<void> {
    this.logger.log(`[Noop Transit ${timeType}] to: ${to}, variables: ${JSON.stringify(variables)}`);
  }

  async sendCombinedAlert(to: string, variables: CombinedAlertVariables, timeType: AlertTimeType): Promise<void> {
    this.logger.log(`[Noop Combined ${timeType}] to: ${to}, variables: ${JSON.stringify(variables)}`);
  }
}
