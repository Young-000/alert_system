import { useCallback, useEffect, useRef, useState } from 'react';

import { smartDepartureService } from '@/services/smart-departure.service';
import { useAuth } from './useAuth';

import type {
  CreateSmartDepartureSettingDto,
  DepartureType,
  SmartDepartureSettingDto,
  UpdateSmartDepartureSettingDto,
} from '@/types/smart-departure';

type UseSmartDepartureReturn = {
  settings: SmartDepartureSettingDto[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isSaving: boolean;
  refresh: () => Promise<void>;
  createSetting: (dto: CreateSmartDepartureSettingDto) => Promise<boolean>;
  updateSetting: (
    id: string,
    dto: UpdateSmartDepartureSettingDto,
  ) => Promise<boolean>;
  deleteSetting: (id: string) => Promise<boolean>;
  toggleSetting: (id: string) => void;
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
    async (dto: CreateSmartDepartureSettingDto): Promise<boolean> => {
      if (!user) return false;
      setIsSaving(true);
      try {
        await smartDepartureService.createSetting(dto);
        await fetchSettings();
        return true;
      } catch {
        return false;
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
    ): Promise<boolean> => {
      setIsSaving(true);
      try {
        await smartDepartureService.updateSetting(id, dto);
        await fetchSettings();
        return true;
      } catch {
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchSettings],
  );

  // Delete (optimistic)
  const deleteSetting = useCallback(
    async (id: string): Promise<boolean> => {
      const previous = settings;
      setSettings((prev) => prev.filter((s) => s.id !== id));
      try {
        await smartDepartureService.deleteSetting(id);
        return true;
      } catch {
        setSettings(previous);
        return false;
      }
    },
    [settings],
  );

  // Toggle (optimistic + rollback)
  const toggleSetting = useCallback(
    (id: string): void => {
      if (togglingIds.current.has(id)) return;
      togglingIds.current.add(id);

      setSettings((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, isEnabled: !s.isEnabled } : s,
        ),
      );

      smartDepartureService
        .toggleSetting(id)
        .catch(() => {
          setSettings((prev) =>
            prev.map((s) =>
              s.id === id ? { ...s, isEnabled: !s.isEnabled } : s,
            ),
          );
        })
        .finally(() => {
          togglingIds.current.delete(id);
        });
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
