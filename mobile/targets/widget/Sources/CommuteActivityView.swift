import SwiftUI
import WidgetKit

// MARK: - Lock Screen Live Activity View (SW-2)

/// Renders the Live Activity on the Lock Screen.
/// Displays 5 different states: preparing, departureSoon, departureNow, inTransit, arrived.
@available(iOS 16.1, *)
struct CommuteActivityView: View {
  let attributes: CommuteActivityAttributes
  let state: CommuteActivityAttributes.ContentState

  // ─── Status Colors ──────────────────────────────────

  private var statusColor: Color {
    let isReturnMode = attributes.mode == "return"

    switch state.status {
    case "preparing":
      return isReturnMode ? LiveActivityTheme.returnPurple : LiveActivityTheme.commuteBlue
    case "departureSoon":
      return LiveActivityTheme.warningOrange
    case "departureNow":
      return LiveActivityTheme.urgentRed
    case "inTransit":
      return LiveActivityTheme.transitGreen
    case "arrived":
      return LiveActivityTheme.transitGreen
    default:
      return isReturnMode ? LiveActivityTheme.returnPurple : LiveActivityTheme.commuteBlue
    }
  }

  private var modeIcon: String {
    attributes.mode == "return" ? "🌙" : "🚀"
  }

  private var modeLabel: String {
    attributes.mode == "return" ? "퇴근" : "출근"
  }

  // ─── Main View ──────────────────────────────────────

  var body: some View {
    switch state.status {
    case "inTransit":
      inTransitView
    case "arrived":
      arrivedView
    default:
      preparingView
    }
  }

  // MARK: - Preparing / DepartureSoon / DepartureNow View

  private var preparingView: some View {
    VStack(alignment: .leading, spacing: 6) {
      // Header: mode icon + label + countdown
      headerRow

      // Divider
      Rectangle()
        .fill(Color.white.opacity(0.2))
        .frame(height: 1)

      // Timeline: departure → arrival
      timelineRow

      // Progress bar
      progressBar

      // Bottom info: transit + delay
      bottomInfoRow
    }
    .padding(12)
  }

  // MARK: - In Transit View

  private var inTransitView: some View {
    VStack(alignment: .leading, spacing: 6) {
      // Header
      HStack {
        Text("🏃")
          .font(.system(size: 16))
        Text("이동 중 (\(modeLabel))")
          .font(.system(size: 14, weight: .semibold))
          .foregroundColor(.white)
        Spacer()
        if let arrivalMin = state.minutesUntilArrival {
          Text("도착까지 \(arrivalMin)분")
            .font(.system(size: 13, weight: .bold))
            .foregroundColor(.white)
        }
      }

      Rectangle()
        .fill(Color.white.opacity(0.2))
        .frame(height: 1)

      // Route progress
      routeProgressView

      // Next checkpoint
      if let nextCheckpoint = state.nextCheckpoint {
        HStack(spacing: 4) {
          if let transitInfo = state.nextTransitInfo {
            Text("다음: \(nextCheckpoint) (\(transitInfo))")
              .font(.system(size: 12, weight: .medium))
              .foregroundColor(.white.opacity(0.9))
          } else {
            Text("다음: \(nextCheckpoint)")
              .font(.system(size: 12, weight: .medium))
              .foregroundColor(.white.opacity(0.9))
          }
        }
      }

      // Estimated arrival
      if let arrivalTime = state.estimatedArrivalTime {
        Text("예상 도착: \(arrivalTime)")
          .font(.system(size: 11, weight: .regular))
          .foregroundColor(.white.opacity(0.7))
      }
    }
    .padding(12)
  }

  // MARK: - Arrived View

