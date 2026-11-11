// swift-tools-version: 6.4
import PackageDescription

let package = Package(
    name: "PodList",
    platforms: [.macOS(.v26), .iOS(.v26)],
    products: [
        .library(name: "PodListDomain", targets: ["PodListDomain"]),
        .library(name: "PodListData", targets: ["PodListData"]),
        .library(name: "PodListUI", targets: ["PodListUI"]),
        .executable(name: "PodListMac", targets: ["PodListMac"]),
        .executable(name: "podlist-mcp", targets: ["PodListMCPBridge"])
    ],
    targets: [
        .target(name: "PodListDomain", resources: [.copy("Resources/operation.schema.json")]),
        .target(name: "PodListData", dependencies: ["PodListDomain"], linkerSettings: [.linkedLibrary("sqlite3")]),
        .target(name: "PodListAutomation"),
        .target(name: "PodListUI", dependencies: ["PodListDomain", "PodListData", "PodListAutomation"]),
        .executableTarget(name: "PodListMCPBridge", dependencies: ["PodListAutomation"]),
        .executableTarget(name: "PodListMac", dependencies: ["PodListUI"]),
        .target(name: "ProtocolTestSupport", path: "Tests/ProtocolTestSupport"),
        .testTarget(name: "PodListDomainTests", dependencies: ["PodListDomain", "ProtocolTestSupport"]),
        .testTarget(name: "PodListDataTests", dependencies: ["PodListData", "ProtocolTestSupport"]),
        .testTarget(name: "PodListUITests", dependencies: ["PodListUI", "PodListData", "PodListDomain", "PodListAutomation"])
    ],
    swiftLanguageModes: [.v6]
)
