//
//  FileSystem.swift
//  FileSystem
//
//  Created by Kamaal M Farah on 5/6/25.
//

import Cocoa
import Foundation
import KamaalExtensions

public enum FileSystemGetDirectoryInfoErrors: Error {
    case notADirectory
    case doesNotExist
    case generalError(cause: Error)
}

public struct FileSystemOpenFilePickerConfig {
    public let allowsMultipleSelection: Bool
    public let canChooseDirectories: Bool
    public let canChooseFiles: Bool

    public init(allowsMultipleSelection: Bool, canChooseDirectories: Bool, canChooseFiles: Bool) {
        self.allowsMultipleSelection = allowsMultipleSelection
        self.canChooseDirectories = canChooseDirectories
        self.canChooseFiles = canChooseFiles
    }
}

public actor FileSystem {
    private let fileManager: FileManager

    public init(fileManager: FileManager) {
        self.fileManager = fileManager
    }

    public init() {
        self.init(fileManager: .default)
    }

    @MainActor
    public func openFilePicker(config: FileSystemOpenFilePickerConfig) -> [URL]? {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = config.allowsMultipleSelection
        panel.canChooseDirectories = config.canChooseDirectories
        panel.canChooseFiles = config.canChooseFiles
        guard panel.runModal() == .OK else { return nil }

        return panel.urls
    }

    public func getDirectoryInfo(
        for url: URL,
        ignoringRuleFilenames: [String] = []
    ) -> Result<DirectoryInfo, FileSystemGetDirectoryInfoErrors> {
        getDirectoryInfo(for: url, parent: nil, ignoringRuleFilenames: ignoringRuleFilenames)
    }

    public func findDirectories(_ match: String, in directory: DirectoryInfo) -> [DirectoryInfo] {
        let directoryURLString = directory.url.absoluteString
        var matches: [DirectoryInfo] = []
        for currentDirectory in listNestedDirectories(in: directory) {
            var currentDirectoryURLComponents = currentDirectory.url.absoluteString.split(separator: directoryURLString)
            if currentDirectoryURLComponents.count > 1 {
                currentDirectoryURLComponents.removeFirst()
            }
            let currentDirectoryURLStringWithoutSourceDirectory = currentDirectoryURLComponents.joined(separator: "/")
            if currentDirectoryURLStringWithoutSourceDirectory.contains(match) {
                matches.append(currentDirectory)
            }
        }

        return matches
    }

    public func listNestedDirectories(in directory: DirectoryInfo) -> [DirectoryInfo] {
        var directories: [DirectoryInfo] = []
        for currentDirectory in directory.directories {
            directories.append(currentDirectory)
            let nestedDirectories = listNestedDirectories(in: currentDirectory)
            directories.append(contentsOf: nestedDirectories)
        }

        return directories
    }

    public func isDirectory(_ url: URL) -> Bool {
        var isDirectory: ObjCBool = false
        let itemExists = fileManager.fileExists(atPath: url.path, isDirectory: &isDirectory)

        return itemExists && isDirectory.boolValue
    }

    public func isFile(_ url: URL) -> Bool {
        itemExists(url) && !isDirectory(url)
    }

    public func itemExists(_ url: URL) -> Bool {
        fileManager.fileExists(atPath: url.path)
    }

    public func getFileContent(_ url: URL) -> String? {
        guard isFile(url) else {
            assertionFailure("Get content on files")
            return nil
        }

        do {
            return try String(contentsOf: url, encoding: .utf8)
        } catch {
            return nil
        }
    }

    private func getDirectoryInfo(
        for url: URL,
        parent: DirectoryInfo?,
        ignoringRuleFilenames: [String]
    ) -> Result<DirectoryInfo, FileSystemGetDirectoryInfoErrors> {
        guard itemExists(url) else { return .failure(.doesNotExist) }
        guard isDirectory(url) else { return .failure(.notADirectory) }

        let itemURLs: [URL]
        do {
            itemURLs = try fileManager.contentsOfDirectory(at: url, includingPropertiesForKeys: nil)
        } catch {
            return .failure(.generalError(cause: error))
        }

        let fetchingDirectoryInfo = DirectoryInfo(url: url, parent: parent, files: [], directories: [])
        let ignores: Set<String>
        if ignoringRuleFilenames.isEmpty {
            ignores = []
        } else {
            ignores = itemURLs
                .reduce(Set<String>()) { partialResult, itemURL in
                    guard ignoringRuleFilenames.contains(itemURL.lastPathComponent) else { return partialResult }
                    guard isFile(itemURL) else { return partialResult }
                    guard let content = getFileContent(itemURL) else { return partialResult }

                    return IgnoreSpec
                        .getFilePaths(
                            content,
                            previousIgnores: partialResult,
                            parent: fetchingDirectoryInfo
                        )
                }
        }
        let (fetchingDirectoryInfoFiles, fetchingDirectoryInfoDirectoriess) = itemURLs
            .reduce((files: [FileInfo](), directories: [DirectoryInfo]())) { partialResult, itemURL in
                guard itemExists(itemURL) else {
                    assertionFailure("Should exist at this point")
                    return partialResult
                }
                guard !itemURL.lastPathComponent.hasPrefix(".") else { return partialResult }
                guard !IgnoreSpec.ignore(ignores: ignores, url: itemURL) else { return partialResult }

                if isDirectory(itemURL) {
                    let directoryResult = getDirectoryInfo(
                        for: itemURL,
                        parent: fetchingDirectoryInfo,
                        ignoringRuleFilenames: ignoringRuleFilenames
                    )
                    switch directoryResult {
                    case .failure: return partialResult
                    case let .success(success):
                        return (files: partialResult.files, directories: partialResult.directories.appended(success))
                    }
                }

                if isFile(itemURL) {
                    let file = FileInfo(url: itemURL, parent: fetchingDirectoryInfo)
                    return (files: partialResult.files.appended(file), directories: partialResult.directories)
                }

                return partialResult
            }

        let fetchingDirectoriesWithItems = fetchingDirectoryInfo
            .setFiles(fetchingDirectoryInfoFiles)
            .setDirectories(fetchingDirectoryInfoDirectoriess)

        return .success(fetchingDirectoriesWithItems)
    }
}

