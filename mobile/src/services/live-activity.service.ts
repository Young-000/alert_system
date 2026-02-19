import { apiClient } from './api-client';

import * as liveActivityModule from '../../modules/live-activity';

import type {
  LiveActivityInfo,
  RegisterLiveActivityDto,
  RegisterLiveActivityResponse,
  StartLiveActivityParams,
  UpdateLiveActivityParams,
} from '@/types/live-activity';

// ─── Live Activity Service (FE-2) ───────────────────

export const liveActivityService = {
  // ─── Native Module Wrappers ─────────────────────

  /** Check if Live Activities are supported on this device. */
  async isSupported(): Promise<boolean> {
    return liveActivityModule.isSupported();
  },

  /** Start a new Live Activity. Returns activity info or null. */
  async startActivity(
    params: StartLiveActivityParams,
  ): Promise<LiveActivityInfo | null> {
    return liveActivityModule.startActivity(params);
  },

  /** Update the current Live Activity. Returns true on success. */
  async updateActivity(params: UpdateLiveActivityParams): Promise<boolean> {
    return liveActivityModule.updateActivity(params);
  },

  /** End a specific Live Activity. */
  async endActivity(activityId: string): Promise<boolean> {
    return liveActivityModule.endActivity(activityId);
  },

  /** End all active Live Activities. */
  async endAllActivities(): Promise<boolean> {
    return liveActivityModule.endAllActivities();
  },

  /** Get info about the currently active Live Activity. */
  async getActiveActivity(): Promise<LiveActivityInfo | null> {
    return liveActivityModule.getActiveActivity();
  },

  // ─── Server API: Push Token Management ──────────

  /** Register a Live Activity push token on the server. */
  async registerPushToken(
    dto: RegisterLiveActivityDto,
  ): Promise<RegisterLiveActivityResponse> {
    return apiClient.post<RegisterLiveActivityResponse, RegisterLiveActivityDto>(
      '/live-activity/register',
      dto,
    );
  },

  /** Deregister a Live Activity push token from the server. */
  async deregisterToken(activityId: string): Promise<void> {
    await apiClient.delete(`/live-activity/${activityId}`);
  },

  // ─── Push Token Listener ────────────────────────

  /** Subscribe to push token updates from the native module. */
  addPushTokenListener(
    listener: (event: { activityId: string; pushToken: string }) => void,
  ): () => void {
    return liveActivityModule.addPushTokenListener(listener);
  },
};
