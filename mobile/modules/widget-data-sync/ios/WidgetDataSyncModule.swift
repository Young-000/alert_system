import ExpoModulesCore
import WidgetKit

public class WidgetDataSyncModule: Module {
  private let appGroupId = "group.com.commutemate.app"
  private let widgetDataKey = "widgetData"
  private let tokenAccount = "widgetAccessToken"
  private let widgetKind = "CommuteWidget"

  public func definition() -> ModuleDefinition {
    Name("WidgetDataSync")

    // MARK: - syncWidgetData
    // Writes JSON string to App Group UserDefaults and reloads widget timelines.
    AsyncFunction("syncWidgetData") { (jsonString: String) in
      guard let defaults = UserDefaults(suiteName: self.appGroupId) else {
        throw WidgetSyncError.appGroupNotFound
      }
      defaults.set(jsonString, forKey: self.widgetDataKey)
      defaults.synchronize()

      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadTimelines(ofKind: self.widgetKind)
      }
    }

    // MARK: - getWidgetData
    // Reads cached widget data from App Group UserDefaults.
    // On iOS this is primarily used by the WidgetKit extension (Swift side),
    // but exposed here for API parity with the Android module.
    AsyncFunction("getWidgetData") { () -> String? in
      guard let defaults = UserDefaults(suiteName: self.appGroupId) else {
        return nil
      }
      return defaults.string(forKey: self.widgetDataKey)
    }

    // MARK: - clearWidgetData
    // Removes widget data from App Group UserDefaults and reloads timelines.
    AsyncFunction("clearWidgetData") {
      guard let defaults = UserDefaults(suiteName: self.appGroupId) else {
        throw WidgetSyncError.appGroupNotFound
      }
      defaults.removeObject(forKey: self.widgetDataKey)
      defaults.synchronize()

      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadTimelines(ofKind: self.widgetKind)
      }
    }

    // MARK: - syncAuthToken
    // Writes JWT token to Keychain with shared Access Group.
    AsyncFunction("syncAuthToken") { (token: String) in
      guard let tokenData = token.data(using: .utf8) else {
        throw WidgetSyncError.invalidToken
      }

      // Delete existing item first
      let deleteQuery: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccessGroup as String: self.appGroupId,
        kSecAttrAccount as String: self.tokenAccount,
      ]
      SecItemDelete(deleteQuery as CFDictionary)

      // Add new item
      let addQuery: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccessGroup as String: self.appGroupId,
        kSecAttrAccount as String: self.tokenAccount,
        kSecValueData as String: tokenData,
        kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
      ]

      let status = SecItemAdd(addQuery as CFDictionary, nil)
      if status != errSecSuccess {
        throw WidgetSyncError.keychainWriteFailed(status: status)
      }
    }

    // MARK: - clearAuthToken
    // Removes JWT token from shared Keychain and reloads widget timelines.
    AsyncFunction("clearAuthToken") {
      let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccessGroup as String: self.appGroupId,
        kSecAttrAccount as String: self.tokenAccount,
      ]
      SecItemDelete(query as CFDictionary)

      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadTimelines(ofKind: self.widgetKind)
      }
    }
  }
}

// MARK: - Error Types

enum WidgetSyncError: Error, LocalizedError {
  case appGroupNotFound
  case invalidToken
  case keychainWriteFailed(status: OSStatus)

  var errorDescription: String? {
    switch self {
    case .appGroupNotFound:
      return "App Group '\(appGroupId)' not found. Ensure entitlements are configured."
    case .invalidToken:
      return "Token string could not be encoded to UTF-8 data."
    case .keychainWriteFailed(let status):
      return "Keychain write failed with status: \(status)"
    }
  }

  private var appGroupId: String { "group.com.commutemate.app" }
}
