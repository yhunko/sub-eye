import Foundation
import Vision
import SubEyeCore
#if canImport(FoundationModels)
import FoundationModels
#endif

actor ScreenshotReader {
    private lazy var currencies: Set<String> = {
        guard let url = Bundle.main.url(forResource: "currencies", withExtension: "json"), let bytes = try? Data(contentsOf: url) else { return [] }
        return Set((try? JSONCodec.decode([String].self, bytes)) ?? [])
    }()

    func drafts(_ images: [Data], now: Date, zone: TimeZone, region: String?) async throws -> [ImportDraft] {
        var batches: [[ImportDraft]] = []
        for image in images {
            try Task.checkCancellation()
            let lines = try Self.lines(image)
            var drafts = ScreenshotImport.drafts(lines, now: now, zone: zone, currencies: currencies, region: region)
            // The rules read Apple's list better than the on-device model (measured on real EN and UK screens), so the model
            // only gets a layout the rules found no rows in at all.
            #if canImport(FoundationModels)
            if drafts.isEmpty, #available(iOS 26, *), case .available = SystemLanguageModel.default.availability, let rows = try? await Self.rows(lines) {
                drafts = ScreenshotImport.structured(rows, lines: lines, now: now, zone: zone, currencies: currencies, region: region)
            }
            #endif
            batches.append(drafts)
        }
        return ScreenshotImport.merge(batches)
    }

    static func lines(_ image: Data) throws -> [ScreenshotLine] {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        let supported = (try? request.supportedRecognitionLanguages()) ?? []
        let order = Bundle.main.preferredLocalizations.first == "uk" ? ["uk-UA", "en-US"] : ["en-US", "uk-UA"]
        request.recognitionLanguages = order.filter(supported.contains)
        try VNImageRequestHandler(data: image).perform([request])
        return (request.results ?? []).compactMap { observation in
            guard let text = observation.topCandidates(1).first?.string else { return nil }
            let box = observation.boundingBox
            return ScreenshotLine(text: text, x: box.minX, y: 1 - box.maxY, width: box.width, height: box.height)
        }
    }

    #if canImport(FoundationModels)
    @available(iOS 26, *)
    private static func rows(_ lines: [ScreenshotLine]) async throws -> [ScreenshotRow] {
        let session = LanguageModelSession(instructions: """
            The text was recognized from a screenshot of the iPhone's list of App Store subscriptions, one recognized line per \
            line, top to bottom. Group it into subscriptions. Copy every value exactly as it appears in the text: never \
            translate, convert, compute or invent a value. Skip headings, the clock, buttons and explanations.
            """)
        let text = lines.sorted { ($0.y, $0.x) < ($1.y, $1.x) }.map(\.text).joined(separator: "\n")
        let listing = try await session.respond(to: text, generating: ScreenshotListing.self).content
        return listing.subscriptions.map { ScreenshotRow(name: $0.name, price: $0.price.isEmpty ? nil : $0.price, renewal: $0.status) }
    }
    #endif
}

#if canImport(FoundationModels)
@available(iOS 26, *)
@Generable
private struct ScreenshotListing {
    @Guide(description: "Every subscription on the screen, top to bottom")
    var subscriptions: [Entry]

    @Generable
    struct Entry {
        @Guide(description: "The app or service name, exactly as written")
        var name: String
        @Guide(description: "The price with its currency and period, exactly as written, or empty when the row shows no price")
        var price: String
        @Guide(description: "The renewal or expiry line with its date, exactly as written")
        var status: String
    }
}
#endif
