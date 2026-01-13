import { Injectable, Logger } from '@nestjs/common';

export interface AlimtalkMessage {
  to: string; // 수신자 전화번호
  templateCode: string;
  variables: Record<string, string>;
}

export interface IAlimtalkService {
  sendAlimtalk(message: AlimtalkMessage): Promise<void>;
  sendSMS(to: string, text: string): Promise<void>;
}

interface NhnCloudRecipient {
  recipientNo: string;
  templateParameter?: Record<string, string>;
}

interface NhnCloudAlimtalkRequest {
  senderKey: string;
  templateCode: string;
  recipientList: NhnCloudRecipient[];
  resendParameter?: {
    isResend: boolean;
    resendType: string;
    resendSendNo?: string;
  };
}

interface NhnCloudResponse {
  header: {
    resultCode: number;
    resultMessage: string;
    isSuccessful: boolean;
  };
  message?: {
    requestId: string;
    senderGroupingKey?: string;
    sendResults: Array<{
      recipientSeq: number;
      recipientNo: string;
      resultCode: number;
      resultMessage: string;
      recipientGroupingKey?: string;
    }>;
  };
}

@Injectable()
export class AlimtalkService implements IAlimtalkService {
  private readonly logger = new Logger(AlimtalkService.name);
  private readonly baseUrl = 'https://api-alimtalk.cloud.toast.com';
  private readonly appKey: string;
  private readonly secretKey: string;
  private readonly senderKey: string;
  private readonly senderNumber: string;
  private readonly isConfigured: boolean;

  constructor() {
    this.appKey = process.env.NHN_CLOUD_APP_KEY || '';
    this.secretKey = process.env.NHN_CLOUD_SECRET_KEY || '';
    this.senderKey = process.env.NHN_CLOUD_SENDER_KEY || '';
    this.senderNumber = process.env.NHN_CLOUD_SENDER_NUMBER || '';

    this.isConfigured = !!(this.appKey && this.secretKey && this.senderKey);

    if (!this.isConfigured) {
      this.logger.warn('NHN Cloud API credentials not configured. Alimtalk disabled.');
    }
  }

  async sendAlimtalk(message: AlimtalkMessage): Promise<void> {
    if (!this.isConfigured) {
      this.logger.log(`[Mock Alimtalk] to: ${message.to}, template: ${message.templateCode}`);
      this.logger.log(`[Mock Alimtalk] variables: ${JSON.stringify(message.variables)}`);
      return;
    }

    const url = `${this.baseUrl}/alimtalk/v2.3/appkeys/${this.appKey}/messages`;

    const requestBody: NhnCloudAlimtalkRequest = {
      senderKey: this.senderKey,
      templateCode: message.templateCode,
      recipientList: [
        {
          recipientNo: this.formatPhoneNumber(message.to),
          templateParameter: message.variables,
        },
      ],
      // SMS 대체 발송 설정
      resendParameter: {
        isResend: true,
        resendType: 'SMS',
        resendSendNo: this.senderNumber,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-Secret-Key': this.secretKey,
        },
        body: JSON.stringify(requestBody),
      });

      const result: NhnCloudResponse = await response.json();

      if (!result.header.isSuccessful) {
        throw new Error(`Alimtalk failed: ${result.header.resultMessage}`);
      }

      const sendResult = result.message?.sendResults[0];
      if (sendResult && sendResult.resultCode !== 0) {
        throw new Error(`Alimtalk send failed: ${sendResult.resultMessage}`);
      }

      this.logger.log(`Alimtalk sent successfully to ${message.to}`);
    } catch (error) {
      this.logger.error('Failed to send Alimtalk:', error);
      // 알림톡 실패시 SMS로 대체 (NHN Cloud가 자동 대체 발송하므로 여기서는 로깅만)
      throw error;
    }
  }

  async sendSMS(to: string, text: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.log(`[Mock SMS] to: ${to}, text: ${text}`);
      return;
    }

    const url = `${this.baseUrl.replace('api-alimtalk', 'api-sms')}/sms/v3.0/appkeys/${this.appKey}/sender/sms`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-Secret-Key': this.secretKey,
        },
        body: JSON.stringify({
          body: text,
          sendNo: this.senderNumber,
          recipientList: [
            {
              recipientNo: this.formatPhoneNumber(to),
            },
          ],
        }),
      });

      const result = await response.json();

      if (!result.header?.isSuccessful) {
        throw new Error(`SMS failed: ${result.header?.resultMessage || 'Unknown error'}`);
      }

      this.logger.log(`SMS sent successfully to ${to}`);
    } catch (error) {
      this.logger.error('Failed to send SMS:', error);
      throw error;
    }
  }

  private formatPhoneNumber(phone: string): string {
    // 하이픈 제거하고 숫자만 반환
    return phone.replace(/-/g, '');
  }
}

// 알림톡 없이 동작하는 Noop 서비스
@Injectable()
export class NoopAlimtalkService implements IAlimtalkService {
  private readonly logger = new Logger(NoopAlimtalkService.name);

  async sendAlimtalk(message: AlimtalkMessage): Promise<void> {
    this.logger.log(`[Noop Alimtalk] to: ${message.to}, template: ${message.templateCode}`);
  }

  async sendSMS(to: string, text: string): Promise<void> {
    this.logger.log(`[Noop SMS] to: ${to}, text: ${text}`);
  }
}
