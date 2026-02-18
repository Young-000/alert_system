import SwiftUI
import WidgetKit

// MARK: - Widget Bundle

@main
struct CommuteWidgetBundle: WidgetBundle {
  var body: some Widget {
    CommuteWidget()
  }
}

// MARK: - Widget Configuration

struct CommuteWidget: Widget {
  let kind: String = "CommuteWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: CommuteTimelineProvider()) { entry in
      CommuteWidgetEntryView(entry: entry)
        .widgetURL(URL(string: "commute-mate://home"))
    }
    .configurationDisplayName("출퇴근 메이트")
    .description("날씨, 미세먼지, 교통 정보를 한눈에 확인하세요")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Entry View (routes to Small or Medium based on widget family)

struct CommuteWidgetEntryView: View {
  @Environment(\.widgetFamily) var family
  let entry: CommuteWidgetEntry

  var body: some View {
    switch family {
    case .systemSmall:
      CommuteWidgetSmall(entry: entry)
    case .systemMedium:
      CommuteWidgetMedium(entry: entry)
    default:
      CommuteWidgetSmall(entry: entry)
    }
  }
}
