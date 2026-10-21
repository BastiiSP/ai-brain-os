import Foundation
import CoreFoundation

// Production writes one CFPreferences key. --file exercises the same transform on a fixture.
let args = CommandLine.arguments
guard (args.count == 3 || args.count == 5), ["add", "remove"].contains(args[1]) else {
    fputs("Usage: dock-entry.swift add|remove file-url [--file plist]\n", stderr)
    exit(2)
}
let action = args[1]
let appURL = args[2]
let fixture = args.count == 5 && args[3] == "--file" ? args[4] : nil
if args.count == 5 && fixture == nil { fputs("Invalid arguments\n", stderr); exit(2) }

func isOurEntry(_ value: Any) -> Bool {
    guard let tile = value as? [String: Any],
          let data = tile["tile-data"] as? [String: Any],
          let file = data["file-data"] as? [String: Any],
          let url = file["_CFURLString"] as? String else { return false }
    return url == appURL
}

func updated(_ value: Any?) throws -> (entries: [Any], changed: Bool) {
    let existing: [Any]
    if let value = value {
        guard let array = value as? [Any] else {
            throw NSError(domain: "AI Brain OS", code: 1, userInfo: [NSLocalizedDescriptionKey: "persistent-apps is not an array"])
        }
        existing = array
    } else { existing = [] }
    var withoutOurs = existing.filter { !isOurEntry($0) }
    if action == "remove" { return (withoutOurs, withoutOurs.count != existing.count) }
    if withoutOurs.count == existing.count {
        withoutOurs.append(["tile-data": ["file-data": ["_CFURLString": appURL, "_CFURLStringType": 15], "file-label": "AI Brain OS"], "tile-type": "file-tile"])
        return (withoutOurs, true)
    }
    // One existing entry needs no write. Duplicate entries are reduced to one.
    if existing.count - withoutOurs.count == 1 { return (existing, false) }
    var result = withoutOurs
    result.append(existing.first(where: isOurEntry)!)
    return (result, true)
}

do {
    if let fixture = fixture {
        let url = URL(fileURLWithPath: fixture)
        let bytes = try Data(contentsOf: url)
        guard var domain = try PropertyListSerialization.propertyList(from: bytes, options: [], format: nil) as? [String: Any] else {
            throw NSError(domain: "AI Brain OS", code: 2, userInfo: [NSLocalizedDescriptionKey: "fixture is not a dictionary"])
        }
        let change = try updated(domain["persistent-apps"])
        if change.changed {
            domain["persistent-apps"] = change.entries
            let format: PropertyListSerialization.PropertyListFormat = bytes.starts(with: Data("bplist".utf8)) ? .binary : .xml
            try PropertyListSerialization.data(fromPropertyList: domain, format: format, options: 0).write(to: url, options: .atomic)
        }
        print(change.changed ? "changed" : "unchanged")
    } else {
        let domain = "com.apple.dock" as CFString
        let key = "persistent-apps" as CFString
        let current = CFPreferencesCopyAppValue(key, domain)
        let change = try updated(current)
        if change.changed {
            CFPreferencesSetAppValue(key, change.entries as CFArray, domain)
            guard CFPreferencesAppSynchronize(domain) else {
                throw NSError(domain: "AI Brain OS", code: 3, userInfo: [NSLocalizedDescriptionKey: "Dock preferences could not be saved"])
            }
        }
        print(change.changed ? "changed" : "unchanged")
    }
} catch {
    fputs("Dock entry: \(error.localizedDescription)\n", stderr)
    exit(1)
}
