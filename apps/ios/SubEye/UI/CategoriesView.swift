import SwiftUI
import SubEyeCore

struct CategoriesView: View {
    @Binding var state: SceneState
    let services: AppServices
    @Binding var sheet: SheetRoute?
    @State private var deleting: SubEyeCore.Category?
    @State private var search = ""
    var body: some View {
        List {
            if state.presentation.categories.isEmpty {
                VStack(alignment: .leading, spacing: 8) { Text(L("category_empty")).font(.headline); Text(L("category_listHint")).foregroundStyle(.secondary) }
            }
            ForEach(state.presentation.categories.filter { search.isEmpty || $0.name.localizedStandardContains(search) }) { category in
                Button { sheet = state.settings.pro ? .category(category) : .paywall } label: {
                    HStack(spacing: 12) { Text(category.emoji).appFont(24); Text(category.name).appFont(16).foregroundStyle(AppTheme.text); Spacer(); Text(String(state.presentation.rows.filter { $0.category?.id == category.id }.count)).appFont(14).foregroundStyle(AppTheme.muted); Image(systemName: "chevron.right").appFont(13).foregroundStyle(AppTheme.muted) }.padding(16).appCard(radius: 18)
                }.buttonStyle(.plain).listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16)).listRowBackground(Color.clear).listRowSeparator(.hidden)
                    .swipeActions { if state.settings.pro { Button(L("native_delete"), role: .destructive) { deleting = category } } }
            }
        }.listStyle(.plain).scrollContentBackground(.hidden).appScreen().navigationTitle(L("settings_categories"))
            .searchable(text: $search, prompt: L("native_categorySearch"))
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button { sheet = state.settings.pro ? .category(nil) : .paywall } label: { Image(systemName: "plus") }.accessibilityLabel(L("settings_categories")) } }
            .sheet(item: $deleting) { category in
                ConfirmAction(title: L("native_deleteCategory"), message: L("native_deleteCategoryBody"), destructive: true) {
                    try await services.repository.deleteCategory(id: category.id, now: Date()); state.reload += 1
                }
        }
    }
}

struct CategoryPicker: View {
    @Binding var selection: String?
    @Binding var state: SceneState
    let services: AppServices
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var creating = false
    @State private var created = false
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                choice(nil)
                ForEach(state.presentation.categories.filter { query.isEmpty || $0.name.localizedStandardContains(query) }) { category in choice(category) }
            }.padding(16)
        }.scrollDismissesKeyboard(.interactively).appScreen().navigationTitle(L("form_category"))
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: L("native_categorySearch"))
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button { creating = true } label: { Label(L("native_categoryCreate"), systemImage: "plus") }.accessibilityIdentifier("createCategory") } }
            .sheet(isPresented: $creating, onDismiss: { if created { dismiss() } }) {
                CategoryEditor(original: nil, state: $state, services: services) { category in
                    if !state.presentation.categories.contains(where: { $0.id == category.id }) { state.presentation.categories.append(category) }
                    selection = category.id; created = true
                }
            }
    }
    private func choice(_ category: SubEyeCore.Category?) -> some View {
        Button { selection = category?.id; dismiss() } label: {
            HStack(spacing: 12) {
                Text(category?.emoji ?? "—").font(.system(size: 24)).frame(width: 30).accessibilityHidden(true)
                Text(category?.name ?? L("form_categoryNone")).appFont(16).frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: selection == category?.id ? "checkmark.circle.fill" : "circle").appFont(21).foregroundStyle(selection == category?.id ? AppTheme.accentBright : AppTheme.border)
            }.padding(16).frame(minHeight: 56).appCard(radius: 18, fill: selection == category?.id ? AppTheme.accent.opacity(0.14) : AppTheme.surface)
        }.buttonStyle(.plain).accessibilityIdentifier("category-" + (category?.id ?? "none")).accessibilityAddTraits(selection == category?.id ? .isSelected : [])
    }
}

