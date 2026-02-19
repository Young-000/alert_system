import ExpoModulesCore
import ActivityKit
import Foundation

// MARK: - Live Activity Native Module (NM-1)

/// Expo native module that bridges React Native to iOS ActivityKit.
/// Exposes Live Activity lifecycle methods: start, update, end, query, and push token observation.
public class LiveActivityModule: Module {

  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    // ─── Events (NM-3: Push Token Observer) ─────────

    Events("onPushTokenUpdate")

    // ─── isSupported ────────────────────────────────

    AsyncFunction("isSupported") { () -> Bool in
      return LiveActivityManager.isSupported()
    }

    // ─── startActivity ──────────────────────────────

    AsyncFunction("startActivity") { (params: [String: Any]) -> [String: Any]? in
      guard #available(iOS 16.1, *) else { return nil }

      guard let mode = params["mode"] as? String,
            let routeName = params["routeName"] as? String,
            let arrivalTarget = params["arrivalTarget"] as? String,
            let checkpoints = params["checkpoints"] as? [String],
            let optimalDepartureAtStr = params["optimalDepartureAt"] as? String,
            let estimatedTravelMin = params["estimatedTravelMin"] as? Int else {
        throw LiveActivityError.invalidParams("Missing required parameters for startActivity")
      }

      guard let optimalDepartureAt = self.parseISO8601(optimalDepartureAtStr) else {
        throw LiveActivityError.invalidParams("Invalid ISO 8601 date: \(optimalDepartureAtStr)")
      }

      let attributes = CommuteActivityAttributes(
        mode: mode,
        routeName: routeName,
        arrivalTarget: arrivalTarget,
        checkpoints: checkpoints
      )

      let contentState = CommuteActivityAttributes.ContentState(
        optimalDepartureAt: optimalDepartureAt,
        estimatedTravelMin: estimatedTravelMin,
        status: "preparing",
        minutesUntilDeparture: Int(optimalDepartureAt.timeIntervalSinceNow / 60),
        minutesUntilArrival: nil,
        currentCheckpointIndex: nil,
        nextCheckpoint: params["nextCheckpoint"] as? String,
        nextTransitInfo: params["nextTransitInfo"] as? String,
        hasTrafficDelay: false,
        trafficDelayMessage: nil,
        estimatedArrivalTime: nil,
        updatedAt: Date()
      )

      guard let result = LiveActivityManager.startActivity(
        attributes: attributes,
        state: contentState
      ) else {
        return nil
      }

      // Start observing push token updates (NM-3)
      self.observePushTokenUpdates(activityId: result.activityId)

      return [
        "activityId": result.activityId,
        "pushToken": result.pushToken ?? "",
        "isActive": true,
      ]
    }

    // ─── updateActivity ─────────────────────────────

    AsyncFunction("updateActivity") { (params: [String: Any]) -> Bool in
      guard #available(iOS 16.1, *) else { return false }

      guard let activityId = params["activityId"] as? String,
            let optimalDepartureAtStr = params["optimalDepartureAt"] as? String,
            let estimatedTravelMin = params["estimatedTravelMin"] as? Int,
            let status = params["status"] as? String,
            let minutesUntilDeparture = params["minutesUntilDeparture"] as? Int else {
        throw LiveActivityError.invalidParams("Missing required parameters for updateActivity")
      }

      guard let optimalDepartureAt = self.parseISO8601(optimalDepartureAtStr) else {
        throw LiveActivityError.invalidParams("Invalid ISO 8601 date: \(optimalDepartureAtStr)")
      }

      let hasTrafficDelay = params["hasTrafficDelay"] as? Bool ?? false

      let newState = CommuteActivityAttributes.ContentState(
        optimalDepartureAt: optimalDepartureAt,
        estimatedTravelMin: estimatedTravelMin,
        status: status,
        minutesUntilDeparture: minutesUntilDeparture,
        minutesUntilArrival: params["minutesUntilArrival"] as? Int,
        currentCheckpointIndex: params["currentCheckpointIndex"] as? Int,
        nextCheckpoint: params["nextCheckpoint"] as? String,
        nextTransitInfo: params["nextTransitInfo"] as? String,
        hasTrafficDelay: hasTrafficDelay,
        trafficDelayMessage: params["trafficDelayMessage"] as? String,
        estimatedArrivalTime: params["estimatedArrivalTime"] as? String,
        updatedAt: Date()
      )

      return LiveActivityManager.updateActivity(
        activityId: activityId,
        newState: newState
      )
    }

    // ─── endActivity ────────────────────────────────

    AsyncFunction("endActivity") { (activityId: String) -> Bool in
      guard #available(iOS 16.1, *) else { return false }
      return LiveActivityManager.endActivity(activityId: activityId)
    }

    // ─── endAllActivities ───────────────────────────

    AsyncFunction("endAllActivities") { () -> Bool in
      guard #available(iOS 16.1, *) else { return false }
      LiveActivityManager.endAllActivities()
      return true
    }

    // ─── getActiveActivity ──────────────────────────

    AsyncFunction("getActiveActivity") { () -> [String: Any]? in
      guard #available(iOS 16.1, *) else { return nil }

      guard let info = LiveActivityManager.getActiveActivity() else {
        return nil
      }

      return [
        "activityId": info.activityId,
        "pushToken": info.pushToken ?? "",
        "isActive": info.isActive,
      ]
    }
  }

  // MARK: - Push Token Observer (NM-3)

  /// Observes ActivityKit push token updates and emits events to React Native.
  @available(iOS 16.1, *)
  private func observePushTokenUpdates(activityId: String) {
    guard let activity = Activity<CommuteActivityAttributes>.activities.first(
      where: { $0.id == activityId }
    ) else { return }

    Task {
      for await tokenData in activity.pushTokenUpdates {
        let tokenHex = tokenData.map { String(format: "%02x", $0) }.joined()
        self.sendEvent("onPushTokenUpdate", [
          "activityId": activityId,
          "pushToken": tokenHex,
        ])
      }
    }
  }

  // MARK: - Helpers

  private func parseISO8601(_ string: String) -> Date? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = formatter.date(from: string) {
      return date
    }
    // Retry without fractional seconds
    formatter.formatOptions = [.withInternetDateTime]
    return formatter.date(from: string)
  }
}

// MARK: - Error Types

enum LiveActivityError: Error, LocalizedError {
  case invalidParams(String)

  var errorDescription: String? {
    switch self {
    case .invalidParams(let message):
      return "LiveActivity: \(message)"
    }
  }
}