  private var arrivedView: some View {
    VStack(spacing: 8) {
      Text("🎉")
        .font(.system(size: 28))
      Text("도착했습니다!")
        .font(.system(size: 16, weight: .bold))
        .foregroundColor(.white)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding(12)
  }

  // MARK: - Sub-Views

  private var headerRow: some View {
    HStack {
      Text(modeIcon)
        .font(.system(size: 16))

      Text(statusTitle)
        .font(.system(size: 14, weight: .semibold))
        .foregroundColor(.white)

      Spacer()

      // Countdown using Date-based auto-updating timer
      Text(timerInterval: Date()...state.optimalDepartureAt, countsDown: true)
        .font(.system(size: 14, weight: .bold))
        .foregroundColor(.white)
        .monospacedDigit()
    }
  }

  private var statusTitle: String {
    switch state.status {
    case "preparing":
      return "\(modeLabel) 준비"
    case "departureSoon":
      return "곧 출발하세요!"
    case "departureNow":
      return "지금 출발하세요!"
    default:
      return "\(modeLabel) 준비"
    }
  }

  private var timelineRow: some View {
    HStack {
      // Departure time
      VStack(alignment: .leading, spacing: 2) {
        Text("출발")
          .font(.system(size: 10, weight: .regular))
          .foregroundColor(.white.opacity(0.6))
        Text(formattedTime(state.optimalDepartureAt))
          .font(.system(size: 13, weight: .semibold))
          .foregroundColor(.white)
      }

      Spacer()

      // Travel duration
      Text("소요 \(state.estimatedTravelMin)분")
        .font(.system(size: 11, weight: .medium))
        .foregroundColor(.white.opacity(0.7))

      Spacer()

      // Arrival time
      VStack(alignment: .trailing, spacing: 2) {
        Text("도착")
          .font(.system(size: 10, weight: .regular))
          .foregroundColor(.white.opacity(0.6))
        Text(attributes.arrivalTarget)
          .font(.system(size: 13, weight: .semibold))
          .foregroundColor(.white)
      }
    }
  }

  private var progressBar: some View {
    GeometryReader { geometry in
      ZStack(alignment: .leading) {
        // Background track
        RoundedRectangle(cornerRadius: 2)
          .fill(Color.white.opacity(0.2))
          .frame(height: 4)

        // Progress fill (based on minutes until departure vs 60min window)
        let progress = max(0, min(1, 1.0 - Double(state.minutesUntilDeparture) / 60.0))
        RoundedRectangle(cornerRadius: 2)
          .fill(statusColor)
          .frame(width: geometry.size.width * progress, height: 4)

        // Current position indicator
        Circle()
          .fill(Color.white)
          .frame(width: 8, height: 8)
          .offset(x: geometry.size.width * progress - 4)
      }
    }
    .frame(height: 8)
  }

  private var routeProgressView: some View {
    HStack(spacing: 0) {
      let checkpoints = attributes.checkpoints
      let currentIdx = state.currentCheckpointIndex ?? 0

      ForEach(0..<checkpoints.count, id: \.self) { idx in
        HStack(spacing: 2) {
          // Checkpoint marker
          if idx < currentIdx {
            // Passed checkpoint
            Circle()
              .fill(LiveActivityTheme.transitGreen)
              .frame(width: 8, height: 8)
          } else if idx == currentIdx {
            // Current position
            Circle()
              .fill(Color.white)
              .frame(width: 10, height: 10)
              .overlay(
                Circle()
                  .stroke(LiveActivityTheme.transitGreen, lineWidth: 2)
              )
          } else {
            // Future checkpoint
            Circle()
              .fill(Color.white.opacity(0.3))
              .frame(width: 8, height: 8)
          }

          // Checkpoint name
          Text(checkpoints[idx])
            .font(.system(size: 10, weight: idx == currentIdx ? .bold : .regular))
            .foregroundColor(idx <= currentIdx ? .white : .white.opacity(0.5))
            .lineLimit(1)
        }

        // Connector line
        if idx < checkpoints.count - 1 {
          Rectangle()
            .fill(idx < currentIdx ? LiveActivityTheme.transitGreen : Color.white.opacity(0.2))
            .frame(height: 2)
        }
      }
    }
  }

  private var bottomInfoRow: some View {
    HStack(spacing: 8) {
      // Transit info
      if let transitInfo = state.nextTransitInfo {
        HStack(spacing: 4) {
          Image(systemName: "tram.fill")
            .font(.system(size: 10))
            .foregroundColor(.white.opacity(0.8))
          Text(transitInfo)
            .font(.system(size: 11, weight: .medium))
            .foregroundColor(.white.opacity(0.8))
        }
      }

      Spacer()

      // Traffic delay badge
      if state.hasTrafficDelay {
        HStack(spacing: 2) {
          Text("⚠️")
            .font(.system(size: 10))
          Text(state.trafficDelayMessage ?? "교통 지연")
            .font(.system(size: 10, weight: .medium))
            .foregroundColor(LiveActivityTheme.warningOrange)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(LiveActivityTheme.warningOrange.opacity(0.2))
        .cornerRadius(6)
      }
    }
  }

  // MARK: - Helpers

  private func formattedTime(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "HH:mm"
    formatter.locale = Locale(identifier: "ko_KR")
    return formatter.string(from: date)
  }
}

// MARK: - Live Activity Theme Colors

enum LiveActivityTheme {
  static let commuteBlue = Color(red: 0.231, green: 0.510, blue: 0.965) // #3B82F6
  static let returnPurple = Color(red: 0.486, green: 0.228, blue: 0.929) // #7C3AED
  static let warningOrange = Color(red: 0.961, green: 0.620, blue: 0.043) // #F59E0B
  static let urgentRed = Color(red: 0.937, green: 0.267, blue: 0.267) // #EF4444
  static let transitGreen = Color(red: 0.063, green: 0.725, blue: 0.506) // #10B981
}
