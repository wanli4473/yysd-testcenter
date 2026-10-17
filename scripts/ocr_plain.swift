import Foundation
import Vision
import AppKit

let path = CommandLine.arguments[1]
let minX = CommandLine.arguments.count > 2 ? Double(CommandLine.arguments[2])! : 0.0
guard let img = NSImage(contentsOfFile: path),
      let tiff = img.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff),
      let cg = rep.cgImage else {
  fputs("fail load\n", stderr); exit(1)
}
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = true
req.recognitionLanguages = ["en-US"]
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try! handler.perform([req])
struct Item { var text: String; var y: CGFloat; var x: CGFloat }
var items: [Item] = []
for obs in req.results ?? [] {
  guard let c = obs.topCandidates(1).first else { continue }
  let b = obs.boundingBox
  if Double(b.minX) < minX { continue }
  items.append(Item(text: c.string, y: b.midY, x: b.minX))
}
items.sort { $0.y == $1.y ? $0.x < $1.x : $0.y > $1.y }
print(items.map(\.text).joined(separator: "\n"))
