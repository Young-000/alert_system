import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Dynamic Island Views (SW-3)

/// Provides Compact, Expanded, and Minimal views for Dynamic Island.
/// Supports both commute (orange) and return (purple) mode themes.
@available(iOS 16.1, *)
struct CommuteLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: CommuteActivityAttributes.self) { context in
      // Lock Screen / StandBy view
      CommuteActivityView(
        attributes: context.attributes,
        state: context.state
      )
      .activityBackgroundTint(lockScreenBackground(for: context))
      .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        // ─── Expanded View ──────────────────────────────
        expandedView(context: context)
      } compactLeading: {
        // ─── Compact Leading: Mode Icon ─────────────────
        compactLeadingView(context: context)
      } compactTrailing: {
        // ─── Compact Trailing: Countdown Timer ──────────
        compactTrailingView(context: context)
      } minimal: {
        // ─── Minimal: Minutes Remaining Only ────────────
        minimalView(context: context)
      }
      .widgetURL(URL(string: "commute-mate://commute"))
      .keylineTint(modeAccentColor(for: context.attributes.mode))
    }
  }

  // MARK: - Lock Screen Background

  private func lockScreenBackground(
    for context: ActivityViewContext<CommuteActivityAttributes>
  ) -> Color {
    let isReturnMode = context.attributes.mode == "return"

    switch context.state.status {
    case "preparing":
      let base = isReturnMode ? LiveActivityTheme.returnPurple : LiveActivityTheme.commuteBlue
      return base.opacity(0.9)
    case "departureSoon":
      return LiveActivityTheme.warningOrange.opacity(0.9)
    case "departureNow":
      return LiveActivityTheme.urgentRed.opacity(0.9)
    case "inTransit":
      return LiveActivityTheme.transitGreen.opacity(0.9)
    case "arrived":
      return LiveActivityTheme.transitGreen.opacity(0.9)
    default:
      let base = isReturnMode ? LiveActivityTheme.returnPurple : LiveActivityTheme.commuteBlue
      return base.opacity(0.9)
    }
  }

  // MARK: - Mode Accent Color

  private func modeAccentColor(for mode: String) -> Color {
    mode == "return" ? LiveActivityTheme.returnPurple : LiveActivityTheme.warningOrange
  }

  // MARK: - Compact Leading (Mode Icon)

  @ViewBuilder
  private func compactLeadingView(
    context: ActivityViewContext<CommuteActivityAttributes>
  ) -> some View {
    let icon = context.attributes.mode == "return" ? "🌙" : "🚀"

    switch context.state.status {
    case "inTransit":
      Text("🏃")
        .font(.system(size: 14))
    default:
      Text(icon)
        .font(.system(size: 14))
    }
  }

  // MARK: - Compact Trailing (Countdown)

  @ViewBuilder
  private func compactTrailingView(
    context: ActivityViewContext<CommuteActivityAttributes>
  ) -> some View {
    switch context.state.status {
    case "inTransit":
      if let arrivalMin = context.state.minutesUntilArrival {
        Text("도착 \(arrivalMin)분")
          .font(.system(size: 12, weight: .semibold))
          .monospacedDigit()
      } else {
        Text("이동 중")
          .font(.system(size: 12, weight: .medium))
      }
    case "arrived":
      Text("도착!")
        .font(.system(size: 12, weight: .bold))
    default:
      Text(
        timerInterval: Date()...context.state.optimalDepartureAt,
        countsDown: true
      )
      .font(.system(size: 12, weight: .semibold))
      .monospacedDigit()
      .frame(width: 48)
    }
  }

  // MARK: - Minimal (Minutes Only)

  @ViewBuilder
  private func minimalView(
    context: ActivityViewContext<CommuteActivityAttributes>
  ) -> some View {
    switch context.state.status {
    case "inTransit":
      if let arrivalMin = context.state.minutesUntilArrival {
        Text("\(arrivalMin)분")
          .font(.system(size: 12, weight: .bold))
          .monospacedDigit()
      } else {
        Image(systemName: "figure.walk")
          .font(.system(size: 12))
      }
    case "arrived":
      Image(systemName: "checkmark.circle.fill")
        .font(.system(size: 14))
        .foregroundColor(LiveActivityTheme.transitGreen)
    default:
      Text("\(max(0, context.state.minutesUntilDeparture))분")
        .font(.system(size: 12, weight: .bold))
        .monospacedDigit()
    }
  }

  // MARK: - Expanded View

  @DynamicIslandExpandedContentBuilder
  private func expandedView(
    context: ActivityViewContext<CommuteActivityAttributes>
  ) -> DynamicIslandExpandedContent<some View> {
    let attrs = context.attributes
    let state = context.state
    let modeLabel = attrs.mode == "return" ? "퇴근" : "출근"

    DynamicIslandExpandedRegion(.leading) {
      HStack(spacing: 4) {
        Text(attrs.mode == "return" ? "🌙" : "🚀")
          .font(.system(size: 16))
        Text("\(modeLabel) \(expandedStatusLabel(state.status))")
          .font(.system(size: 13, weight: .semibold))
      }
    }

    DynamicIslandExpandedRegion(.trailing) {
      switch state.status {
      case "inTransit":
        if let arrivalMin = state.minutesUntilArrival {
          Text("\(arrivalMin)분 남음")
            .font(.system(size: 13, weight: .bold))
            .monospacedDigit()
        }
      case "arrived":
        Text("도착!")
          .font(.system(size: 13, weight: .bold))
      default:
        Text(
          timerInterval: Date()...state.optimalDepartureAt,
          countsDown: true
        )
        .font(.system(size: 13, weight: .bold))
        .monospacedDigit()
      }
    }

    DynamicIslandExpandedRegion(.bottom) {
      VStack(alignment: .leading, spacing: 4) {
        // Time info
        HStack {
          let departureTime = formattedTime(state.optimalDepartureAt)
          Text("\(departureTime) 출발 → \(attrs.arrivalTarget) 도착")
            .font(.system(size: 12, weight: .medium))

          Spacer()

          Text("소요 \(state.estimatedTravelMin)분")
            .font(.system(size: 11, weight: .regular))
            .foregroundColor(.secondary)
        }

        // Transit info
        if let transitInfo = state.nextTransitInfo {
          HStack(spacing: 4) {
            Image(systemName: "tram.fill")
              .font(.system(size: 10))
              .foregroundColor(.secondary)
            Text(transitInfo)
              .font(.system(size: 11, weight: .medium))
              .foregroundColor(.secondary)

            // Traffic delay
            if state.hasTrafficDelay {
              Spacer()
              Text("⚠️ \(state.trafficDelayMessage ?? "지연")")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(LiveActivityTheme.warningOrange)
            }
          }
        }
      }
    }
  }

  // MARK: - Helpers

  private func expandedStatusLabel(_ status: String) -> String {
    switch status {
    case "preparing":
      return "준비"
    case "departureSoon":
      return "곧 출발"
    case "departureNow":
      return "지금 출발!"
    case "inTransit":
      return "이동 중"
    case "arrived":
      return "도착"
    default:
      return "준비"
    }
  }

  private func formattedTime(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "HH:mm"
    formatter.locale = Locale(identifier: "ko_KR")
    return formatter.string(from: date)
  }
}
