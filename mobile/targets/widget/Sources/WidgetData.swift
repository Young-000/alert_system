import Foundation

// MARK: - Widget Data Model (Codable, matches backend WidgetDataResponse)

struct WidgetData: Codable {
  let weather: WidgetWeather?
  let airQuality: WidgetAirQuality?
  let nextAlert: WidgetNextAlert?
  let transit: WidgetTransit
  let updatedAt: String
}

struct WidgetWeather: Codable {
  let temperature: Double
  let condition: String
  let conditionEmoji: String
  let conditionKr: String
  let feelsLike: Double?
  let maxTemp: Double?
  let minTemp: Double?
}

struct WidgetAirQuality: Codable {
  let pm10: Int
  let pm25: Int
  let status: String
  let statusLevel: String // "good" | "moderate" | "unhealthy" | "veryUnhealthy"
}

struct WidgetNextAlert: Codable {
  let time: String
  let label: String
  let alertTypes: [String]
}

struct WidgetTransit: Codable {
  let subway: WidgetSubway?
  let bus: WidgetBus?
}

struct WidgetSubway: Codable {
  let stationName: String
  let lineInfo: String
  let arrivalMinutes: Int
  let destination: String
}

struct WidgetBus: Codable {
  let stopName: String
  let routeName: String
  let arrivalMinutes: Int
  let remainingStops: Int
}

// MARK: - Placeholder Data

extension WidgetData {
  static let placeholder = WidgetData(
    weather: WidgetWeather(
      temperature: 3,
      condition: "Clear",
      conditionEmoji: "☀️",
      conditionKr: "맑음",
      feelsLike: -2,
      maxTemp: 7,
      minTemp: -3
    ),
    airQuality: WidgetAirQuality(
      pm10: 35,
      pm25: 18,
      status: "좋음",
      statusLevel: "good"
    ),
    nextAlert: WidgetNextAlert(
      time: "07:30",
      label: "출근 알림",
      alertTypes: ["weather", "subway"]
    ),
    transit: WidgetTransit(
      subway: WidgetSubway(
        stationName: "강남역",
        lineInfo: "2호선",
        arrivalMinutes: 3,
        destination: "삼성행"
      ),
      bus: WidgetBus(
        stopName: "강남역",
        routeName: "146번",
        arrivalMinutes: 5,
        remainingStops: 3
      )
    ),
    updatedAt: ISO8601DateFormatter().string(from: Date())
  )
}
