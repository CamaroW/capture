// Layer 3 integration placeholder only — this file is not part of an Xcode target.
// TODO(Developer A): adapt these DTOs and `loadCaptures()` to the macOS app's
// existing networking and observable-state conventions, then remove this holder.

import Foundation

struct CaptureListEnvelope: Decodable {
    let items: [CaptureDTO]
    let limit: Int
    let offset: Int
}

struct CaptureDTO: Decodable, Identifiable {
    let id: String
    let clientCaptureId: String?
    let createdAt: String
    let updatedAt: String
    let capturedAt: String
    let status: String
    let sourceType: String
    let sourceApp: String?
    let sourceTitle: String?
    let sourceUrl: String?
    let selectedText: String
    let surroundingContext: String?
    let contextTruncated: Bool
    let userNote: String?
    let aiTitle: String?
    let aiSummary: String?
    let problem: String?
    let keyInsight: String?
    let whySaved: String?
    let caveats: [String]
    let tags: [String]
    let entities: [String]
    let searchAliases: [String]
    let errorMessage: String?
    let enrichmentVersion: Int
}

func loadCaptures(
    session: URLSession = .shared,
    baseURL: URL = URL(string: "http://127.0.0.1:8765")!
) async throws -> [CaptureDTO] {
    let url = baseURL.appending(path: "v1/captures")
        .appending(queryItems: [
            URLQueryItem(name: "limit", value: "50"),
            URLQueryItem(name: "offset", value: "0"),
        ])
    let (data, response) = try await session.data(from: url)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw URLError(.badServerResponse)
    }

    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    return try decoder.decode(CaptureListEnvelope.self, from: data).items
}

// Example view-model hook:
// Task {
//     captures = try await loadCaptures()
//     // Keep source/user-note fields separate. Poll processing records until
//     // Layer 4 returns either `ready` or `error`.
// }