struct CategoryEditor: View {
    let original: SubEyeCore.Category?
    @Binding var state: SceneState
    let services: AppServices
    var onSave: ((SubEyeCore.Category) -> Void)? = nil
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var emoji: String
    @State private var pickedEmoji: Bool
    @Environment(\.dynamicTypeSize) private var typeSize
    private static let emojiGroups: [(String, [String])] = [
        ("⭐", ["🎮", "📦", "🔒", "📚", "🔔", "💬", "🌐", "⚡", "🗓️", "🤖", "🎁", "🛍️"]),
        ("🎭", ["🎬", "📺", "🎵", "🎶", "🎸", "🎹", "🎤", "🎧", "🕹️", "📻", "🎭", "🎨"]),
        ("💻", ["💻", "📱", "🖥️", "⌨️", "🖱️", "📡", "☁️", "🔌", "📷", "🔋", "💾", "🖨️"]),
        ("💰", ["💳", "💰", "💵", "🏦", "📈", "📊", "💹", "🪙", "💸", "🏧", "📉", "💱"]),
        ("💪", ["🏋️", "🧘", "🚴", "🏊", "❤️", "💊", "🏥", "🦷", "🧴", "🥗", "🏃", "🤸"]),
        ("🍕", ["☕", "🍵", "🧃", "🍕", "🍔", "🥡", "🍱", "🧁", "🍷", "🥤", "🧋", "🍣"]),
        ("✈️", ["✈️", "🚗", "🚕", "🚌", "🚂", "🚢", "🏨", "🗺️", "🌍", "🏕️", "🛳️", "🚁"]),
        ("🏠", ["🏠", "🛋️", "🛏️", "🪴", "🔑", "💡", "🧹", "🔧", "🛒", "🧺", "🪣", "🔨"]),
        ("📚", ["💼", "📋", "📝", "✏️", "🗃️", "🗂️", "📌", "📧", "📰", "🖊️", "🎓", "🔬"]),
        ("😀", ["😀", "😎", "🤩", "🥳", "🤓", "😍", "🤗", "🙂", "😊", "🎯", "⭐", "🔥"])
    ]
    init(original: SubEyeCore.Category?, state: Binding<SceneState>, services: AppServices, onSave: ((SubEyeCore.Category) -> Void)? = nil) {
        self.original = original; _state = state; self.services = services
        self.onSave = onSave
        _name = State(initialValue: original?.name ?? ""); _emoji = State(initialValue: original?.emoji ?? "📁")
        _pickedEmoji = State(initialValue: original != nil)
    }
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(spacing: 10) {
                        Text(emoji).font(.system(size: 24))
                        TextField(L("form_name"), text: $name).appFont(17).autocorrectionDisabled().accessibilityIdentifier("categoryName")
                    }.padding(.horizontal, 14).padding(.vertical, 14).frame(minHeight: 52).appCard(radius: 12, border: .clear)
                    Text(L("category_emoji")).appFont(13).foregroundStyle(AppTheme.muted)
                    ForEach(Self.emojiGroups.indices, id: \.self) { group in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(Self.emojiGroups[group].0).appFont(13).opacity(0.6)
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible(minimum: 44), spacing: 8), count: typeSize.isAccessibilitySize ? 4 : 6), spacing: 8) {
                                ForEach(Self.emojiGroups[group].1, id: \.self) { item in
                                    Button { emoji = item; pickedEmoji = true } label: {
                                        Text(item).font(.system(size: 22)).frame(maxWidth: .infinity).frame(minHeight: 44).aspectRatio(1, contentMode: .fit)
                                            .appCard(radius: 12, fill: item == emoji ? AppTheme.accent.opacity(0.14) : AppTheme.surface, border: item == emoji ? AppTheme.accent : AppTheme.border)
                                    }.buttonStyle(.plain).accessibilityAddTraits(item == emoji ? .isSelected : [])
                                }
                            }
                        }
                    }
                }.padding(20).padding(.bottom, 20)
            }.appScreen().navigationTitle(L(original == nil ? "category_newTitle" : "category_editTitle"))
                .onChange(of: name) { value in
                    guard !pickedEmoji else { return }
                    var hash: UInt32 = 0x811c9dc5
                    for code in value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased().utf16 { hash = (hash ^ UInt32(code)) &* 0x01000193 }
                    let all = Self.emojiGroups.flatMap { $0.1 }
                    emoji = all[abs(Int(Int32(bitPattern: hash))) % all.count]
                }
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { SheetCloseButton() }
                    ToolbarItem(placement: .confirmationAction) { ActionButton(title: L("form_save"), iconOnly: true) {
                        var category = original ?? SubEyeCore.Category(id: UUID().uuidString, name: "", emoji: "", now: Date())
                        category.name = name.trimmingCharacters(in: .whitespacesAndNewlines); category.emoji = String(emoji.prefix(1)); category.updatedAt = Day.iso(Date())
                        try await services.repository.saveCategory(category, expected: original); onSave?(category); state.reload += 1; dismiss()
                    }.disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || emoji.isEmpty).accessibilityIdentifier("saveCategory") }
                }
        }.presentationDetents([.fraction(0.9)]).appSheet()
    }
}
