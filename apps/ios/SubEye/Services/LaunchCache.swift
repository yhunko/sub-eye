import Foundation
import SubEyeCore

enum LaunchCache {
    static let byteLimit = 384 * 1024

    static func read(at url: URL) -> Presentation? {
        guard let stream = InputStream(url: url) else { return nil }
        stream.open(); defer { stream.close() }
        var buffer = [UInt8](repeating: 0, count: byteLimit + 1)
        var count = 0
        while count <= byteLimit {
            let read = buffer.withUnsafeMutableBytes { bytes in
                stream.read(bytes.baseAddress!.assumingMemoryBound(to: UInt8.self).advanced(by: count), maxLength: byteLimit + 1 - count)
            }
            if read < 0 { return nil }; if read == 0 { break }; count += read
        }
        guard count > 0, count <= byteLimit,
              let value = try? JSONCodec.decode(Presentation.self, Data(buffer.prefix(count))), value.rows.count <= 40 else { return nil }
        return value
    }
}

actor LaunchCacheWriter {
    private let url: URL
    init(url: URL) { self.url = url }
    func write(_ presentation: Presentation) throws {
        let bytes = try JSONCodec.encode(presentation.launchPreview())
        guard bytes.count <= LaunchCache.byteLimit else { return }
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try bytes.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
    func erase() throws {
        if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
    }
}
