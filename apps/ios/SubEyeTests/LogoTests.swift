import XCTest
import UIKit
import SubEyeCore
@testable import SubEye

@MainActor
final class LogoTests: XCTestCase {
    func testLogoCacheSurvivesNewServiceInstanceWithoutNetwork() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let repository = SubscriptionRepository(url: directory.appendingPathComponent("store.sqlite"))
        let bytes = UIGraphicsImageRenderer(size: CGSize(width: 24, height: 24)).pngData { context in
            UIColor.orange.setFill(); context.fill(CGRect(x: 0, y: 0, width: 24, height: 24))
        }
        let entry = try JSONSerialization.data(withJSONObject: ["uri": "data:image/png;base64," + bytes.base64EncodedString(), "plate": true, "aspect": 1, "at": Date().timeIntervalSince1970 * 1000])
        _ = try await repository.migrate(LegacySnapshot(values: ["subeye.logos:symbol:auto:cached.example": String(decoding: entry, as: UTF8.self)]), now: Date())
        let first = LogoService(directory: directory.appendingPathComponent("logos"), repository: repository)
        let imported = await first.cached(domain: "cached.example", variant: "auto")
        XCTAssertNotNil(imported?.bytes)
        let reopened = LogoService(directory: directory.appendingPathComponent("logos"), repository: repository)
        let cached = await reopened.cached(domain: "cached.example", variant: "auto")
        XCTAssertEqual(cached?.bytes, imported?.bytes)
        let activityFile = await reopened.activityLogo(domain: "cached.example")
        XCTAssertNotNil(activityFile)
        if let activityFile { XCTAssertTrue(FileManager.default.fileExists(atPath: directory.appendingPathComponent("logos/live-activity").appendingPathComponent(activityFile).path)) }
    }

    func testRejectsNonImagesAndDownsamplesValidImagesWithAspectPreserved() throws {
        XCTAssertNil(LogoService.validated(Data("<svg/>".utf8), plate: true, fetchedAt: Date()))
        XCTAssertNil(LogoService.validated(Data(repeating: 0, count: 2_000_001), plate: true, fetchedAt: Date()))
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 1024, height: 512), format: {
            let format = UIGraphicsImageRendererFormat(); format.scale = 1; return format
        }())
        let image = renderer.image { context in UIColor.red.setFill(); context.fill(CGRect(x: 0, y: 0, width: 1024, height: 512)) }
        let payload = try XCTUnwrap(LogoService.validated(try XCTUnwrap(image.pngData()), plate: false, fetchedAt: Date()))
        let decoded = try XCTUnwrap(UIImage(data: try XCTUnwrap(payload.bytes)))
        XCTAssertEqual(payload.aspect, 2)
        XCTAssertEqual(decoded.size.width, 384)
        XCTAssertEqual(decoded.size.height, 192)
        XCTAssertFalse(payload.plate)
    }
}
