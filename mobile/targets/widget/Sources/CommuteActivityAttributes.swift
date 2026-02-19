import ActivityKit
import Foundation

// MARK: - Live Activity Attributes (SW-1)

/// Defines the static and dynamic data for the Commute Live Activity.
/// Static attributes are set when the Live Activity starts and do not change.
/// ContentState is updated in real-time throughout the activity lifecycle.
@available(iOS 16.1, *)
struct CommuteActivityAttributes: ActivityAttributes {
  // ─── Static Attributes (fixed at start) ─────────────

  /// Commute mode: "commute" for morning, "return" for evening.
  let mode: String
  /// User-defined route name (e.g., "2호선 출근 경로").
  let routeName: String
  /// Target arrival time in "HH:mm" format.
  let arrivalTarget: String
  /// Ordered checkpoint names along the route (e.g., ["집", "강남역", "회사"]).
  let checkpoints: [String]

  // ─── Dynamic Content State (real-time updates) ──────

  struct ContentState: Codable, Hashable {
    /// Optimal departure time (ISO 8601).
    let optimalDepartureAt: Date
    /// Estimated travel duration in minutes.
    let estimatedTravelMin: Int
    /// Current activity status.
    let status: String // "preparing" | "departureSoon" | "departureNow" | "inTransit" | "arrived"
    /// Minutes until departure (preparing/departureSoon/departureNow states).
    let minutesUntilDeparture: Int
    /// Minutes until arrival (inTransit state only).
    let minutesUntilArrival: Int?
    /// Index of the current checkpoint (inTransit state).
    let currentCheckpointIndex: Int?
    /// Name of the next checkpoint.
    let nextCheckpoint: String?
    /// Transit info for the next leg (e.g., "2호선 3분 뒤").
    let nextTransitInfo: String?
    /// Whether there is a traffic delay affecting travel time.
    let hasTrafficDelay: Bool
    /// Human-readable traffic delay message.
    let trafficDelayMessage: String?
    /// Estimated arrival time in "HH:mm" format.
    let estimatedArrivalTime: String?
    /// Timestamp of the last content update.
    let updatedAt: Date
  }
}

// MARK: - App Group Shared Data for Live Activity

struct LiveActivitySharedData: Codable {
  let activityId: String
  let mode: String
  let startedAt: String
  let isActive: Bool
}
