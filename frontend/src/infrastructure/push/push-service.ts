export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushService {
  private async getVapidPublicKey(): Promise<string> {
    // 환경 변수가 있으면 사용, 없으면 API에서 가져오기
    if (import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      return import.meta.env.VITE_VAPID_PUBLIC_KEY;
    }

    try {
      const response = await fetch('http://localhost:3000/notifications/vapid-public-key');
      const data = await response.json();
      return data.publicKey;
    } catch (error) {
      console.error('Failed to get VAPID public key:', error);
      throw new Error('Failed to get VAPID public key from server');
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    return Notification.requestPermission();
  }

  async subscribe(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker is not supported');
    }

    const publicKey = await this.getVapidPublicKey();
    
    if (!publicKey) {
      throw new Error('VAPID public key is not available');
    }

    const registration = await navigator.serviceWorker.ready;
    const keyArray = this.urlBase64ToUint8Array(publicKey);
    // Convert to ArrayBuffer explicitly to satisfy TypeScript
    const buffer = new ArrayBuffer(keyArray.length);
    const view = new Uint8Array(buffer);
    view.set(keyArray);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: buffer,
    });

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
      },
    };
  }

  async unsubscribe(): Promise<boolean> {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return subscription.unsubscribe();
    }
    return false;
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray as Uint8Array;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

