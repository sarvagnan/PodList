import Foundation

/// Fixed Unicode 17 folding keeps Mentions independent of the platform's Unicode version.
public enum Mentions {
    private static let mappings: [UInt32: String] = Dictionary(uniqueKeysWithValues: mentionsFoldData.flatMap { $0.split(separator: ";", omittingEmptySubsequences: false) }.map { row in
        let parts = row.split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false)
        let value = String(String.UnicodeScalarView(parts[1].split(separator: ",").map { Unicode.Scalar(UInt32($0, radix: 16)!)! }))
        return (UInt32(parts[0], radix: 16)!, value)
    })
    public static func fold(_ text: String) -> String {
        var result = ""
        for scalar in text.unicodeScalars {
            let cp = scalar.value
            if (0xac00...0xd7a3).contains(cp) {
                let syllable = cp - 0xac00
                result.unicodeScalars.append(Unicode.Scalar(0x1100 + syllable / 588)!)
                result.unicodeScalars.append(Unicode.Scalar(0x1161 + (syllable % 588) / 28)!)
                if syllable % 28 != 0 { result.unicodeScalars.append(Unicode.Scalar(0x11a7 + syllable % 28)!) }
            } else { result += mappings[cp] ?? String(scalar) }
        }
        return result
    }

    /// ECMAScript whitespace (including BOM), as defined by the shared View contract.
    public static func words(_ text: String) -> [String] {
        let whitespace = CharacterSet(charactersIn: "\u{0009}\u{000a}\u{000b}\u{000c}\u{000d}\u{0020}\u{00a0}\u{1680}\u{2000}\u{2001}\u{2002}\u{2003}\u{2004}\u{2005}\u{2006}\u{2007}\u{2008}\u{2009}\u{200a}\u{2028}\u{2029}\u{202f}\u{205f}\u{3000}\u{feff}")
        return text.components(separatedBy: whitespace).filter { !$0.isEmpty }.map(fold)
    }
}
