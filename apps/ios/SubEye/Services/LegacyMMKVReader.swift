import CryptoKit
import Foundation
import MMKV
import SubEyeCore

actor LegacyMMKVReader {
    private let source: URL
    private let staging: URL

    init(source: URL, staging: URL) { self.source = source; self.staging = staging }

    func read() async throws -> LegacySnapshot {
        let manager = FileManager.default
        guard manager.fileExists(atPath: source.path) else { return LegacySnapshot() }
        let copy = staging.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try manager.createDirectory(at: copy, withIntermediateDirectories: true)
        let ids = ["subeye.store", "mmkv.default", "subeye.fx", "subeye.logos", "subeye.logo-variants"]
        var hash = SHA256()
        var existing: [String] = []
        for id in ids where manager.fileExists(atPath: source.appendingPathComponent(id).path) {
            for suffix in ["", ".crc"] {
                let path = source.appendingPathComponent(id + suffix)
                guard manager.fileExists(atPath: path.path) else { throw DomainError.invalidDocument("Missing MMKV metadata: " + id) }
                try manager.copyItem(at: path, to: copy.appendingPathComponent(id + suffix))
                let bytes = try Data(contentsOf: copy.appendingPathComponent(id + suffix))
                hash.update(data: bytes)
            }
            existing.append(id)
        }
        await MainActor.run { _ = MMKV.initialize(rootDir: copy.path, logLevel: .none) }
        var snapshot = LegacySnapshot(fingerprint: hash.finalize().map { String(format: "%02x", $0) }.joined(), sourceExists: existing.contains("subeye.store"))
        for id in existing {
            try MMKVIntegrity.validate(data: Data(contentsOf: copy.appendingPathComponent(id)), metadata: Data(contentsOf: copy.appendingPathComponent(id + ".crc")))
            guard let store = MMKV(mmapID: id, cryptKey: nil, rootPath: copy.path, mode: .readOnly, expectedCapacity: 0) else {
                throw DomainError.invalidDocument("MMKV copy could not be opened: " + id)
            }
            defer { store.close() }
            if id == "subeye.store" {
                snapshot.pointer = store.string(forKey: "subeye.doc.active")
                snapshot.slotA = store.string(forKey: "subeye.doc.a")
                snapshot.slotB = store.string(forKey: "subeye.doc.b")
            } else {
                for key in store.allKeys() as? [String] ?? [] {
                    let prefix = id == "mmkv.default" ? "flags:" : id + ":"
                    if id == "mmkv.default", ["cloud.sync", "pro.entitled", "notifications.renewalReminders", "prompts.remindersAsked", "prompts.proPitched"].contains(key) {
                        snapshot.values[prefix + key] = store.bool(forKey: key) ? "true" : "false"
                    } else if key != "dev.forcePro", let value = store.string(forKey: key) {
                        snapshot.values[prefix + key] = value
                    }
                }
            }
        }
        // The copy is retained until explicit data deletion, alongside the
        // original files. A process kill before the SQLite commit loses neither.
        return snapshot
    }

    func eraseAfterMigration() throws {
        let manager = FileManager.default
        for url in [source, staging] where manager.fileExists(atPath: url.path) { try manager.removeItem(at: url) }
    }
}
