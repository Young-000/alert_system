import { apiClient } from './api-client';

import type {
  BatchCommuteEventsDto,
  BatchCommuteEventsResponse,
  CommuteEvent,
  CommuteEventResponse,
  RecordCommuteEventDto,
} from '@/types/commute-event';

export const commuteEventService = {
  async recordEvent(dto: RecordCommuteEventDto): Promise<CommuteEventResponse> {
    return apiClient.post<CommuteEventResponse, RecordCommuteEventDto>(
      '/commute/events',
      dto,
    );
  },

  async batchUpload(dto: BatchCommuteEventsDto): Promise<BatchCommuteEventsResponse> {
    return apiClient.post<BatchCommuteEventsResponse, BatchCommuteEventsDto>(
      '/commute/events/batch',
      dto,
    );
  },

  async fetchRecentEvents(limit = 20): Promise<CommuteEvent[]> {
    return apiClient.get<CommuteEvent[]>(`/commute/events?limit=${limit}`);
  },
};
