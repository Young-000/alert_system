import Foundation
import Security

// MARK: - Shared Data Reader

/// Reads data from the shared App Group UserDefaults and Keychain.
/// Used by the WidgetKit extension to access data written by the main app.
enum SharedDataReader {
  private static let appGroupId = "group.com.commutemate.app"
  private static let widgetDataKey = "widgetData"
  private static let tokenAccount = "widgetAccessToken"

  // MARK: - Widget Data (UserDefaults)

  /// Reads and decodes widget data from App Group UserDefaults.
  /// Returns nil if no data exists or decoding fails.
  static func readWidgetData() -> WidgetData? {
    guard let defaults = UserDefaults(suiteName: appGroupId) else {
      return nil
    }

    guard let jsonString = defaults.string(forKey: widgetDataKey),
          let jsonData = jsonString.data(using: .utf8) else {
      return nil
    }

    do {
      let decoder = JSONDecoder()
      return try decoder.decode(WidgetData.self, from: jsonData)
    } catch {
      print("[CommuteWidget] Failed to decode widget data: \(error)")
      return nil
    }
  }

  /// Writes widget data back to App Group UserDefaults (used as cache by TimelineProvider).
  static func writeWidgetData(_ data: WidgetData) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else { return }

    do {
      let encoder = JSONEncoder()
      let jsonData = try encoder.encode(data)
      if let jsonString = String(data: jsonData, encoding: .utf8) {
        defaults.set(jsonString, forKey: widgetDataKey)
        defaults.synchronize()
      }
    } catch {
      print("[CommuteWidget] Failed to encode widget data: \(error)")
    }
  }

  // MARK: - Auth Token (Keychain)

  /// Reads the JWT auth token from the shared Keychain Access Group.
  /// Returns nil if no token exists or reading fails.
  static func readAuthToken() -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccessGroup as String: appGroupId,
      kSecAttrAccount as String: tokenAccount,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]

    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)

    guard status == errSecSuccess,
          let data = result as? Data,
          let token = String(data: data, encoding: .utf8) else {
      return nil
    }

    return token
  }

  // MARK: - Data Freshness

  /// Checks whether the cached widget data is still considered fresh.
  /// Data older than the specified interval (in seconds) is considered stale.
  static func isDataFresh(_ data: WidgetData, maxAge: TimeInterval = 3600) -> Bool {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    // Try with fractional seconds first, then without
    guard let updatedDate = formatter.date(from: data.updatedAt) ?? {
      formatter.formatOptions = [.withInternetDateTime]
      return formatter.date(from: data.updatedAt)
    }() else {
      return false
    }

    return Date().timeIntervalSince(updatedDate) < maxAge
  }
}
