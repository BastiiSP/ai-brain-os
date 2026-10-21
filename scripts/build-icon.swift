import AppKit
import Foundation

// Render the versioned SVG at each native iconset resolution, then package it.
let source = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])

let sizes: [(String, Int)] = [
    ("icon_16x16.png", 16), ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32), ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128), ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256), ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512), ("icon_512x512@2x.png", 1024)
]

guard let image = NSImage(contentsOf: source) else { fatalError("SVG could not be loaded") }
var chunks = Data()
func appendChunk(_ code: String, _ data: Data) {
    chunks.append(contentsOf: code.utf8)
    var length = UInt32(data.count + 8).bigEndian
    withUnsafeBytes(of: &length) { chunks.append(contentsOf: $0) }
    chunks.append(data)
}
let codes = ["icp4", "ic11", "icp5", "ic12", "ic07", "ic13", "ic08", "ic14", "ic09", "ic10"]
for (index, (name, pixels)) in sizes.enumerated() {
    guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: pixels, pixelsHigh: pixels,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
        let context = NSGraphicsContext(bitmapImageRep: bitmap) else { fatalError("Cannot render \(name)") }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    context.imageInterpolation = .high
    image.draw(in: NSRect(x: 0, y: 0, width: pixels, height: pixels),
        from: .zero, operation: .copy, fraction: 1)
    context.flushGraphics()
    NSGraphicsContext.restoreGraphicsState()
    guard let data = bitmap.representation(using: .png, properties: [:]) else { fatalError("Cannot encode \(name)") }
    appendChunk(codes[index], data)
}
var package = Data("icns".utf8)
var totalLength = UInt32(chunks.count + 8).bigEndian
withUnsafeBytes(of: &totalLength) { package.append(contentsOf: $0) }
package.append(chunks)
try package.write(to: output)
