import SwiftUI
import WidgetKit

// MARK: - Small Widget View (systemSmall, 2x2)

struct CommuteWidgetSmall: View {
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
      // Line 1: Weather + AQI
      weatherRow(data.weather, airQuality: data.airQuality)

      Spacer()

      // Line 3: Next Alert
      alertRow(data.nextAlert)

      // Line 4: Transit
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
    HStack(spacing: WidgetSpacing.small) {
      if let weather = weather {
        Text(weather.conditionEmoji)
          .font(.system(size: 16))

        Text("\(Int(weather.temperature))°")
          .font(.widgetTemperature)
          .foregroundColor(WidgetTheme.primaryText)
      } else {
        Text("--°")
          .font(.widgetTemperature)
          .foregroundColor(WidgetTheme.secondaryText)
      }

      Spacer()

      if let aq = airQuality {
        aqiBadge(aq)
      }
    }
  }

  // MARK: - AQI Badge

  private func aqiBadge(_ airQuality: WidgetAirQuality) -> some View {
    let colors = WidgetTheme.aqiColors(for: airQuality.statusLevel)
    return Text(airQuality.status)
      .font(.system(size: 10, weight: .semibold))
      .foregroundColor(colors.text)
      .padding(.horizontal, 6)
      .padding(.vertical, 2)
      .background(colors.background.opacity(0.2))
      .cornerRadius(8)
  }

  // MARK: - Alert Row

  private func alertRow(_ nextAlert: WidgetNextAlert?) -> some View {
    HStack(spacing: WidgetSpacing.small) {
      Image(systemName: "alarm")
        .font(.system(size: 11))
        .foregroundColor(WidgetTheme.accent)

      if let alert = nextAlert {
        Text("다음 알림")
          .font(.widgetCaption)
          .foregroundColor(WidgetTheme.secondaryText)

        Text(alert.time)
          .font(.widgetValue)
          .foregroundColor(WidgetTheme.primaryText)
      } else {
        Text("알림 없음")
          .font(.widgetCaption)
          .foregroundColor(WidgetTheme.secondaryText)
      }
    }
  }

  // MARK: - Transit Row

  private func transitRow(_ transit: WidgetTransit) -> some View {
    HStack(spacing: WidgetSpacing.small) {
      if let subway = transit.subway {
        Image(systemName: "tram.fill")
          .font(.system(size: 11))
          .foregroundColor(WidgetTheme.accent)

        Text(subway.stationName)
          .font(.widgetCaption)
          .foregroundColor(WidgetTheme.secondaryText)

        Text("\(subway.arrivalMinutes)분")
          .font(.widgetValue)
          .foregroundColor(WidgetTheme.primaryText)
      } else if let bus = transit.bus {
        Image(systemName: "bus.fill")
          .font(.system(size: 11))
          .foregroundColor(WidgetTheme.accent)

        Text(bus.routeName)
          .font(.widgetCaption)
          .foregroundColor(WidgetTheme.secondaryText)

        Text("\(bus.arrivalMinutes)분")
          .font(.widgetValue)
          .foregroundColor(WidgetTheme.primaryText)
      } else {
        Image(systemName: "map")
          .font(.system(size: 11))
          .foregroundColor(WidgetTheme.secondaryText)

        Text("경로를 설정하세요")
          .font(.widgetCaption)
          .foregroundColor(WidgetTheme.secondaryText)
      }
    }
  }

  // MARK: - Login Required View

  private var loginRequiredView: some View {
    VStack(spacing: WidgetSpacing.medium) {
      Image(systemName: "person.crop.circle.badge.exclamationmark")
        .font(.system(size: 28))
        .foregroundColor(WidgetTheme.secondaryText)

      Text("로그인이 필요합니다")
        .font(.widgetLabel)
        .foregroundColor(WidgetTheme.secondaryText)
        .multilineTextAlignment(.center)
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
          .frame(width: 50, height: 20)

        Spacer()

        RoundedRectangle(cornerRadius: 8)
          .fill(Color.gray.opacity(0.2))
          .frame(width: 40, height: 16)
      }

      Spacer()

      RoundedRectangle(cornerRadius: 4)
        .fill(Color.gray.opacity(0.2))
        .frame(height: 14)

      RoundedRectangle(cornerRadius: 4)
        .fill(Color.gray.opacity(0.2))
        .frame(height: 14)
    }
    .padding(WidgetSpacing.large)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

// MARK: - Preview

#Preview("Small - Data", as: .systemSmall) {
  CommuteWidget()
} timeline: {
  CommuteWidgetEntry(
    date: Date(),
    data: .placeholder,
    isLoggedIn: true,
    isStale: false
  )
}

#Preview("Small - Not Logged In", as: .systemSmall) {
  CommuteWidget()
} timeline: {
  CommuteWidgetEntry(
    date: Date(),
    data: nil,
    isLoggedIn: false,
    isStale: false
  )
}

#Preview("Small - No Data", as: .systemSmall) {
  CommuteWidget()
} timeline: {
  CommuteWidgetEntry(
    date: Date(),
    data: nil,
    isLoggedIn: true,
    isStale: false
  )
}
