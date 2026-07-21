import Foundation

struct HealthResponse: Codable, Equatable, Sendable {
    let status: String
    let database: String
    let attachments: String
    let openAIConfigured: Bool

    enum CodingKeys: String, CodingKey {
        case status
        case database
        case attachments
        case openAIConfigured = "openai_configured"
    }

    init(
        status: String,
        database: String,
        attachments: String = "ok",
        openAIConfigured: Bool
    ) {
        self.status = status
        self.database = database
        self.attachments = attachments
        self.openAIConfigured = openAIConfigured
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        status = try container.decode(String.self, forKey: .status)
        database = try container.decode(String.self, forKey: .database)
        attachments = try container.decodeIfPresent(
            String.self,
            forKey: .attachments
        ) ?? "ok"
        openAIConfigured = try container.decode(
            Bool.self,
            forKey: .openAIConfigured
        )
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(status, forKey: .status)
        try container.encode(database, forKey: .database)
        try container.encode(attachments, forKey: .attachments)
        try container.encode(openAIConfigured, forKey: .openAIConfigured)
    }
}

struct ImageCaptureCreateMetadata: Codable, Equatable, Sendable {
    let clientCaptureID: String
    let sourceApp: String?
    let userNote: String?
    let capturedAt: String
    let analyzeImage: Bool

    enum CodingKeys: String, CodingKey {
        case clientCaptureID = "client_capture_id"
        case sourceApp = "source_app"
        case userNote = "user_note"
        case capturedAt = "captured_at"
        case analyzeImage = "analyze_image"
    }
}

struct ImageCaptureUploadRequest: Equatable, Sendable {
    let metadata: ImageCaptureCreateMetadata
    let imageData: Data
    let mediaType: String
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
