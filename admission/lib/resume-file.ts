import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

function which(bin: string): string | null {
  try {
    const out = execFileSync("which", [bin], { encoding: "utf8" }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function extractViaCli(buf: Buffer, filename: string): string | null {
  const ext = path.extname(filename.toLowerCase()) || ".bin";
  const tmp = path.join(os.tmpdir(), `yysd-resume-${Date.now()}${ext}`);
  fs.writeFileSync(tmp, buf);
  try {
    // macOS
    if (process.platform === "darwin" && which("textutil")) {
      return execFileSync("textutil", ["-convert", "txt", "-stdout", tmp], {
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
      });
    }
    // Linux: antiword (.doc) / catdoc (.doc)
    if (ext === ".doc") {
      const antiword = which("antiword");
      if (antiword) {
        return execFileSync(antiword, [tmp], {
          encoding: "utf8",
          maxBuffer: 8 * 1024 * 1024,
        });
      }
      const catdoc = which("catdoc");
      if (catdoc) {
        return execFileSync(catdoc, ["-w", tmp], {
          encoding: "utf8",
          maxBuffer: 8 * 1024 * 1024,
        });
      }
    }
    return null;
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

/** Extract text from PDF / DOC / DOCX / plain. Never persists after return. */
export async function extractResumeText(
  buf: Buffer,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buf);
    return String(parsed.text || "").slice(0, 50000);
  }

  if (lower.endsWith(".docx")) {
    // mammoth works on Linux/macOS without native tools
    try {
      const mammoth = await import("mammoth");
      const r = await mammoth.extractRawText({ buffer: buf });
      const t = String(r.value || "").trim();
      if (t) return t.slice(0, 50000);
    } catch {
      /* fall through */
    }
    const cli = extractViaCli(buf, filename);
    if (cli?.trim()) return cli.slice(0, 50000);
    throw new Error("无法解析 Word（.docx）简历，请另存为 PDF 后重试");
  }

  if (lower.endsWith(".doc")) {
    const cli = extractViaCli(buf, filename);
    if (cli?.trim()) return cli.slice(0, 50000);
    // last resort: scrape printable UTF-16LE / ASCII runs from OLE .doc
    const scraped = scrapeDocBinary(buf);
    if (scraped.length >= 80) return scraped.slice(0, 50000);
    throw new Error(
      "无法解析旧版 Word（.doc）简历。请另存为 .docx 或 PDF 后重试"
    );
  }

  return buf.toString("utf8").slice(0, 50000);
}

/** ponytail: crude .doc text salvage when antiword/catdoc missing; ceiling = garbled CJK */
function scrapeDocBinary(buf: Buffer): string {
  const parts: string[] = [];
  // UTF-16LE runs
  let i = 0;
  while (i + 1 < buf.length) {
    let s = "";
    let j = i;
    while (j + 1 < buf.length) {
      const code = buf[j] | (buf[j + 1] << 8);
      if (code === 0 || code === 0xd || code === 0xa) {
        j += 2;
        break;
      }
      if (
        (code >= 0x20 && code <= 0x7e) ||
        (code >= 0x4e00 && code <= 0x9fff) ||
        (code >= 0xa0 && code <= 0xff)
      ) {
        s += String.fromCharCode(code);
        j += 2;
      } else break;
    }
    if (s.length >= 4) parts.push(s);
    i = Math.max(j, i + 2);
  }
  // ASCII runs
  const ascii = buf
    .toString("latin1")
    .match(/[\x20-\x7e]{6,}/g);
  if (ascii) parts.push(...ascii);
  return parts.join("\n").replace(/[^\S\n]+/g, " ").trim();
}

/** Lightweight pull of GPA / school / major from resume text when form is generic */
export function hintFromResume(text: string): {
  gpa?: number;
  undergradSchool?: string;
  undergradMajor?: string;
} {
  const out: {
    gpa?: number;
    undergradSchool?: string;
    undergradMajor?: string;
  } = {};
  const gpaM = text.match(/GPA\s*[:：]?\s*([0-4]\.\d{1,2})\s*\/\s*4/i);
  if (gpaM) out.gpa = Number(gpaM[1]);

  if (/PENNSYLVANIA STATE|Penn State/i.test(text)) {
    out.undergradSchool = "THE PENNSYLVANIA STATE UNIVERSITY";
  }
  const majorM = text.match(
    /Bachelor of Science in ([^\n\r]+)|B\.?S\.?\s+in\s+([^\n\r]+)/i
  );
  if (majorM) {
    out.undergradMajor = (majorM[1] || majorM[2] || "").trim();
  }
  return out;
}
