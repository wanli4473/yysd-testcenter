#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""seed_alevel_demo.py — placeholder PDFs until real papers are added."""

import os
import sys
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from alevel_subjects import BOARDS, SUBJECTS  # noqa: E402

ROOT = os.path.dirname(HERE)
ALEVEL_ROOT = os.path.join(ROOT, "library", "mock", "alevel")

DEMO_SETS = [
    ("s", "20", "12"), ("w", "20", "12"),
    ("s", "21", "12"), ("w", "21", "12"),
    ("s", "22", "12"), ("w", "22", "12"),
    ("m", "23", "12"), ("s", "23", "12"), ("w", "23", "12"),
    ("m", "24", "12"), ("s", "24", "12"), ("w", "24", "12"),
    ("m", "25", "12"), ("s", "25", "12"),
]


def minimal_pdf(title: str) -> bytes:
    stream = f"BT /F1 18 Tf 72 720 Td ({title}) Tj ET".encode("latin-1", "replace")
    stream += b" 0 -28 Td (YYSD A-Level demo placeholder) Tj"
    compressed = zlib.compress(stream)
    objects = [
        b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
        b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
        b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        b"/Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n",
        f"4 0 obj<< /Length {len(compressed)} /Filter /FlateDecode >>stream\n".encode()
        + compressed + b"\nendstream\nendobj\n",
        b"5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
    ]
    out = b"%PDF-1.4\n"
    offsets = [0]
    for obj in objects:
        offsets.append(len(out))
        out += obj
    xref_pos = len(out)
    out += f"xref\n0 {len(offsets)}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets[1:]:
        out += f"{off:010d} 00000 n \n".encode()
    out += b"trailer<< /Size 6 /Root 1 0 R >>\n"
    out += f"startxref\n{xref_pos}\n%%EOF\n".encode()
    return out


def seed():
    created = 0
    for slug, meta in SUBJECTS.items():
        board = meta["board"]
        code = meta["code"]
        board_label = BOARDS[board]["label"]
        papers_dir = os.path.join(ALEVEL_ROOT, board, slug, "papers")
        os.makedirs(papers_dir, exist_ok=True)
        readme = os.path.join(ALEVEL_ROOT, board, slug, "README.md")
        if not os.path.isfile(readme):
            with open(readme, "w", encoding="utf-8") as f:
                f.write(
                    f"# {board_label} {code} {meta['name']}\n\n"
                    f"`{code}_s24_qp_12.pdf` — question paper\n"
                    f"`{code}_s24_ms_12.pdf` — mark scheme\n\n"
                    "Run `python3 scripts/build_alevel_catalog.py` after adding files.\n"
                )
        for season, yy, paper in DEMO_SETS:
            for kind, label in (("qp", "QP"), ("ms", "MS")):
                fname = f"{code}_{season}{yy}_{kind}_{paper}.pdf"
                path = os.path.join(papers_dir, fname)
                if os.path.isfile(path):
                    continue
                title = f"{board_label} {code} {label} {season}{yy} p{paper}"
                with open(path, "wb") as f:
                    f.write(minimal_pdf(title[:70]))
                created += 1
    return created


def main():
    print(f"Created {seed()} demo PDF(s)")


if __name__ == "__main__":
    main()
