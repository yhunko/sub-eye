import SwiftUI
import SubEyeCore

struct FirstFrame: UIViewRepresentable {
    let onFrame: @MainActor () -> Void
    func makeUIView(context: Context) -> FrameProbe { FrameProbe(onFrame: onFrame) }
    func updateUIView(_ uiView: FrameProbe, context: Context) { }
    static func dismantleUIView(_ uiView: FrameProbe, coordinator: ()) { uiView.stop() }

    @MainActor final class FrameProbe: UIView {
        private let onFrame: @MainActor () -> Void
        private var link: CADisplayLink?
        private var emitted = false
        init(onFrame: @escaping @MainActor () -> Void) { self.onFrame = onFrame; super.init(frame: .zero); isUserInteractionEnabled = false }
        required init?(coder: NSCoder) { nil }
        override func didMoveToWindow() {
            super.didMoveToWindow()
            guard window != nil, !emitted, link == nil else { return }
            let link = CADisplayLink(target: self, selector: #selector(framePresented)); self.link = link
            link.add(to: .main, forMode: .common)
        }
        @objc private func framePresented() {
            stop(); emitted = true
            Performance.signposts.emitEvent("FirstInteractiveFrame")
            onFrame()
        }
        func stop() { link?.invalidate(); link = nil }
    }
}
