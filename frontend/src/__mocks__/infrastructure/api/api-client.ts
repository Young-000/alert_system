// api-client mock
export class ApiClient {
  constructor(_baseUrl: string) {
    // Mock - baseUrl not used
  }
  get = jest.fn();
  post = jest.fn();
  put = jest.fn();
  delete = jest.fn();
  patch = jest.fn();
}
