/**
 * Checkpoint key normalization utilities for route neighbor matching.
 *
 * Checkpoint key format:
 *   station:{linked_station_id}          -- subway station match
 *   bus:{linked_bus_stop_id}             -- bus stop match
 *   name:{lowercase_trimmed_name}:{type} -- fallback for custom checkpoints
 */

export function computeCheckpointKey(options: {
  linkedStationId?: string | null;
  linkedBusStopId?: string | null;
  name: string;
  checkpointType: string;
}): string {
  if (options.linkedStationId) {
    return `station:${options.linkedStationId}`;
  }
  if (options.linkedBusStopId) {
    return `bus:${options.linkedBusStopId}`;
  }
  const normalized = options.name.toLowerCase().trim().replace(/\s+/g, '');
  return `name:${normalized}:${options.checkpointType}`;
}

/**
 * Minimum shared checkpoint count to consider two users as "neighbors".
 */
export const MIN_SHARED_CHECKPOINTS = 2;

/**
 * Minimum number of neighbors to show stats (privacy threshold).
 */
export const MIN_NEIGHBORS_FOR_STATS = 3;
