import SwiftUI
import WidgetKit

// MARK: - Medium Widget View (systemMedium, 4x2)

struct CommuteWidgetMedium: View {
  let entry: CommuteWidgetEntry

  var body: some View {
    if !entry.isLoggedIn {
      loginRequiredView
    } else if let data = entry.data {
      dataView(data)
    } else {
      placeholderView
    }
  }

  // MARK: - Data View

  private func dataView(_ data: WidgetData) -> some View {
    VStack(alignment: .leading, spacing: WidgetSpacing.medium) {
      // Line 1: Weather + Feels-like + AQI with PM10
      weatherRow(data.weather, airQuality: data.airQuality)

      Spacer()

      // Line 3: Next Alert with type label
      alertRow(data.nextAlert)

      // Line 4: Subway + Bus side by side
      transitRow(data.transit)

      // Stale indicator
      if entry.isStale {
        Text("업데이트 중...")
          .font(.system(size: 9, weight: .regular))
          .foregroundColor(WidgetTheme.secondaryText.opacity(0.6))
      }
    }
    .padding(WidgetSpacing.large)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  // MARK: - Weather Row

  private func weatherRow(_ weather: WidgetWeather?, airQuality: WidgetAirQuality?) -> some View {
    HStack(spacing: WidgetSpacing.medium) {
      if let weather = weather {
        // Emoji + Temperature
        HStack(spacing: WidgetSpacing.small) {
          Text(weather.conditionEmoji)
            .font(.system(size: 18))

          Text("\(Int(weather.temperature))°C")
            .font(.mediumTemperature)
            .foregroundColor(WidgetTheme.primaryText)
        }

        // Feels-like
        if let feelsLike = weather.feelsLike {
          Text("체감 \(Int(feelsLike))°")
            .font(.mediumLabel)
            .foregroundColor(WidgetTheme.secondaryText)
        }
      } else {
        Text("--°C")
          .font(.mediumTemperature)
          .foregroundColor(WidgetTheme.secondaryText)
      }

      Spacer()

      // AQI Badge with PM10 value
      if let aq = airQuality {
        aqiBadgeWithValue(aq)
      }
    }
  }

  // MARK: - AQI Badge with Value

  private func aqiBadgeWithValue(_ airQuality: WidgetAirQuality) -> some View {
    let colors = WidgetTheme.aqiColors(for: airQuality.statusLevel)
    return HStack(spacing: 4) {
      Text(airQuality.status)
        .font(.system(size: 11, weight: .semibold))
        .foregroundColor(colors.text)

      Text("(\(airQuality.pm10))")
        .font(.system(size: 10, weight: .medium))
        .foregroundColor(colors.text.opacity(0.8))
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 3)
    .background(colors.background.opacity(0.2))
    .cornerRadius(10)
  }

  // MARK: - Alert Row

  private func alertRow(_ nextAlert: WidgetNextAlert?) -> some View {
    HStack(spacing: WidgetSpacing.small) {
      Image(systemName: "alarm")
        .font(.system(size: 12))
        .foregroundColor(WidgetTheme.accent)

      if let alert = nextAlert {
        Text("다음 알림:")
          .font(.mediumLabel)
          .foregroundColor(WidgetTheme.secondaryText)

        Text(alert.time)
          .font(.mediumValue)
          .foregroundColor(WidgetTheme.primaryText)

        Text("(\(alert.label))")
          .font(.system(size: 11, weight: .regular))
          .foregroundColor(WidgetTheme.secondaryText)
      } else {
        Text("알림 없음")
          .font(.mediumLabel)
          .foregroundColor(WidgetTheme.secondaryText)
      }
    }
  }

  // MARK: - Transit Row (Subway + Bus side by side)

  private func transitRow(_ transit: WidgetTransit) -> some View {
    HStack(spacing: WidgetSpacing.medium) {
      // Subway info
      if let subway = transit.subway {
        HStack(spacing: WidgetSpacing.small) {
          Image(systemName: "tram.fill")
            .font(.system(size: 11))
            .foregroundColor(WidgetTheme.accent)

          Text("\(subway.stationName) \(subway.lineInfo)")
            .font(.widgetCaption)
            .foregroundColor(WidgetTheme.secondaryText)
            .lineLimit(1)

          Text("\(subway.arrivalMinutes)분")
            .font(.mediumValue)
            .foregroundColor(WidgetTheme.primaryText)
        }
      }

      // Divider between subway and bus
      if transit.subway != nil && transit.bus != nil {
        Text("/")
          .font(.widgetCaption)
          .foregroundColor(WidgetTheme.secondaryText.opacity(0.5))
      }

      // Bus info
      if let bus = transit.bus {
        HStack(spacing: WidgetSpacing.small) {
          Image(systemName: "bus.fill")
            .font(.system(size: 11))
            .foregroundColor(WidgetTheme.accent)

          Text(bus.routeName)
            .font(.widgetCaption)
            .foregroundColor(WidgetTheme.secondaryText)
            .lineLimit(1)

          Text("\(bus.arrivalMinutes)분")
            .font(.mediumValue)
            .foregroundColor(WidgetTheme.primaryText)
        }
      }

      // No transit data
      if transit.subway == nil && transit.bus == nil {
        HStack(spacing: WidgetSpacing.small) {
          Image(systemName: "map")
            .font(.system(size: 11))
            .foregroundColor(WidgetTheme.secondaryText)

          Text("경로 탭에서 출퇴근 경로를 설정하세요")
            .font(.widgetCaption)
            .foregroundColor(WidgetTheme.secondaryText)
        }
      }
    }
  }

  // MARK: - Login Required View

  private var loginRequiredView: some View {
    HStack(spacing: WidgetSpacing.large) {
      Image(systemName: "person.crop.circle.badge.exclamationmark")
        .font(.system(size: 32))
        .foregroundColor(WidgetTheme.secondaryText)

      VStack(alignment: .leading, spacing: WidgetSpacing.small) {
        Text("로그인이 필요합니다")
          .font(.mediumLabel)
          .foregroundColor(WidgetTheme.primaryText)

        Text("앱을 열어 로그인해주세요")
          .font(.widgetCaption)
          .foregroundColor(WidgetTheme.secondaryText)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding(WidgetSpacing.large)
  }

  // MARK: - Placeholder View

  private var placeholderView: some View {
    VStack(alignment: .leading, spacing: WidgetSpacing.medium) {
      HStack {
        RoundedRectangle(cornerRadius: 4)
          .fill(Color.gray.opacity(0.2))
          .frame(width: 80, height: 22)

        RoundedRectangle(cornerRadius: 4)
          .fill(Color.gray.opacity(0.2))
          .frame(width: 60, height: 16)

        Spacer()

        RoundedRectangle(cornerRadius: 10)
          .fill(Color.gray.opacity(0.2))
          .frame(width: 70, height: 20)
      }

      Spacer()

      RoundedRectangle(cornerRadius: 4)
        .fill(Color.gray.opacity(0.2))
        .frame(height: 16)

      HStack {
        RoundedRectangle(cornerRadius: 4)
          .fill(Color.gray.opacity(0.2))
          .frame(width: 120, height: 14)

        RoundedRectangle(cornerRadius: 4)
          .fill(Color.gray.opacity(0.2))
          .frame(width: 100, height: 14)
      }
    }
    .padding(WidgetSpacing.large)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

// MARK: - Preview

#Preview("Medium - Data", as: .systemMedium) {
  CommuteWidget()
} timeline: {
  CommuteWidgetEntry(
    date: Date(),
    data: .placeholder,
    isLoggedIn: true,
    isStale: false
  )
}

#Preview("Medium - Not Logged In", as: .systemMedium) {
  CommuteWidget()
} timeline: {
  CommuteWidgetEntry(
    date: Date(),
    data: nil,
    isLoggedIn: false,
    isStale: false
  )
}

#Preview("Medium - Stale Data", as: .systemMedium) {
  CommuteWidget()
} timeline: {
  CommuteWidgetEntry(
    date: Date(),
    data: .placeholder,
    isLoggedIn: true,
    isStale: true
  )
}
