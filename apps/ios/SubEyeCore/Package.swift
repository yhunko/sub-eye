// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SubEyeCore",
    platforms: [.iOS("16.4"), .macOS(.v14)],
    products: [.library(name: "SubEyeCore", targets: ["SubEyeCore"])],
    targets: [
        .systemLibrary(name: "CSQLite"),
        .target(name: "SubEyeCore", dependencies: ["CSQLite"]),
        .testTarget(name: "SubEyeCoreTests", dependencies: ["SubEyeCore"], resources: [.copy("Fixtures")])
    ],
    swiftLanguageModes: [.v6]
)
