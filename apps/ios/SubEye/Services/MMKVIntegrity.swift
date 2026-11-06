import Foundation
import SubEyeCore

enum MMKVIntegrity {
    private static let table: [UInt32] = (0..<256).map { value in
        var crc = UInt32(value)
        for _ in 0..<8 { crc = crc & 1 == 1 ? (crc >> 1) ^ 0xedb88320 : crc >> 1 }
        return crc
    }
    static func validate(data: Data, metadata: Data) throws {
        guard data.count >= 4, metadata.count >= 32 else { throw DomainError.invalidDocument("Truncated MMKV file") }
        func uint32(_ bytes: Data, _ offset: Int) -> UInt32 {
            bytes.withUnsafeBytes { UInt32(littleEndian: $0.loadUnaligned(fromByteOffset: offset, as: UInt32.self)) }
        }
        let version = uint32(metadata, 4)
        guard version <= 4 else { throw DomainError.unsupportedVersion(Int(version)) }
        // MMKV 2.4.2's isFileValid still checks the old data header. Version 3+
        // writers update length in .crc instead (Core/MMKV_IO.cpp writeActualSize).
        let length = Int(version >= 3 ? uint32(metadata, 28) : uint32(data, 0))
        guard length <= data.count - 4 else { throw DomainError.invalidDocument("Invalid MMKV length") }
        var crc = UInt32.max
        for byte in data[4..<(4 + length)] { crc = table[Int((crc ^ UInt32(byte)) & 0xff)] ^ (crc >> 8) }
        guard crc ^ UInt32.max == uint32(metadata, 0) else { throw DomainError.invalidDocument("MMKV checksum mismatch") }
    }
}
