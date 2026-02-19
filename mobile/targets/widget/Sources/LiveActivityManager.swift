import ActivityKit
import Foundation

// MARK: - Live Activity Manager (SW-4)

/// Static helper class for managing Commute Live Activities.
/// Provides methods to start, update, end, and query Live Activities.
/// All methods include @available(iOS 16.1, *) checks for graceful degradation.
enum LiveActivityManager {

  // MARK: - Start Activity

  /// Starts a new Commute Live Activity.
  /// Ends any existing activity first to prevent duplicates.
  /// - Returns: A tuple of (activityId, pushTokenHex) or nil if unsupported/failed.
  @available(iOS 16.1, *)
  static func startActivity(
    attributes: CommuteActivityAttributes,
    state: CommuteActivityAttributes.ContentState
  ) -> (activityId: String, pushToken: String?)? {
    // End existing activities first
    endAllActivities()

    do {
      let activityContent = ActivityContent(
        state: state,
        staleDate: Calendar.current.date(
          byAdding: .minute,
          value: 30,
          to: state.optimalDepartureAt
        )
      )

      let activity = try Activity.request(
        attributes: attributes,
        content: activityContent,
        pushType: .token
      )

      // Save to App Group for widget extension access
      saveSharedData(activityId: activity.id, mode: attributes.mode)

      // Convert push token to hex string
      let pushTokenHex = activity.pushToken.map { tokenToHexString($0) }

      return (activityId: activity.id, pushToken: pushTokenHex)
    } catch {
      print("[LiveActivity] Failed to start: \(error)")
      return nil
    }
  }

  // MARK: - Update Activity

  /// Updates an existing Live Activity with new content state.
  /// - Returns: true if update succeeded, false otherwise.
  @available(iOS 16.1, *)
  static func updateActivity(
    activityId: String,
    newState: CommuteActivityAttributes.ContentState
  ) -> Bool {
    guard let activity = findActivity(by: activityId) else {
      print("[LiveActivity] Activity not found: \(activityId)")
      return false
    }

    let updatedContent = ActivityContent(
      state: newState,
      staleDate: Calendar.current.date(
        byAdding: .minute,
        value: 30,
        to: newState.optimalDepartureAt
      )
    )

    Task {
      await activity.update(updatedContent)
    }

    return true
  }

  // MARK: - End Activity

  /// Ends a specific Live Activity by its ID.
  /// Displays a final state briefly before dismissing.
  /// - Returns: true if the activity was found and ended.
  @available(iOS 16.1, *)
  static func endActivity(activityId: String) -> Bool {
    guard let activity = findActivity(by: activityId) else {
      print("[LiveActivity] Activity not found for end: \(activityId)")
      return false
    }

    Task {
      // Create a final "arrived" state
      let finalState = CommuteActivityAttributes.ContentState(
        optimalDepartureAt: Date(),
        estimatedTravelMin: 0,
        status: "arrived",
        minutesUntilDeparture: 0,
        minutesUntilArrival: 0,
        currentCheckpointIndex: nil,
        nextCheckpoint: nil,
        nextTransitInfo: nil,
        hasTrafficDelay: false,
        trafficDelayMessage: nil,
        estimatedArrivalTime: nil,
        updatedAt: Date()
      )

      let finalContent = ActivityContent(
        state: finalState,
        staleDate: nil
      )

      // Dismiss after 10 seconds
      await activity.end(
        finalContent,
        dismissalPolicy: .after(Date().addingTimeInterval(10))
      )
    }

    clearSharedData()
    return true
  }

  // MARK: - End All Activities

  /// Ends all active Commute Live Activities.
  @available(iOS 16.1, *)
  static func endAllActivities() {
    let activities = Activity<CommuteActivityAttributes>.activities
    for activity in activities {
      Task {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
    clearSharedData()
  }

  // MARK: - Get Active Activity

  /// Returns info about the currently active Live Activity, if any.
  @available(iOS 16.1, *)
  static func getActiveActivity() -> (activityId: String, pushToken: String?, isActive: Bool)? {
    let activities = Activity<CommuteActivityAttributes>.activities
    guard let activity = activities.first else { return nil }

    let pushTokenHex = activity.pushToken.map { tokenToHexString($0) }
    let isActive = activity.activityState == .active

    return (activityId: activity.id, pushToken: pushTokenHex, isActive: isActive)
  }

  // MARK: - Is Supported

  /// Checks whether Live Activities are supported on this device and OS version.
  static func isSupported() -> Bool {
    if #available(iOS 16.1, *) {
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }
    return false
  }

  // MARK: - Private Helpers

  @available(iOS 16.1, *)
  private static func findActivity(
    by activityId: String
  ) -> Activity<CommuteActivityAttributes>? {
    return Activity<CommuteActivityAttributes>.activities.first { $0.id == activityId }
  }

  private static func tokenToHexString(_ data: Data) -> String {
    return data.map { String(format: "%02x", $0) }.joined()
  }

  // MARK: - App Group Shared Data

  private static let appGroupId = "group.com.commutemate.app"
  private static let liveActivityDataKey = "liveActivityData"

  private static func saveSharedData(activityId: String, mode: String) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else { return }

    let data = LiveActivitySharedData(
      activityId: activityId,
      mode: mode,
      startedAt: ISO8601DateFormatter().string(from: Date()),
      isActive: true
    )

    do {
      let encoded = try JSONEncoder().encode(data)
      if let jsonString = String(data: encoded, encoding: .utf8) {
        defaults.set(jsonString, forKey: liveActivityDataKey)
        defaults.synchronize()
      }
    } catch {
      print("[LiveActivity] Failed to save shared data: \(error)")
    }
  }

  private static func clearSharedData() {
    guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
    defaults.removeObject(forKey: liveActivityDataKey)
    defaults.synchronize()
  }
}
