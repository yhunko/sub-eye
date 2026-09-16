import XCTest
@testable import SubEye

final class LaunchTests: XCTestCase {
    func testDevelopmentDoesNotUseProductionDatabase() {
        XCTAssertEqual(AppConfiguration.namespace, "native-development")
        XCTAssertEqual(AppConfiguration.scheme, "subeyenative")
    }
}
