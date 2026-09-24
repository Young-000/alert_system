/**
 * 기기 보안 저장소(Keychain/Keystore)에 자격증명을 쓰지 못했을 때.
 *
 * 서버 인증이 **성공한 뒤** 나는 실패라 일반 오류로 접으면 로그인 화면이
 * "오류가 발생했습니다"만 띄운다 — 사용자는 비밀번호를 의심하며 같은 입력을
 * 반복하게 된다. 웹은 같은 상황에서 사유와 다음 행동을 말한다
 * (`frontend/src/infrastructure/storage/safe-storage.ts`의 CREDENTIAL_STORAGE_ERROR).
 */
export const CREDENTIAL_STORAGE_ERROR =
  '이 기기에 로그인 정보를 저장할 수 없어요. 앱을 다시 시작한 뒤 시도해 주세요.';

export class CredentialStorageError extends Error {
  constructor() {
    super(CREDENTIAL_STORAGE_ERROR);
    this.name = 'CredentialStorageError';
    // 트랜스파일 타깃이 ES5로 내려가도 instanceof가 살아 있게 한다.
    Object.setPrototypeOf(this, CredentialStorageError.prototype);
  }
}
