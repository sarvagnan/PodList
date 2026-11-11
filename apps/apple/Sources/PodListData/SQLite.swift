import Foundation
import SQLite3

public enum SQLValue: Equatable, Sendable {
    case null, integer(Int64), real(Double), text(String), blob(Data)
    public var string: String? { if case let .text(value) = self { value } else { nil } }
    public var int: Int64? { if case let .integer(value) = self { value } else { nil } }
    public var double: Double? {
        switch self { case let .real(value): value; case let .integer(value): Double(value); default: nil }
    }
}
public typealias Row = [String: SQLValue]
public typealias StateRows = [String: [Row]]

public struct DatabaseFailure: Error, Sendable, CustomStringConvertible {
    public let description: String
}

/// Owned exclusively by LocalDatabase's actor. Never escapes its isolation boundary.
final class SQLite {
    private var connection: OpaquePointer?
    private var depth = 0

    init(path: String) throws {
        let status = sqlite3_open_v2(path, &connection, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX, nil)
        guard status == SQLITE_OK else {
            let error = failure()
            sqlite3_close(connection)
            connection = nil
            throw error
        }
        sqlite3_busy_timeout(connection, 2_000)
    }
    deinit { sqlite3_close(connection) }
    private func failure() -> DatabaseFailure {
        DatabaseFailure(description: connection.map { String(cString: sqlite3_errmsg($0)) } ?? "SQLite is closed")
    }
    func query(_ sql: String, _ params: [SQLValue] = []) throws -> [Row] {
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(connection, sql, -1, &statement, nil) == SQLITE_OK, let statement else { throw failure() }
        defer { sqlite3_finalize(statement) }
        guard sqlite3_bind_parameter_count(statement) == params.count else { throw DatabaseFailure(description: "SQLite parameter count mismatch") }
        for (index, value) in params.enumerated() {
            let i = Int32(index + 1)
            let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
            let status: Int32
            switch value {
            case .null: status = sqlite3_bind_null(statement, i)
            case let .integer(n): status = sqlite3_bind_int64(statement, i, n)
            case let .real(n): status = sqlite3_bind_double(statement, i, n)
            case let .text(text): status = text.withCString { sqlite3_bind_text(statement, i, $0, Int32(text.utf8.count), transient) }
            case let .blob(data): status = data.withUnsafeBytes { sqlite3_bind_blob(statement, i, $0.baseAddress, Int32(data.count), transient) }
            }
            guard status == SQLITE_OK else { throw failure() }
        }
        var rows: [Row] = []
        while true {
            let status = sqlite3_step(statement)
            if status == SQLITE_DONE { return rows }
            guard status == SQLITE_ROW else { throw failure() }
            var row: Row = [:]
            for i in 0..<sqlite3_column_count(statement) {
                let name = String(cString: sqlite3_column_name(statement, i))
                switch sqlite3_column_type(statement, i) {
                case SQLITE_INTEGER: row[name] = .integer(sqlite3_column_int64(statement, i))
                case SQLITE_FLOAT: row[name] = .real(sqlite3_column_double(statement, i))
                case SQLITE_TEXT:
                    let count = Int(sqlite3_column_bytes(statement, i))
                    row[name] = .text(String(decoding: UnsafeBufferPointer(start: sqlite3_column_text(statement, i), count: count), as: UTF8.self))
                case SQLITE_BLOB:
                    row[name] = .blob(Data(bytes: sqlite3_column_blob(statement, i), count: Int(sqlite3_column_bytes(statement, i))))
                default: row[name] = .null
                }
            }
            rows.append(row)
        }
    }
    func execute(_ sql: String, _ params: [SQLValue] = []) throws { _ = try query(sql, params) }
    func transaction<T>(_ body: () throws -> T) throws -> T {
        let outer = depth == 0
        let savepoint = "apple_nested_\(depth)"
        try execute(outer ? "BEGIN IMMEDIATE" : "SAVEPOINT \(savepoint)")
        depth += 1
        defer { depth -= 1 }
        do {
            let result = try body()
            try execute(outer ? "COMMIT" : "RELEASE SAVEPOINT \(savepoint)")
            return result
        } catch {
            if outer { try? execute("ROLLBACK") }
            else { try? execute("ROLLBACK TO SAVEPOINT \(savepoint)"); try? execute("RELEASE SAVEPOINT \(savepoint)") }
            throw error
        }
    }
    func insert(_ table: String, _ row: Row, upsert: Bool = false) throws {
        let columns = row.keys.sorted()
        var sql = "INSERT INTO \(table) (\(columns.joined(separator: ", "))) VALUES (\(columns.map { _ in "?" }.joined(separator: ", ")))"
        if upsert { sql += " ON CONFLICT (id) DO UPDATE SET " + columns.filter { $0 != "id" }.map { "\($0) = excluded.\($0)" }.joined(separator: ", ") }
        try execute(sql, columns.map { row[$0]! })
    }
}

extension SQLValue {
    static func optional(_ value: String?) -> SQLValue { value.map(Self.text) ?? .null }
    static func optional(_ value: Int64?) -> SQLValue { value.map(Self.integer) ?? .null }
    static func optional(_ value: Double?) -> SQLValue { value.map(Self.real) ?? .null }
}
