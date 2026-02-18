import WidgetKit
import Foundation

// MARK: - Widget Entry

struct CommuteWidgetEntry: TimelineEntry {
  let date: Date
  let data: WidgetData?
  let isLoggedIn: Bool
  let isStale: Bool
}

// MARK: - Timeline Provider

struct CommuteTimelineProvider: TimelineProvider {
  private let apiBaseURL = "https://d1qgl3ij2xig8k.cloudfront.net"

  // MARK: - Placeholder

  func placeholder(in context: Context) -> CommuteWidgetEntry {
    CommuteWidgetEntry(
      date: Date(),
      data: .placeholder,
      isLoggedIn: true,
      isStale: false
    )
  }

  // MARK: - Snapshot (Widget Gallery Preview)

  func getSnapshot(in context: Context, completion: @escaping (CommuteWidgetEntry) -> Void) {
    if context.isPreview {
      completion(placeholder(in: context))
      return
    }

    let cachedData = SharedDataReader.readWidgetData()
    let isLoggedIn = SharedDataReader.readAuthToken() != nil
    let isStale = cachedData.map { !SharedDataReader.isDataFresh($0) } ?? false

    completion(CommuteWidgetEntry(
      date: Date(),
      data: cachedData,
      isLoggedIn: isLoggedIn,
      isStale: isStale
    ))
  }

  // MARK: - Timeline

  func getTimeline(in context: Context, completion: @escaping (Timeline<CommuteWidgetEntry>) -> Void) {
    let now = Date()
    let calendar = Calendar.current
    let hour = calendar.component(.hour, from: now)

    // Night mode: 23:00 - 05:00 -> no refresh until 6 AM
    if hour >= 23 || hour < 5 {
      let cachedData = SharedDataReader.readWidgetData()
      let isLoggedIn = SharedDataReader.readAuthToken() != nil

      // Schedule next refresh at 6 AM
      var nextRefresh = calendar.startOfDay(for: now)
      nextRefresh = calendar.date(bySettingHour: 6, minute: 0, second: 0, of: nextRefresh)!
      if nextRefresh <= now {
        // Already past 6 AM today, so next 6 AM is tomorrow
        nextRefresh = calendar.date(byAdding: .day, value: 1, to: nextRefresh)!
      }

      let entry = CommuteWidgetEntry(
        date: now,
        data: cachedData,
        isLoggedIn: isLoggedIn,
        isStale: cachedData.map { !SharedDataReader.isDataFresh($0) } ?? false
      )
      completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
      return
    }

    // Check auth token
    guard let token = SharedDataReader.readAuthToken() else {
      // Not logged in
      let entry = CommuteWidgetEntry(
        date: now,
        data: nil,
        isLoggedIn: false,
        isStale: false
      )
      // Check again in 1 hour
      let nextRefresh = now.addingTimeInterval(60 * 60)
      completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
      return
    }

    // Fetch fresh data from API
    fetchWidgetData(token: token) { result in
      let isCommuteHour = (6...9).contains(hour) || (17...20).contains(hour)
      let refreshInterval: TimeInterval = isCommuteHour ? 15 * 60 : 60 * 60

      switch result {
      case .success(let freshData):
        // Cache the fresh data
        SharedDataReader.writeWidgetData(freshData)

        // Generate timeline entries (4 entries for commute hours, 1 otherwise)
        var entries: [CommuteWidgetEntry] = []
        let entryCount = isCommuteHour ? 4 : 1
        for i in 0..<entryCount {
          let entryDate = now.addingTimeInterval(Double(i) * (refreshInterval / Double(entryCount)))
          entries.append(CommuteWidgetEntry(
            date: entryDate,
            data: freshData,
            isLoggedIn: true,
            isStale: false
          ))
        }

        let nextRefresh = now.addingTimeInterval(refreshInterval)
        completion(Timeline(entries: entries, policy: .after(nextRefresh)))

      case .failure:
        // Use cached data on failure
        let cachedData = SharedDataReader.readWidgetData()
        let isStale = cachedData.map { !SharedDataReader.isDataFresh($0) } ?? false

        let entry = CommuteWidgetEntry(
          date: now,
          data: cachedData,
          isLoggedIn: true,
          isStale: isStale
        )

        // Retry sooner on failure (5 minutes during commute, 15 minutes otherwise)
        let retryInterval: TimeInterval = isCommuteHour ? 5 * 60 : 15 * 60
        let nextRefresh = now.addingTimeInterval(retryInterval)
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
      }
    }
  }

  // MARK: - Network Fetch

  private func fetchWidgetData(token: String, completion: @escaping (Result<WidgetData, Error>) -> Void) {
    guard let url = URL(string: "\(apiBaseURL)/widget/data?lat=37.5665&lng=126.9780") else {
      completion(.failure(URLError(.badURL)))
      return
    }

    var request = URLRequest(url: url)
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.timeoutInterval = 15

    URLSession.shared.dataTask(with: request) { data, response, error in
      if let error = error {
        completion(.failure(error))
        return
      }

      guard let httpResponse = response as? HTTPURLResponse,
            (200...299).contains(httpResponse.statusCode),
            let data = data else {
        completion(.failure(URLError(.badServerResponse)))
        return
      }

      do {
        let decoder = JSONDecoder()
        let widgetData = try decoder.decode(WidgetData.self, from: data)
        completion(.success(widgetData))
      } catch {
        completion(.failure(error))
      }
    }.resume()
  }
}
