#!/usr/bin/env python3
"""Render July PDFs and OCR remaining answer/reading images. Paths are unicode-safe."""
import os
import subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OCR = os.path.join(ROOT, "scripts/.ocr_cache/toefl-819cn/ocr_page")
if not os.path.isfile(OCR):
    OCR = os.path.join(ROOT, "scripts/ocr_page")
SWIFT = os.path.join(ROOT, "scripts/.ocr_cache/toefl-819cn/render.swift")
RENDER = os.path.join(ROOT, "scripts/.ocr_cache/toefl-819cn/render")
CACHE = os.path.join(ROOT, "scripts/.ocr_cache")
BASE = "/Users/frankman/Desktop/优益思达自整理 新托福题/7月"

PDFS = [
    (os.path.join(BASE, "7.18-国内线下", "Answers-18.pdf"), "toefl-july-7.18-国内线下", "answers"),
    (os.path.join(BASE, "7.19-国内线下", "Answers-19.pdf"), "toefl-july-7.19-国内线下", "answers"),
    (os.path.join(BASE, "7.25国内线下", "Answers.pdf"), "toefl-july-7.25国内线下", "answers"),
    (os.path.join(BASE, "7.25国内线下", "Writing.pdf"), "toefl-july-7.25国内线下", "writing"),
    (os.path.join(BASE, "7.29-国内线下", "Answers.pdf"), "toefl-july-7.29-国内线下", "answers"),
    (os.path.join(BASE, "7.29-国内线下", "Reading.pdf"), "toefl-july-7.29-国内线下", "reading"),
]


def compile_render():
    if os.path.isfile(RENDER) and os.path.getsize(RENDER) > 1000:
        return RENDER
    if not os.path.isfile(SWIFT):
        print("no render.swift")
        return None
    print("compile render")
    subprocess.check_call(["swiftc", "-o", RENDER, SWIFT])
    return RENDER if os.path.isfile(RENDER) else None


def render_pdfs(render):
    if not render:
        print("skip pdf render")
        return
    for path, slug, stem in PDFS:
        if not os.path.isfile(path):
            print("missing pdf", path)
            continue
        outd = os.path.join(CACHE, slug)
        os.makedirs(outd, exist_ok=True)
        prefix = os.path.join(outd, stem)
        first = prefix + "-01.png"
        if os.path.isfile(first) and os.path.getsize(first) > 1000:
            print("have", os.path.basename(path))
            continue
        print("render", os.path.basename(path))
        subprocess.check_call([render, path, prefix, "150"])


def ocr_images():
    count = 0
    for slug in sorted(os.listdir(CACHE)):
        if not slug.startswith("toefl-july-"):
            continue
        for root, dirs, files in os.walk(os.path.join(CACHE, slug)):
            for f in files:
                if not f.lower().endswith((".png", ".jpg", ".jpeg")):
                    continue
                path = os.path.join(root, f)
                out = path.rsplit(".", 1)[0] + ".ocr.txt"
                if os.path.isfile(out) and os.path.getsize(out) > 40:
                    continue
                print("ocr", os.path.relpath(path, CACHE))
                with open(out, "w") as fh:
                    subprocess.check_call([OCR, path], stdout=fh)
                count += 1
    print("ocr new", count)


if __name__ == "__main__":
    render_pdfs(compile_render())
    ocr_images()
