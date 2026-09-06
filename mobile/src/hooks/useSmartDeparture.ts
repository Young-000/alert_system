import { useCallback, useEffect, useRef, useState } from 'react';

import { smartDepartureService } from '@/services/smart-departure.service';
import { serverMessage } from '@/utils/api-error';
import { useAuth } from './useAuth';

import type {
  CreateSmartDepartureSettingDto,
  DepartureType,
  SmartDepartureSettingDto,
  UpdateSmartDepartureSettingDto,
} from '@/types/smart-departure';

/**
 * 저장 결과. 장소(`usePlaces`)·도전(`useChallenges`)과 같은 계약이다.
 *
 * 성패만 boolean으로 돌려주면 서버가 문장으로 말해준 거절 사유가 버려지고,
 * 폼은 사유를 **추측**할 수밖에 없다. 실제로 그렇게 지어낸 문구가
 * "이미 설정이 존재할 수 있습니다"였는데, 목록 화면은 이미 등록된 유형의
 * 추가 버튼을 감추므로 그 사유는 거의 언제나 사실이 아니었다. 서버가 주는
 * 진짜 사유는 `경로를 찾을 수 없습니다: <id>`(다른 기기에서 경로를 지운 경우)나
 * 도메인 검증 실패다 — 다시 눌러서 해결되지 않고, 필요한 행동이 각각 다르다.
 *
 * 유니온이면 실패 가지에서 `message`가 `string`으로 타입상 보장되므로
 * 빈 에러 문구가 뜰 수 없다.
 */
export type SaveSettingResult =
  | { saved: true }
  | { saved: false; message: string };

/** 삭제 결과. 저장과 같은 계약을 따른다. */
export type DeleteSettingResult =
  | { deleted: true }
  | { deleted: false; message: string };

/** 서버가 사유를 안 줬을 때(네트워크 단절 등)의 문구. */
const SAVE_FAILED_FALLBACK = '저장하지 못했습니다. 잠시 후 다시 시도해주세요.';

/** 서버가 사유를 안 줬을 때의 삭제 문구. */
const DELETE_FAILED_FALLBACK = '삭제하지 못했습니다. 잠시 후 다시 시도해주세요.';

type UseSmartDepartureReturn = {
  settings: SmartDepartureSettingDto[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isSaving: boolean;
  refresh: () => Promise<void>;
  createSetting: (
    dto: CreateSmartDepartureSettingDto,
  ) => Promise<SaveSettingResult>;
  updateSetting: (
    id: string,
    dto: UpdateSmartDepartureSettingDto,
  ) => Promise<SaveSettingResult>;
  deleteSetting: (id: string) => Promise<DeleteSettingResult>;
  toggleSetting: (id: string) => Promise<boolean>;
  getSettingByType: (
    type: DepartureType,
  ) => SmartDepartureSettingDto | undefined;
};

export function useSmartDeparture(): UseSmartDepartureReturn {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SmartDepartureSettingDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const togglingIds = useRef(new Set<string>());

  const fetchSettings = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const data = await smartDepartureService.fetchSettings();
      setSettings(data);
      setError(null);
    } catch {
      setError('스마트 출발 설정을 불러올 수 없어요');
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void fetchSettings().finally(() => setIsLoading(false));
  }, [user, fetchSettings]);

  // Pull-to-refresh
  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await fetchSettings();
    setIsRefreshing(false);
  }, [fetchSettings]);

  // Create
  const createSetting = useCallback(
    async (dto: CreateSmartDepartureSettingDto): Promise<SaveSettingResult> => {
      if (!user) return { saved: false, message: '로그인이 필요합니다.' };
      setIsSaving(true);
      try {
        await smartDepartureService.createSetting(dto);
        await fetchSettings();
        return { saved: true };
      } catch (err) {
        // 서버가 말해준 사유를 그대로 넘긴다. 폼이 추측하지 않도록.
        return { saved: false, message: serverMessage(err) ?? SAVE_FAILED_FALLBACK };
      } finally {
        setIsSaving(false);
      }
    },
    [user, fetchSettings],
  );

  // Update
  const updateSetting = useCallback(
    async (
      id: string,
      dto: UpdateSmartDepartureSettingDto,
    ): Promise<SaveSettingResult> => {
      setIsSaving(true);
      try {
        await smartDepartureService.updateSetting(id, dto);
        await fetchSettings();
        return { saved: true };
      } catch (err) {
        return { saved: false, message: serverMessage(err) ?? SAVE_FAILED_FALLBACK };
      } finally {
        setIsSaving(false);
      }
    },
    [fetchSettings],
  );

  // Delete (optimistic)
  const deleteSetting = useCallback(
    async (id: string): Promise<DeleteSettingResult> => {
      const previous = settings;
      setSettings((prev) => prev.filter((s) => s.id !== id));
      try {
        await smartDepartureService.deleteSetting(id);
        return { deleted: true };
      } catch (err) {
        setSettings(previous);
        return { deleted: false, message: serverMessage(err) ?? DELETE_FAILED_FALLBACK };
      }
    },
    [settings],
  );

  // Toggle (optimistic + rollback)
  //
  // 생성·수정·삭제와 같은 계약: 실패하면 boolean으로 알린다.
  const toggleSetting = useCallback(
    async (id: string): Promise<boolean> => {
      // 이미 진행 중인 요청이 있으면 중복 탭이다 — 실패가 아니므로 true.
      if (togglingIds.current.has(id)) return true;
      togglingIds.current.add(id);

      setSettings((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s)),
      );

      try {
        await smartDepartureService.toggleSetting(id);
        return true;
      } catch {
        setSettings((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s)),
        );
        return false;
      } finally {
        togglingIds.current.delete(id);
      }
    },
    [],
  );

  const getSettingByType = useCallback(
    (type: DepartureType): SmartDepartureSettingDto | undefined => {
      return settings.find((s) => s.departureType === type);
    },
    [settings],
  );

  return {
    settings,
    isLoading,
    isRefreshing,
    error,
    isSaving,
    refresh,
    createSetting,
    updateSetting,
    deleteSetting,
    toggleSetting,
    getSettingByType,
  };
}
