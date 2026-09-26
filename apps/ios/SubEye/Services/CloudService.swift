import Foundation
import SubEyeCore

@MainActor
final class CloudService {
    private let repository: SubscriptionRepository
    private let store: NSUbiquitousKeyValueStore
    private var linkedThisSession = false
    init(repository: SubscriptionRepository, store: NSUbiquitousKeyValueStore = .default) {
        self.repository = repository; self.store = store
    }
    func link() async throws {
        guard try await repository.setting("cloud.sync", as: Bool.self) == true else { linkedThisSession = false; return }
        store.synchronize()
        let snapshot = store.dictionaryRepresentation.compactMapValues { $0 as? String }.filter { CloudRecords.owns($0.key) }
        if !linkedThisSession {
            try await repository.mergeCloud(snapshot.mapValues(Optional.some))
            let union = try await repository.prepareCloudLink()
            try checkQuota(union)
            for (key, raw) in union where snapshot[key] != raw { store.set(raw, forKey: key) }
            store.synchronize(); linkedThisSession = true
        }
        try await push()
    }
    func push() async throws {
        guard try await repository.setting("cloud.sync", as: Bool.self) == true else { return }
        let writes = try await repository.pendingCloudWrites()
        var prospective = store.dictionaryRepresentation.compactMapValues { $0 as? String }.filter { CloudRecords.owns($0.key) }
        for write in writes { prospective[write.key] = write.value }
        try checkQuota(prospective)
        for write in writes {
            if let value = write.value { store.set(value, forKey: write.key) }
            else { store.removeObject(forKey: write.key) }
        }
        guard store.synchronize() else { throw URLError(.cannotConnectToHost) }
        try await repository.acknowledgeCloud(writes)
    }
    func receive(_ notification: Notification) async throws -> Bool {
        let reason = notification.userInfo?[NSUbiquitousKeyValueStoreChangeReasonKey] as? Int
        if reason == NSUbiquitousKeyValueStoreAccountChange {
            linkedThisSession = false
            try await repository.setSetting("cloud.sync", value: false)
            return true
        }
        if reason == NSUbiquitousKeyValueStoreQuotaViolationChange { throw DomainError.cloudQuota }
        guard try await repository.setting("cloud.sync", as: Bool.self) == true else { return false }
        let keys = notification.userInfo?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] ?? []
        var changed: [String: String?] = [:]
        for key in keys where CloudRecords.owns(key) { changed.updateValue(store.string(forKey: key), forKey: key) }
        try await repository.mergeCloud(changed)
        return !keys.isEmpty
    }
    func keysForErase() async throws -> [String] {
        guard try await repository.setting("cloud.sync", as: Bool.self) == true else { return [] }
        return store.dictionaryRepresentation.keys.filter(CloudRecords.owns)
    }
    private func checkQuota(_ entries: [String: String]) throws {
        guard entries.count <= 1000, entries.reduce(0, { $0 + $1.key.utf8.count + $1.value.utf8.count }) < 1_000_000 else {
            throw DomainError.cloudQuota
        }
    }
}
