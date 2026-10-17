import Foundation
import Vision
import AppKit

let path = CommandLine.arguments[1]
guard let img = NSImage(contentsOfFile: path),
      let tiff = img.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff),
      let cg = rep.cgImage else {
  fputs("fail load\n", stderr); exit(1)
}
let w = CGFloat(cg.width)
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = true
req.recognitionLanguages = ["en-US"]
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try! handler.perform([req])
struct Line { var text: String; var x: CGFloat; var y: CGFloat; var midX: CGFloat }
var lines: [Line] = []
for obs in req.results ?? [] {
  guard let c = obs.topCandidates(1).first else { continue }
  let b = obs.boundingBox
  lines.append(Line(text: c.string, x: b.minX, y: b.minY, midX: b.midX))
}
// left column roughly midX < 0.48
let left = lines.filter { $0.midX < 0.48 }.sorted { $0.y > $1.y }
let right = lines.filter { $0.midX >= 0.48 }.sorted { $0.y > $1.y }
print("===LEFT===")
print(left.map(\.text).joined(separator: "\n"))
print("===RIGHT===")
print(right.map(\.text).joined(separator: "\n"))
