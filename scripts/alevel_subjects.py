# Shared A-Level board + subject registry (imported by build/seed scripts)
# ponytail: 7 subjects only — 数学/高数/经济/物理/化学/会计/生物

BOARDS = {
    "caie": {"label": "CAIE", "labelZh": "剑桥国际 A-Level"},
    "edexcel": {"label": "Edexcel", "labelZh": "Edexcel A Level"},
    "oxford-aqa": {"label": "Oxford AQA", "labelZh": "Oxford AQA A Level"},
}

# slug → metadata (board-specific codes)
SUBJECTS = {
    # --- CAIE ---
    "9709-mathematics": {
        "code": "9709", "name": "Mathematics", "nameZh": "数学", "icon": "📐", "board": "caie",
    },
    "9231-further-mathematics": {
        "code": "9231", "name": "Further Mathematics", "nameZh": "高数", "icon": "∑", "board": "caie",
    },
    "9708-economics": {
        "code": "9708", "name": "Economics", "nameZh": "经济", "icon": "📊", "board": "caie",
    },
    "9702-physics": {
        "code": "9702", "name": "Physics", "nameZh": "物理", "icon": "⚛️", "board": "caie",
    },
    "9701-chemistry": {
        "code": "9701", "name": "Chemistry", "nameZh": "化学", "icon": "🧪", "board": "caie",
    },
    "9706-accounting": {
        "code": "9706", "name": "Accounting", "nameZh": "会计", "icon": "📒", "board": "caie",
    },
    "9700-biology": {
        "code": "9700", "name": "Biology", "nameZh": "生物", "icon": "🧬", "board": "caie",
    },
    # --- Edexcel A Level ---
    "9ma0-mathematics": {
        "code": "9MA0", "name": "Mathematics", "nameZh": "数学", "icon": "📐", "board": "edexcel",
    },
    "9fm0-further-mathematics": {
        "code": "9FM0", "name": "Further Mathematics", "nameZh": "高数", "icon": "∑", "board": "edexcel",
    },
    "9ec0-economics": {
        "code": "9EC0", "name": "Economics", "nameZh": "经济", "icon": "📊", "board": "edexcel",
    },
    "9ph0-physics": {
        "code": "9PH0", "name": "Physics", "nameZh": "物理", "icon": "⚛️", "board": "edexcel",
    },
    "9ch0-chemistry": {
        "code": "9CH0", "name": "Chemistry", "nameZh": "化学", "icon": "🧪", "board": "edexcel",
    },
    "wac11-accounting": {
        "code": "WAC11", "name": "Accounting", "nameZh": "会计", "icon": "📒", "board": "edexcel",
    },
    "9bi0-biology": {
        "code": "9BI0", "name": "Biology", "nameZh": "生物", "icon": "🧬", "board": "edexcel",
    },
    # --- Oxford AQA A Level (no accounting spec) ---
    "7367-mathematics": {
        "code": "7367", "name": "Mathematics", "nameZh": "数学", "icon": "📐", "board": "oxford-aqa",
    },
    "9665-further-mathematics": {
        "code": "9665", "name": "Further Mathematics", "nameZh": "高数", "icon": "∑", "board": "oxford-aqa",
    },
    "7136-economics": {
        "code": "7136", "name": "Economics", "nameZh": "经济", "icon": "📊", "board": "oxford-aqa",
    },
    "7517-physics": {
        "code": "7517", "name": "Physics", "nameZh": "物理", "icon": "⚛️", "board": "oxford-aqa",
    },
    "7522-chemistry": {
        "code": "7522", "name": "Chemistry", "nameZh": "化学", "icon": "🧪", "board": "oxford-aqa",
    },
    "7447-biology": {
        "code": "7447", "name": "Biology", "nameZh": "生物", "icon": "🧬", "board": "oxford-aqa",
    },
}

BOARD_ORDER = ["caie", "edexcel", "oxford-aqa"]
