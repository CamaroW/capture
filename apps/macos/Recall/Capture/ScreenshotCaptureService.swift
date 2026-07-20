@preconcurrency import AppKit
import CoreGraphics
import Foundation

struct ScreenshotSnapshot: Equatable, Sendable {
    let imageData: Data
    let mediaType: String
    let sourceApplication: String?
}

enum ScreenshotCaptureError: Error, LocalizedError, Equatable {
    case cancelled
    case permissionDenied
    case unavailable
    case emptyImage

    var errorDescription: String? {
        switch self {
        case .cancelled:
            return "Screenshot selection was cancelled."
        case .permissionDenied:
            return "Recall needs Screen Recording permission. Open System Settings > Privacy & Security > Screen & System Audio Recording, enable Recall, then relaunch the app."
        case .unavailable:
            return "Recall could not start macOS screenshot selection."
        case .emptyImage:
            return "The selected screenshot was empty. Try selecting the region again."
        }
    }
}

protocol ScreenCapturePermissionServing {
    func isAuthorized() -> Bool
    func requestAccess() -> Bool
}

struct SystemScreenCapturePermissionService: ScreenCapturePermissionServing {
    func isAuthorized() -> Bool {
        CGPreflightScreenCaptureAccess()
    }

    func requestAccess() -> Bool {
        CGRequestScreenCaptureAccess()
    }
}

@MainActor
protocol ScreenshotCaptureServing {
    func captureInteractive() throws -> ScreenshotSnapshot
}

@MainActor
struct SystemScreenshotCaptureService: ScreenshotCaptureServing {
    private let permissionService: any ScreenCapturePermissionServing

    init(
        permissionService: any ScreenCapturePermissionServing =
            SystemScreenCapturePermissionService()
    ) {
        self.permissionService = permissionService
    }

    func captureInteractive() throws -> ScreenshotSnapshot {
        let frontmostApplication = NSWorkspace.shared.frontmostApplication
        guard permissionService.isAuthorized() || permissionService.requestAccess() else {
            throw ScreenshotCaptureError.permissionDenied
        }

        let sourceApplication = frontmostApplication?.bundleIdentifier == Bundle.main.bundleIdentifier
            ? nil
            : frontmostApplication?.localizedName
        let outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("recall-screenshot-\(UUID().uuidString.lowercased())")
            .appendingPathExtension("png")
        defer { try? FileManager.default.removeItem(at: outputURL) }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
        process.arguments = ["-i", "-x", "-t", "png", outputURL.path]

        do {
            try process.run()
            process.waitUntilExit()
        } catch {
            throw ScreenshotCaptureError.unavailable
        }

        guard process.terminationStatus == 0 else {
            throw ScreenshotCaptureError.cancelled
        }
        guard let data = try? Data(contentsOf: outputURL), !data.isEmpty else {
            throw ScreenshotCaptureError.emptyImage
        }
        return ScreenshotSnapshot(
            imageData: data,
            mediaType: "image/png",
            sourceApplication: sourceApplication?.nonEmptyTrimmed ?? "Screenshot"
        )
    }
}
