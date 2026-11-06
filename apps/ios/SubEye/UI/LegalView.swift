import SwiftUI

private struct LegalDocument: Decodable {
    var kind: String
    var title: String
    var updated: String
    var lead: [LegalBlock]
    var sections: [LegalSection]
}
// A construct this view cannot decode blanks only its own document: the terms
// must stay readable when the policy gains one, and the reverse.
private struct DecodedDocument: Decodable {
    var document: LegalDocument?
    init(from decoder: Decoder) throws { document = try? LegalDocument(from: decoder) }
}
private struct LegalSection: Decodable, Identifiable {
    var id: String
    var heading: String
    var blocks: [LegalBlock]
}
private struct LegalBlock: Decodable {
    var p: [LegalInline]?
    var ul: [[LegalInline]]?
    var dl: [LegalDefinition]?
}
private struct LegalDefinition: Decodable {
    var term: String
    var desc: [LegalInline]
}
private enum LegalInline: Decodable {
    case text(String), bold(String), code(String, bold: Bool), email(String), link(String, String)
    // Apart from the dictionary below because its `b` is a Bool flag, not text.
    private struct Code: Decodable { var code: String; var b: Bool? }
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let text = try? container.decode(String.self) { self = .text(text); return }
        if let run = try? container.decode(Code.self) { self = .code(run.code, bold: run.b ?? false); return }
        let object = try container.decode([String: String].self)
        if let bold = object["b"] { self = .bold(bold) }
        else if let email = object["mailto"] { self = .email(email) }
        else if let document = object["doc"] { self = .link(object["text"] ?? document, AppConfiguration.url("legal/" + document).absoluteString) }
        else if let url = object["href"] { self = .link(object["text"] ?? object["label"] ?? url, url) }
        else { throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unknown legal inline") }
    }
}

struct LegalView: View {
    let kind: String
    @State private var document: LegalDocument?
    @State private var failed = false
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                if let document {
                    Text(document.title).font(.largeTitle.bold())
                    Text(document.updated).font(.caption).foregroundStyle(.secondary)
                    blocks(document.lead)
                    ForEach(document.sections) { section in
                        Text(section.heading).font(.title2.bold()).accessibilityAddTraits(.isHeader)
                        blocks(section.blocks)
                    }
                } else if failed { Text(L("common_loadFailed")) }
                else { ProgressView() }
            }.frame(maxWidth: 680, alignment: .leading).padding(20).textSelection(.enabled)
        }.navigationTitle(document?.title ?? "").navigationBarTitleDisplayMode(.inline)
            .task {
                let language = Bundle.main.preferredLocalizations.first == "uk" ? "uk" : "en"
                guard let url = Bundle.main.url(forResource: "legal-" + language, withExtension: "json"),
                      let data = try? Data(contentsOf: url), let documents = try? JSONDecoder().decode([DecodedDocument].self, from: data),
                      let found = documents.lazy.compactMap(\.document).first(where: { $0.kind == kind }) else { failed = true; return }
                document = found
            }
    }
    @ViewBuilder private func blocks(_ blocks: [LegalBlock]) -> some View {
        ForEach(Array(blocks.enumerated()), id: \.offset) { _, block in
            if let paragraph = block.p { Text(attributed(paragraph)).fixedSize(horizontal: false, vertical: true) }
            if let items = block.ul {
                ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                    HStack(alignment: .top) { Text("•").accessibilityHidden(true); Text(attributed(item)).fixedSize(horizontal: false, vertical: true) }
                }
            }
            if let entries = block.dl {
                ForEach(Array(entries.enumerated()), id: \.offset) { _, entry in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(entry.term).font(.headline)
                        Text(attributed(entry.desc)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }
    private func attributed(_ inlines: [LegalInline]) -> AttributedString {
        inlines.reduce(into: AttributedString()) { result, inline in
            switch inline {
            case .text(let text): result += AttributedString(text)
            case .bold(let text): var value = AttributedString(text); value.font = .body.bold(); result += value
            case .code(let text, let bold): var value = AttributedString(text); value.font = bold ? .body.monospaced().bold() : .body.monospaced(); result += value
            case .email(let address): var value = AttributedString(address); value.link = URL(string: "mailto:" + address); result += value
            case .link(let title, let address): var value = AttributedString(title); value.link = URL(string: address); result += value
            }
        }
    }
}
