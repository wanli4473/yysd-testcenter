#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import importlib, sys, zipfile, xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from inject_gaozhong_html import inject

EXCEL = Path.home() / "Desktop" / "高中单词List1-40.xlsx"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def col_row(ref):
    col, row = "", ""
    for ch in ref:
        if ch.isdigit():
            row += ch
        else:
            col += ch
    return col, int(row)


def excel_lists():
    with zipfile.ZipFile(EXCEL) as z:
        ss = ET.fromstring(z.read("xl/sharedStrings.xml"))
        strings = ["".join(t.text or "" for t in si.findall(".//m:t", NS)) for si in ss.findall("m:si", NS)]
        sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        rows = defaultdict(dict)
        for c in sheet.findall(".//m:c", NS):
            ref = c.attrib.get("r", "")
            col, row = col_row(ref)
            t = c.attrib.get("t")
            v = c.find("m:v", NS)
            if v is None or v.text is None:
                val = ""
            elif t == "s":
                val = strings[int(v.text)]
            else:
                val = v.text
            rows[row][col] = val
    out = {}
    for n in range(2, 8):
        key = "List%02d" % n
        out[n] = [rows[r].get("C", "").strip() for r in range(1, max(rows) + 1) if rows[r].get("A") == key]
    return out


def main():
    excel = excel_lists()
    for n in range(2, 8):
        mod = importlib.import_module("data_gaozhong_l%s" % n)
        words = mod.WORDS
        got = [w["word"] for w in words]
        want = excel[n]
        if got != want:
            for i, (a, b) in enumerate(zip(got, want), 1):
                if a != b:
                    raise SystemExit("LIST%s #%s: got %r want %r" % (n, i, a, b))
            raise SystemExit("LIST%s length got %s want %s" % (n, len(got), len(want)))
        for w in words:
            if not (2 <= len(w["acceptCN"]) <= 4):
                raise SystemExit("LIST%s %s acceptCN size" % (n, w["word"]))
            if len(w["meaning"]) < 24:
                raise SystemExit("LIST%s %s meaning thin" % (n, w["word"]))
        inject(n, words)
    print("ok lists 2-7")


if __name__ == "__main__":
    main()
