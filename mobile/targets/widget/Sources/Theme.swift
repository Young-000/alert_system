import SwiftUI

// MARK: - Color Theme

enum WidgetTheme {
  // Primary text: temperature, time values
  static let primaryText = Color(red: 0.067, green: 0.094, blue: 0.153) // #111827

  // Secondary text: labels
  static let secondaryText = Color(red: 0.420, green: 0.451, blue: 0.498) // #6B7280

  // Accent color (app brand)
  static let accent = Color(red: 0.231, green: 0.510, blue: 0.965) // #3B82F6

  // Widget background
  static let widgetBackground = Color.white

  // MARK: - AQI Colors

  struct AqiColors {
    let background: Color
    let text: Color
  }

  static func aqiColors(for level: String) -> AqiColors {
    switch level {
    case "good":
      return AqiColors(
        background: Color(red: 0.063, green: 0.725, blue: 0.506), // #10B981
        text: Color(red: 0.024, green: 0.373, blue: 0.275) // #065F46
      )
    case "moderate":
      return AqiColors(
        background: Color(red: 0.961, green: 0.620, blue: 0.043), // #F59E0B
        text: Color(red: 0.573, green: 0.251, blue: 0.055) // #92400E
      )
    case "unhealthy":
      return AqiColors(
        background: Color(red: 0.937, green: 0.267, blue: 0.267), // #EF4444
        text: Color(red: 0.600, green: 0.106, blue: 0.106) // #991B1B
      )
    case "veryUnhealthy":
      return AqiColors(
        background: Color(red: 0.486, green: 0.228, blue: 0.929), // #7C3AED
        text: Color(red: 0.298, green: 0.114, blue: 0.584) // #4C1D95
      )
    default:
      return AqiColors(
        background: Color.gray.opacity(0.3),
        text: Color.gray
      )
    }
  }
}

// MARK: - Font Styles

extension Font {
  static let widgetTemperature = Font.system(size: 20, weight: .bold)
  static let widgetLabel = Font.system(size: 12, weight: .medium)
  static let widgetValue = Font.system(size: 13, weight: .semibold)
  static let widgetCaption = Font.system(size: 11, weight: .regular)

  static let mediumTemperature = Font.system(size: 22, weight: .bold)
  static let mediumLabel = Font.system(size: 13, weight: .medium)
  static let mediumValue = Font.system(size: 14, weight: .semibold)
}

// MARK: - Spacing

enum WidgetSpacing {
  static let small: CGFloat = 4
  static let medium: CGFloat = 8
  static let large: CGFloat = 12
}
