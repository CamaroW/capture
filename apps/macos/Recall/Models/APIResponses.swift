import Foundation

struct HealthResponse: Codable, Equatable, Sendable {
    let status: String
    let database: String
    let openAIConfigured: Bool

    enum CodingKeys: String, CodingKey {
        case status
        case database
        case openAIConfigured = "openai_configured"
    }
}

struct CaptureListEnvelope: Codable, Equatable, Sendable {
    let items: [Capture]
    let limit: Int
    let offset: Int
}

struct SearchResponse: Codable, Equatable, Sendable {
    let query: String
    let results: [SearchResult]
}

struct SearchResult: Codable, Equatable, Sendable {
    let capture: Capture
    let score: Double
    let keywordScore: Double
    let semanticScore: Double?

    enum CodingKeys: String, CodingKey {
        case capture
        case score
        case keywordScore = "keyword_score"
        case semanticScore = "semantic_score"
    }
}

struct ScreenshotOCRRequest: Codable, Equatable, Sendable {
    let mediaType: String
    let imageBase64: String

    enum CodingKeys: String, CodingKey {
        case mediaType = "media_type"
        case imageBase64 = "image_base64"
    }
}

enum ScreenshotOCRProvider: String, Codable, Equatable, Sendable {
    case openai
}

enum ScreenshotOCRProcessingLocation: String, Codable, Equatable, Sendable {
    case cloud
}

struct ScreenshotOCRResponse: Codable, Equatable, Sendable {
    let text: String
    let provider: ScreenshotOCRProvider
    let processingLocation: ScreenshotOCRProcessingLocation
    let model: String

    enum CodingKeys: String, CodingKey {
        case text
        case provider
        case processingLocation = "processing_location"
        case model
    }
}