public enum FileSystemTypes: Sendable {
    case file
    case directory
}

public protocol FileSystemItemable: Hashable, Equatable, Sendable {
    var url: URL { get }
    var parent: DirectoryInfo? { get }
    var type: FileSystemTypes { get }
    var items: [FileSystemItem] { get }
}

extension FileSystemItemable {
    public var name: String { url.lastPathComponent }

    public var isDirectory: Bool { type == .directory }

    public var isFile: Bool { type == .file }

    public var asItem: FileSystemItem { .init(url: url, parent: parent, type: type, items: items) }
}

public final class FileSystemItem: FileSystemItemable {
    public let url: URL
    public let parent: DirectoryInfo?
    public let type: FileSystemTypes
    public let items: [FileSystemItem]

    public init(url: URL, parent: DirectoryInfo?, type: FileSystemTypes, items: [FileSystemItem]) {
        self.url = url
        self.parent = parent
        self.type = type
        self.items = items
    }

    public func hash(into hasher: inout Hasher) {
        hasher.combine(url)
    }

    public static func == (lhs: FileSystemItem, rhs: FileSystemItem) -> Bool {
        lhs.url == rhs.url
    }
}

public final class DirectoryInfo: FileSystemItemable {
    public let url: URL
    public let parent: DirectoryInfo?
    public let files: [FileInfo]
    public let directories: [DirectoryInfo]

    public init(url: URL, parent: DirectoryInfo?, files: [FileInfo], directories: [DirectoryInfo]) {
        self.url = url
        self.parent = parent
        self.files = files
        self.directories = directories
    }

    public var type: FileSystemTypes { .directory }

    public var items: [FileSystemItem] {
        (files.map(\.asItem) + directories.map(\.asItem))
            .sorted(by: \.name, using: .orderedAscending)
    }

    public var fileCount: Int { files.count }

    public var directoryCount: Int { directories.count }

    public func setFiles(_ files: [FileInfo]) -> Self {
        Self(url: url, parent: parent, files: files, directories: directories)
    }

    public func setDirectories(_ directories: [DirectoryInfo]) -> Self {
        Self(url: url, parent: parent, files: files, directories: directories)
    }

    nonisolated public func hash(into hasher: inout Hasher) {
        hasher.combine(url)
    }

    public static func == (lhs: DirectoryInfo, rhs: DirectoryInfo) -> Bool {
        lhs.url == rhs.url
    }
}

public struct FileInfo: FileSystemItemable {
    public let url: URL
    public let parent: DirectoryInfo?

    public init(url: URL, parent: DirectoryInfo?) {
        self.url = url
        self.parent = parent
    }

    public var type: FileSystemTypes { .file }

    public var items: [FileSystemItem] { [] }
}

enum IgnoreSpec {
    static func getFilePaths(_ content: String, previousIgnores: Set<String>, parent: DirectoryInfo?) -> Set<String> {
        content
            .splitLines
            .reduce(previousIgnores, { result, current in
                guard let formatted = formatLine(current) else { return result }

                var result = result
                if shouldAddLineToIgnores(formatted) {
                    result.insert(formatted)
                } else if shouldRemoveFromIgnores(formatted, ignores: result) {
                    result.remove(formatted)
                }

                return result
            })
    }

    static func ignore(ignores: Set<String>, url: URL) -> Bool {
        ignores.contains(url.lastPathComponent)
    }

    private static func shouldRemoveFromIgnores(_ line: String, ignores: Set<String>) -> Bool {
        assert(formatLine(line) == line, "Should be already formatted before evulating")
        assert(!line.isEmpty, "Should not be empty at this point")

        return ignores.contains(line) && line.hasPrefix("#")
    }

    private static func shouldAddLineToIgnores(_ line: String) -> Bool {
        assert(formatLine(line) == line, "Should be already formatted before evulating")
        assert(!line.isEmpty, "Should not be empty at this point")

        return !line.hasPrefix("#")
    }

    private static func formatLine(_ line: some StringProtocol) -> String? {
        var formatted = String(line.trimmingByWhitespacesAndNewLines)
        guard !formatted.isEmpty else { return nil }

        if formatted.hasSuffix("/") {
            formatted = String(formatted.dropLast())
            guard !formatted.isEmpty else { return nil }
        }
        if formatted.hasPrefix("./") {
            formatted = String(formatted.range(from: 2))
            guard !formatted.isEmpty else { return nil }
        }

        // Very optimistic, but will bother later when it gets in the way!
        // TODO: Do something with parent probably
        guard let name = formatted.split(separator: "/").last else { return nil }
        guard !name.isEmpty else { return nil }

        return String(name)
    }
}
