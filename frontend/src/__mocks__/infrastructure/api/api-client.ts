// api-client mock for Vitest
export class ApiClient {
  constructor(_baseUrl: string) {
    // Mock - baseUrl not used
  }
  get = vi.fn();
  post = vi.fn();
  put = vi.fn();
  delete = vi.fn();
  patch = vi.fn();
}
