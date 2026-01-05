import axios, { AxiosInstance } from 'axios';

export interface AlimtalkButton {
  type: 'WL' | 'AL' | 'BK' | 'MD'; // 웹링크, 앱링크, 봇키워드, 메시지전달
  name: string;
  linkMobile?: string;
  linkPc?: string;
}

export interface AlimtalkMessage {
  to: string; // 수신자 전화번호 (01012345678 형식)
  templateCode: string;
  variables: Record<string, string>; // 템플릿 변수
  buttons?: AlimtalkButton[];
}

export interface AlimtalkResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IKakaoAlimtalkClient {
  sendAlimtalk(message: AlimtalkMessage): Promise<AlimtalkResult>;
  sendBulkAlimtalk(messages: AlimtalkMessage[]): Promise<AlimtalkResult[]>;
}

export interface KakaoAlimtalkConfig {
  apiKey: string;
  apiSecret: string;
  senderKey: string; // 발신프로필 키
  pfId: string; // 플러스친구 ID
}

export class KakaoAlimtalkClient implements IKakaoAlimtalkClient {
  private client: AxiosInstance;
  private config: KakaoAlimtalkConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: KakaoAlimtalkConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: 'https://api.business.kakao.com',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async getAccessToken(): Promise<string> {
    // 토큰이 유효하면 재사용
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        'https://kauth.kakao.com/oauth/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.apiKey,
          client_secret: this.config.apiSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // 토큰 만료 시간 설정 (보통 12시간, 여유있게 11시간으로 설정)
      this.tokenExpiry = new Date(Date.now() + 11 * 60 * 60 * 1000);

      return this.accessToken!;
    } catch (error) {
      throw new Error(`Failed to get Kakao access token: ${error}`);
    }
  }

  async sendAlimtalk(message: AlimtalkMessage): Promise<AlimtalkResult> {
    try {
      const token = await this.getAccessToken();

      const payload = {
        senderKey: this.config.senderKey,
        templateCode: message.templateCode,
        recipientList: [
          {
            recipientNo: this.formatPhoneNumber(message.to),
            templateParameter: message.variables,
            buttons: message.buttons?.map((btn) => ({
              type: btn.type,
              name: btn.name,
              linkMobile: btn.linkMobile,
              linkPc: btn.linkPc,
            })),
          },
        ],
      };

      const response = await this.client.post(
        '/v1/api/talk/friends/message/default/send',
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.successful_count > 0) {
        return {
          success: true,
          messageId: response.data.message_id,
        };
      }

      return {
        success: false,
        error: response.data.failure_reason || 'Unknown error',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async sendBulkAlimtalk(messages: AlimtalkMessage[]): Promise<AlimtalkResult[]> {
    // 카카오 API는 한 번에 최대 1000건까지 발송 가능
    const results: AlimtalkResult[] = [];
    const batchSize = 1000;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((msg) => this.sendAlimtalk(msg))
      );
      results.push(...batchResults);
    }

    return results;
  }

  private formatPhoneNumber(phone: string): string {
    // 하이픈 제거, 국가코드 제거
    return phone.replace(/[-\s]/g, '').replace(/^\+82/, '0');
  }
}

// NHN Cloud 알림톡 (대안 - 더 간단한 API)
export class NhnAlimtalkClient implements IKakaoAlimtalkClient {
  private client: AxiosInstance;
  private appKey: string;
  private secretKey: string;
  private senderKey: string;

  constructor(appKey: string, secretKey: string, senderKey: string) {
    this.appKey = appKey;
    this.secretKey = secretKey;
    this.senderKey = senderKey;
    this.client = axios.create({
      baseURL: `https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys/${appKey}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Secret-Key': secretKey,
      },
    });
  }

  async sendAlimtalk(message: AlimtalkMessage): Promise<AlimtalkResult> {
    try {
      const payload = {
        senderKey: this.senderKey,
        templateCode: message.templateCode,
        recipientList: [
          {
            recipientNo: this.formatPhoneNumber(message.to),
            templateParameter: message.variables,
            buttons: message.buttons,
          },
        ],
      };

      const response = await this.client.post('/messages', payload);

      if (response.data.header.isSuccessful) {
        return {
          success: true,
          messageId: response.data.message?.requestId,
        };
      }

      return {
        success: false,
        error: response.data.header.resultMessage,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.header?.resultMessage || error.message,
      };
    }
  }

  async sendBulkAlimtalk(messages: AlimtalkMessage[]): Promise<AlimtalkResult[]> {
    return Promise.all(messages.map((msg) => this.sendAlimtalk(msg)));
  }

  private formatPhoneNumber(phone: string): string {
    return phone.replace(/[-\s]/g, '').replace(/^\+82/, '0');
  }
}
