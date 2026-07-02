"""Inject IELTS band-score helpers into Cambridge mock HTML pages."""

from __future__ import annotations

LISTENING_SCORING = """
/* 官方 听力 原始分(0-40) → 雅思分 对照表 */
const BAND_TABLE = [[39,9.0],[37,8.5],[35,8.0],[32,7.5],[30,7.0],[26,6.5],[23,6.0],[18,5.5],[16,5.0],[13,4.5],[10,4.0],[6,3.5],[4,3.0],[0,2.5]];
const LEVEL_LABEL = [[8.5,'Expert / Very good user'],[7.0,'Good user'],[6.0,'Competent user'],[5.0,'Modest user'],[4.0,'Limited user'],[0,'Basic user']];
function lookupBand(correct,total){ const scaled = total===40?correct:Math.round(correct/Math.max(1,total)*40); for(const [m,b] of BAND_TABLE) if(scaled>=m) return b; return 2.5; }
function levelLabel(b){ for(const [m,l] of LEVEL_LABEL) if(b>=m) return l; return ''; }

"""

READING_SCORING = """
/* 官方 学术类阅读 原始分(0-40) → 雅思分 对照表 */
const BAND_TABLE = [[39,9.0],[37,8.5],[35,8.0],[33,7.5],[30,7.0],[27,6.5],[23,6.0],[19,5.5],[15,5.0],[13,4.5],[10,4.0],[8,3.5],[6,3.0],[4,2.5],[0,2.0]];
const LEVEL_LABEL = [[8.5,'Expert / Very good user'],[7.0,'Good user'],[6.0,'Competent user'],[5.0,'Modest user'],[4.0,'Limited user'],[0,'Basic user']];
function lookupBand(correct,total){ const scaled = total===40?correct:Math.round(correct/Math.max(1,total)*40); for(const [m,b] of BAND_TABLE) if(scaled>=m) return b; return 2.0; }
function levelLabel(b){ for(const [m,l] of LEVEL_LABEL) if(b>=m) return l; return ''; }

"""


def patch_scoring(html: str, *, reading: bool = False) -> str:
    if "function lookupBand" in html:
        return html
    block = READING_SCORING if reading else LISTENING_SCORING
    marker = "let currentPaper=[], selectedSections"
    if marker not in html:
        return html
    return html.replace(marker, block + marker, 1)
