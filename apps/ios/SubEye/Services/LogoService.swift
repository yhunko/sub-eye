import CryptoKit
import Foundation
import ImageIO
import UniformTypeIdentifiers
import SubEyeCore

struct LogoPayload: Codable, Sendable {
    var bytes: Data?
    var plate: Bool
    var aspect: Double
    var fetchedAt: Date
}

actor LogoService {
    static let variantChanged = Notification.Name("SubEye.logoVariantChanged")
    private let directory: URL
    private let repository: SubscriptionRepository
    private var memory: [String: LogoPayload] = [:]
    private var attempts: [String: Date] = [:]
    private var pending: [String: Task<LogoPayload?, Never>] = [:]
    init(directory: URL, repository: SubscriptionRepository) { self.directory = directory; self.repository = repository }

    func variant(for domain: String) async -> String? {
        if let value = try? await repository.setting("logo.variant." + domain, as: String.self) { return value }
        let raw = try? await repository.legacyValues(prefix: "subeye.logo-variants:" + domain)
        return raw?["subeye.logo-variants:" + domain]
    }

    func setVariant(_ variant: String, for domain: String) async throws {
        try await repository.setSetting("logo.variant." + domain, value: variant)
        await MainActor.run { NotificationCenter.default.post(name: Self.variantChanged, object: domain) }
    }

    func cached(domain: String, variant: String?) async -> LogoPayload? {
        let key = "symbol:\(variant ?? "auto"):\(domain)"
        return await cached(key: key)
    }

    private func cached(key: String) async -> LogoPayload? {
        if let cached = memory[key] { return cached }
        if let bytes = try? Data(contentsOf: path(key)), let cached = try? JSONCodec.decode(LogoPayload.self, bytes) {
            remember(cached, key: key); return cached
        }
        let legacy = try? await repository.legacyValues(prefix: "subeye.logos:" + key)
        if let raw = legacy?["subeye.logos:" + key],
           let entry = try? JSONSerialization.jsonObject(with: Data(raw.utf8)) as? [String: Any],
           let uri = entry["uri"] as? String, uri.hasPrefix("data:image/"), let comma = uri.firstIndex(of: ","),
           let bytes = Data(base64Encoded: String(uri[uri.index(after: comma)...])),
           let result = Self.validated(bytes, plate: entry["plate"] as? Bool ?? true,
                                       fetchedAt: Date(timeIntervalSince1970: (entry["at"] as? Double ?? 0) / 1000)) {
            try? store(result, key: key); return result
        }
        return nil
    }

    func load(domain: String, variant: String? = nil) async -> LogoPayload? {
        let key = "symbol:\(variant ?? "auto"):\(domain)"
        return await load(domain: domain, variant: variant, key: key, preview: false)
    }

    func preview(domain: String, variant: String) async -> LogoPayload? {
        await load(domain: domain, variant: variant, key: "preview:\(variant):\(domain)", preview: true)
    }

    private func load(domain: String, variant: String?, key: String, preview: Bool) async -> LogoPayload? {
        let cached = await cached(key: key)
        guard !NativeTesting.enabled else { return cached }
        let lifetime: TimeInterval = cached?.bytes == nil ? 21_600 : 604_800
        if let cached, Date().timeIntervalSince(cached.fetchedAt) < lifetime { return cached }
        if let task = pending[key] { return await task.value }
        if let attempted = attempts[key], Date().timeIntervalSince(attempted) < 60 { return cached }
        attempts[key] = Date()
        let task = Task { await self.fetch(domain: domain, variant: variant, key: key, preview: preview) }
        pending[key] = task
        let value = await task.value
        pending[key] = nil
        return value ?? cached
    }

    func cancelPending() {
        for task in pending.values { task.cancel() }
        pending.removeAll()
    }

    func activityLogo(domain: String) async -> String? {
        guard let payload = await cached(domain: domain, variant: variant(for: domain)), let bytes = payload.bytes else { return nil }
        let filename = SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined() + ".png"
        let folder = directory.appendingPathComponent("live-activity")
        do {
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            let url = folder.appendingPathComponent(filename)
            if !FileManager.default.fileExists(atPath: url.path) { try bytes.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication]) }
            return filename
        } catch { return nil }
    }

    func retainActivityLogos(_ filenames: Set<String>) {
        let folder = directory.appendingPathComponent("live-activity")
        for file in (try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)) ?? [] where !filenames.contains(file.lastPathComponent) {
            try? FileManager.default.removeItem(at: file)
        }
    }

    func erase() throws {
        cancelPending(); memory.removeAll(); attempts.removeAll()
        if FileManager.default.fileExists(atPath: directory.path) { try FileManager.default.removeItem(at: directory) }
    }

    private func fetch(domain: String, variant: String?, key: String, preview: Bool) async -> LogoPayload? {
        guard let normalized = BrandService.normalizeDomain(domain), normalized == domain else { return nil }
        let client = Bundle.main.object(forInfoDictionaryKey: "BrandfetchClientID") as? String ?? ""
        var sources: [(String, Bool)] = []
        if !client.isEmpty, !client.hasPrefix("$(") {
            let selected = variant == "symbol" ? ["symbol/theme/light", "symbol"] : variant == "logo" ? ["logo/theme/light", "logo"] : ["icon"]
            var seen = Set<String>()
            // A preview must never silently substitute another style's image.
            for tier in selected + (preview ? [] : ["icon", "symbol/theme/light", "symbol"]) where seen.insert(tier).inserted {
                sources.append(("https://cdn.brandfetch.io/\(domain)/\(tier)/fallback/404/h/384/w/384?c=\(client)", tier == "icon"))
            }
        }
        if !preview { sources.append(("https://www.google.com/s2/favicons?domain=\(domain)&sz=256", true)) }
        var answered = true
        for (source, plate) in sources {
            if Task.isCancelled { return nil }
            guard let url = URL(string: source) else { continue }
            do {
                var request = URLRequest(url: url); request.timeoutInterval = 8
                let (bytes, response) = try await URLSession.shared.data(for: request)
                guard let http = response as? HTTPURLResponse, http.statusCode == 200,
                      response.mimeType?.hasPrefix("image/") == true,
                      let result = Self.validated(bytes, plate: plate, fetchedAt: Date()) else { continue }
                guard !Task.isCancelled else { return nil }
                try store(result, key: key)
                if preview { try store(result, key: "symbol:\(variant ?? "auto"):\(domain)") }
                return result
            } catch { answered = false }
        }
        if answered {
            let miss = LogoPayload(bytes: nil, plate: false, aspect: 1, fetchedAt: Date())
            try? store(miss, key: key); return miss
        }
        return nil
    }

    nonisolated static func validated(_ bytes: Data, plate: Bool, fetchedAt: Date) -> LogoPayload? {
        guard bytes.count < 2_000_000,
              let source = CGImageSourceCreateWithData(bytes as CFData, [kCGImageSourceShouldCache: false] as CFDictionary),
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = properties[kCGImagePropertyPixelWidth] as? Double,
              let height = properties[kCGImagePropertyPixelHeight] as? Double,
              width > 0, height > 0, width * height <= 16_000_000,
              let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceThumbnailMaxPixelSize: 384,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceShouldCacheImmediately: true
              ] as CFDictionary) else { return nil }
        let output = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(output, UTType.png.identifier as CFString, 1, nil) else { return nil }
        CGImageDestinationAddImage(destination, thumbnail, nil)
        guard CGImageDestinationFinalize(destination) else { return nil }
        return LogoPayload(bytes: output as Data, plate: plate, aspect: width / height, fetchedAt: fetchedAt)
    }

    private func path(_ key: String) -> URL {
        directory.appendingPathComponent(SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined()).appendingPathExtension("json")
    }
    private func remember(_ value: LogoPayload, key: String) {
        if memory.count >= 100 { memory.removeAll(keepingCapacity: true) }
        memory[key] = value
    }
    private func store(_ value: LogoPayload, key: String) throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let files = try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.contentModificationDateKey]).filter { $0.pathExtension == "json" }
        if files.count >= 500, !FileManager.default.fileExists(atPath: path(key).path),
           let oldest = files.min(by: { ((try? $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast) < ((try? $1.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast) }) {
            try FileManager.default.removeItem(at: oldest)
        }
        try JSONCodec.encode(value).write(to: path(key), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        remember(value, key: key)
    }
}

struct Brand: Codable, Identifiable, Hashable, Sendable {
    var id: String { domain }
    var name: String
    var domain: String
}

actor BrandService {
    private var cache: [String: (Date, [Brand])] = [:]
    static let popular: [Brand] = [
        Brand(name: "Netflix", domain: "netflix.com"), Brand(name: "Spotify", domain: "spotify.com"),
        Brand(name: "YouTube", domain: "youtube.com"), Brand(name: "iCloud", domain: "icloud.com"),
        Brand(name: "Apple Music", domain: "music.apple.com"), Brand(name: "Amazon Prime", domain: "amazon.com"),
        Brand(name: "Disney+", domain: "disneyplus.com"), Brand(name: "HBO Max", domain: "max.com"),
        Brand(name: "Google One", domain: "one.google.com"), Brand(name: "Microsoft 365", domain: "microsoft.com"),
        Brand(name: "Adobe", domain: "adobe.com"), Brand(name: "ChatGPT", domain: "openai.com"),
        Brand(name: "Claude", domain: "claude.ai"), Brand(name: "GitHub", domain: "github.com"),
        Brand(name: "Dropbox", domain: "dropbox.com"), Brand(name: "Notion", domain: "notion.so"),
        Brand(name: "Figma", domain: "figma.com"), Brand(name: "Telegram", domain: "telegram.org"),
        Brand(name: "PlayStation Plus", domain: "playstation.com"), Brand(name: "Xbox Game Pass", domain: "xbox.com")
    ]
    nonisolated static func normalizeDomain(_ value: String) -> String? {
        let cleaned = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard let url = URL(string: cleaned.contains("://") ? cleaned : "https://" + cleaned),
              var host = url.host else { return nil }
        if host.hasPrefix("www.") { host = String(host.dropFirst(4)) }
        guard host.contains("."), !host.hasPrefix("."), !host.hasSuffix("."),
              host.range(of: #"^[a-z0-9.-]+$"#, options: .regularExpression) != nil else { return nil }
        return host
    }
    func search(_ query: String) async throws -> [Brand] {
        if query.count < 2 { return Self.popular }
        if let cached = cache[query], Date().timeIntervalSince(cached.0) < 300 { return cached.1 }
        var parts = URLComponents(string: "https://api.brandfetch.io")!
        parts.path = "/v2/search/" + query
        if let client = Bundle.main.object(forInfoDictionaryKey: "BrandfetchClientID") as? String, !client.isEmpty, !client.hasPrefix("$(") {
            parts.queryItems = [URLQueryItem(name: "c", value: client)]
        }
        var request = URLRequest(url: parts.url!); request.timeoutInterval = 8
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
        let brands = try JSONCodec.decode([Brand].self, data).filter { Self.normalizeDomain($0.domain) != nil }
        if cache.count > 50 { cache.removeAll() }
        cache[query] = (Date(), brands)
        return brands
    }
}
