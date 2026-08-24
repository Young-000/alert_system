import { Alert as RNAlert } from 'react-native';

/**
 * 낙관적 토글의 실패를 사용자에게 알린다.
 *
 * 토글 훅들은 실패하면 화면 상태를 되돌린다. 되돌리기만 하고 끝내면 스위치가
 * 잠깐 깜빡였다 제자리로 돌아올 뿐이라, 껐다고 믿은 사용자가 다음 날 아침
 * 그대로 알림을 받는다. 저장·삭제가 이미 쓰는 문구 규칙을 그대로 따른다.
 *
 * 웹은 같은 자리에서 `actionError`로 표면화한다
 * (`PlacesTab.tsx`·`SmartDepartureTab.tsx`·`use-alert-crud.ts`) — 같은 계약이다.
 */
export function notifyIfToggleFailed(result: Promise<boolean>): void {
  void result.then((success) => {
    if (!success) {
      RNAlert.alert('변경하지 못했어요', '잠시 후 다시 시도해주세요.');
    }
  });
}
