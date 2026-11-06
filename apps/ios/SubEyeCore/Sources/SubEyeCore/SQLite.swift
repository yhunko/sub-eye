import CSQLite
import Foundation

public struct StoreError: Error, Sendable, CustomStringConvertible {
    public let code: Int32
    public let operation: String
    public var description: String { "SQLite \(operation) failed (\(code))" }
}

// The repository actor owns each connection. FULLMUTEX also protects closing it
// from Swift's nonisolated deinit; cross-process ownership is SQLite's job.
final class SQLiteConnection: @unchecked Sendable {
    private var handle: OpaquePointer?
    private let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

    init(url: URL) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let result = sqlite3_open_v2(url.path, &handle, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX, nil)
        guard result == SQLITE_OK else { throw StoreError(code: result, operation: "open") }
        sqlite3_busy_timeout(handle, 5_000)
        try execute("PRAGMA journal_mode=WAL")
        try execute("PRAGMA synchronous=FULL")
        try execute("PRAGMA foreign_keys=ON")
        try execute("PRAGMA secure_delete=ON")
        try transaction {
            try execute("CREATE TABLE IF NOT EXISTS records (key TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL) WITHOUT ROWID")
            try execute("CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL) WITHOUT ROWID")
            try execute("CREATE TABLE IF NOT EXISTS outbox (key TEXT PRIMARY KEY NOT NULL, payload TEXT, revision INTEGER NOT NULL) WITHOUT ROWID")
            try execute("CREATE TABLE IF NOT EXISTS legacy (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL) WITHOUT ROWID")
            try execute("INSERT OR IGNORE INTO metadata VALUES ('schema','1'),('revision','0')")
        }
        guard try scalar("SELECT value FROM metadata WHERE key='schema'") == "1" else {
            throw DomainError.unsupportedVersion(Int(try scalar("SELECT value FROM metadata WHERE key='schema'") ?? "0") ?? 0)
        }
    }

    deinit { sqlite3_close_v2(handle) }

    func execute(_ sql: String, _ values: [String?] = []) throws {
        let statement = try prepare(sql, values)
        defer { sqlite3_finalize(statement) }
        var result = sqlite3_step(statement)
        while result == SQLITE_ROW { result = sqlite3_step(statement) }
        guard result == SQLITE_DONE else { throw StoreError(code: result, operation: "write") }
    }

    func rows(_ sql: String, _ values: [String?] = []) throws -> [[String?]] {
        let statement = try prepare(sql, values)
        defer { sqlite3_finalize(statement) }
        var result: [[String?]] = []
        var status = sqlite3_step(statement)
        while status == SQLITE_ROW {
            result.append((0..<sqlite3_column_count(statement)).map { column in
                guard sqlite3_column_type(statement, column) != SQLITE_NULL,
                      let text = sqlite3_column_text(statement, column) else { return nil }
                return String(cString: text)
            })
            status = sqlite3_step(statement)
        }
        guard status == SQLITE_DONE else { throw StoreError(code: status, operation: "read") }
        return result
    }

    func scalar(_ sql: String, _ values: [String?] = []) throws -> String? {
        try rows(sql, values).first?.first ?? nil
    }

    func transaction<T>(_ body: () throws -> T) throws -> T {
        try execute("BEGIN IMMEDIATE")
        do {
            let result = try body()
            try execute("COMMIT")
            return result
        } catch {
            try? execute("ROLLBACK")
            throw error
        }
    }

    private func prepare(_ sql: String, _ values: [String?]) throws -> OpaquePointer {
        var pointer: OpaquePointer?
        let result = sqlite3_prepare_v2(handle, sql, -1, &pointer, nil)
        guard result == SQLITE_OK, let pointer else { throw StoreError(code: result, operation: "prepare") }
        for (offset, value) in values.enumerated() {
            let status = value.map { sqlite3_bind_text(pointer, Int32(offset + 1), $0, -1, transient) }
                ?? sqlite3_bind_null(pointer, Int32(offset + 1))
            guard status == SQLITE_OK else {
                sqlite3_finalize(pointer)
                throw StoreError(code: status, operation: "bind")
            }
        }
        return pointer
    }
}
