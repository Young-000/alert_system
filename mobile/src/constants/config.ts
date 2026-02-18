export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

if (!API_BASE_URL && __DEV__) {
  console.warn('EXPO_PUBLIC_API_BASE_URL is not set. API calls will fail.');
}
