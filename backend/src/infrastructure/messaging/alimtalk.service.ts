import { Injectable } from '@nestjs/common';
import { SolapiMessageService } from 'solapi';

export interface AlimtalkMessage {
  to: string; // 수신자 전화번호
  templateId: string;
  variables: Record<string, string>;
}

export interface IAlimtalkService {
  sendAlimtalk(message: AlimtalkMessage): Promise<void>;
  sendSMS(to: string, text: string): Promise<void>;
}

@Injectable()
export class AlimtalkService implements IAlimtalkService {
  private messageService: SolapiMessageService;

  constructor() {
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.warn('Solapi API credentials not configured. Alimtalk disabled.');
      return;
    }

    this.messageService = new SolapiMessageService(apiKey, apiSecret);
  }

  async sendAlimtalk(message: AlimtalkMessage): Promise<void> {
    if (!this.messageService) {
      console.log('[Mock Alimtalk]', message);
      return;
    }

    try {
      await this.messageService.send({
        to: message.to,
        from: process.env.SOLAPI_SENDER_NUMBER || '',
        kakaoOptions: {
          pfId: process.env.SOLAPI_PFID || '',
          templateId: message.templateId,
          variables: message.variables,
        },
      });
    } catch (error) {
      console.error('Failed to send Alimtalk:', error);
      // 알림톡 실패시 SMS로 대체
      await this.sendSMS(message.to, this.formatSMSFromVariables(message.variables));
    }
  }

  async sendSMS(to: string, text: string): Promise<void> {
    if (!this.messageService) {
      console.log('[Mock SMS]', { to, text });
      return;
    }

    try {
      await this.messageService.send({
        to,
        from: process.env.SOLAPI_SENDER_NUMBER || '',
        text,
      });
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw error;
    }
  }

  private formatSMSFromVariables(variables: Record<string, string>): string {
    const parts: string[] = ['[Alert System]'];

    if (variables.weather) parts.push(`날씨: ${variables.weather}`);
    if (variables.airQuality) parts.push(`미세먼지: ${variables.airQuality}`);
    if (variables.subway) parts.push(`지하철: ${variables.subway}`);
    if (variables.bus) parts.push(`버스: ${variables.bus}`);

    return parts.join('\n');
  }
}

// 알림톡 없이 동작하는 Noop 서비스
@Injectable()
export class NoopAlimtalkService implements IAlimtalkService {
  async sendAlimtalk(message: AlimtalkMessage): Promise<void> {
    console.log('[Noop Alimtalk]', message);
  }

  async sendSMS(to: string, text: string): Promise<void> {
    console.log('[Noop SMS]', { to, text });
  }
}
