import AppKit
import Foundation
import Vision

guard CommandLine.arguments.count >= 2 else {
  fputs("usage: ocr_vision <image>\n", stderr)
  exit(1)
}
let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let image = NSImage(contentsOf: url),
      let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff) else {
  fputs("cannot read image\n", stderr)
  exit(2)
}
let ci = CIImage(bitmapImageRep: bitmap) ?? CIImage()
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = true
req.recognitionLanguages = ["en-US", "zh-Hans"]
let handler = VNImageRequestHandler(ciImage: ci, options: [:])
do { try handler.perform([req]) } catch {
  fputs("vision: \(error)\n", stderr)
  exit(3)
}

func sample(_ nx: CGFloat, _ ny: CGFloat) -> [Int] {
  let x = min(max(Int(nx * CGFloat(bitmap.pixelsWide)), 0), bitmap.pixelsWide - 1)
  let y = min(max(Int((1 - ny) * CGFloat(bitmap.pixelsHigh)), 0), bitmap.pixelsHigh - 1)
  guard let c = bitmap.colorAt(x: x, y: y) else { return [0, 0, 0] }
  let r = Int((c.usingColorSpace(.sRGB)?.redComponent ?? 0) * 255)
  let g = Int((c.usingColorSpace(.sRGB)?.greenComponent ?? 0) * 255)
  let b = Int((c.usingColorSpace(.sRGB)?.blueComponent ?? 0) * 255)
  return [r, g, b]
}

func greenest(_ box: CGRect) -> [Int] {
  var best = [0, 0, 0]
  var score = -999
  for i in 0..<7 {
    let nx = box.minX + box.width * (0.08 + 0.14 * CGFloat(i))
    for dy: CGFloat in [-0.2, 0, 0.2] {
      let rgb = sample(nx, box.midY + box.height * dy)
      let s = rgb[1] - rgb[0]
      if s > score {
        score = s
        best = rgb
      }
    }
  }
  return best
}

var lines: [[String: Any]] = []
for obs in req.results ?? [] {
  guard let cand = obs.topCandidates(1).first else { continue }
  let box = obs.boundingBox
  lines.append([
    "t": cand.string,
    "x": box.origin.x,
    "y": box.origin.y,
    "w": box.size.width,
    "h": box.size.height,
    "rgb": greenest(box)
  ])
}
let data = try! JSONSerialization.data(withJSONObject: lines, options: [])
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data("\n".utf8))
