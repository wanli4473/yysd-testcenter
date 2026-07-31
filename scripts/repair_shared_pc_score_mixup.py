#!/usr/bin/env python3
"""Repair user_scores / cloned attempts after shared-PC login sync mixup.

Default: dry-run. Pass --apply to write. Targets 谢超然(4) / 刘雨茜(5) unless --all-clones.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", required=True)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--uid-a", type=int, default=4)
    ap.add_argument("--uid-b", type=int, default=5)
    args = ap.parse_args()

    c = sqlite3.connect(args.db)
    c.row_factory = sqlite3.Row
    a, b = args.uid_a, args.uid_b
    names = {
        r["id"]: (r["display_name"] or "")
        for r in c.execute("SELECT id, display_name FROM users WHERE id IN (?, ?)", (a, b))
    }
    name_a = names.get(a, "")
    name_b = names.get(b, "")
    print(f"users: {a}={name_a!r} {b}={name_b!r}")

    actions = []

    # 1) Drop latest-score rows whose title clearly belongs to the other student
    for uid, foreign in ((a, name_b), (b, name_a)):
        if not foreign or len(foreign) < 2:
            continue
        for row in c.execute("SELECT item_id, payload FROM user_scores WHERE user_id = ?", (uid,)):
            try:
                rec = json.loads(row["payload"])
            except Exception:
                continue
            title = str(rec.get("title") or "")
            if foreign in title:
                actions.append(("del_score", uid, row["item_id"], title))

    # 2) Drop score-only rows under B that have zero attempts and match A's attempt fingerprint
    a_fp = {
        f"{r['item_id']}|{json.loads(r['payload']).get('score')}": r["item_id"]
        for r in c.execute(
            "SELECT item_id, payload FROM user_score_attempts WHERE user_id = ?", (a,)
        )
    }
    for row in c.execute("SELECT item_id, payload FROM user_scores WHERE user_id = ?", (b,)):
        n_att = c.execute(
            "SELECT COUNT(*) AS n FROM user_score_attempts WHERE user_id = ? AND item_id = ?",
            (b, row["item_id"]),
        ).fetchone()["n"]
        if n_att:
            continue
        try:
            rec = json.loads(row["payload"])
        except Exception:
            continue
        key = f"{row['item_id']}|{rec.get('score')}"
        if key in a_fp:
            actions.append(("del_score_orphan", b, row["item_id"], rec.get("title")))

    # 3) Restore B's user_scores from own latest attempt when score_row diverges
    for row in c.execute(
        "SELECT item_id, payload, updated_at FROM user_scores WHERE user_id = ?", (b,)
    ):
        att = c.execute(
            "SELECT payload, created_at FROM user_score_attempts "
            "WHERE user_id = ? AND item_id = ? ORDER BY created_at DESC LIMIT 1",
            (b, row["item_id"]),
        ).fetchone()
        if not att:
            continue
        try:
            sc = json.loads(row["payload"])
            apay = json.loads(att["payload"])
        except Exception:
            continue
        if sc.get("score") != apay.get("score") or str(sc.get("date") or "") != str(att["created_at"]):
            actions.append(("restore_score", b, row["item_id"], apay.get("score"), att["created_at"]))

    # 4) Identical created_at+item clones between A/B — keep lower attempt id
    clones = c.execute(
        """
        SELECT a.id AS id_a, b.id AS id_b, a.item_id, a.created_at
        FROM user_score_attempts a
        JOIN user_score_attempts b
          ON a.item_id = b.item_id AND a.created_at = b.created_at
        WHERE a.user_id = ? AND b.user_id = ?
        """,
        (a, b),
    ).fetchall()
    for row in clones:
        keep, drop = (row["id_a"], row["id_b"]) if row["id_a"] < row["id_b"] else (row["id_b"], row["id_a"])
        actions.append(("del_clone_attempt", drop, keep, row["item_id"], row["created_at"]))

    for act in actions:
        print(act)

    if not args.apply:
        print(f"dry-run: {len(actions)} actions (re-run with --apply)")
        return 0

    for act in actions:
        kind = act[0]
        if kind in ("del_score", "del_score_orphan"):
            c.execute("DELETE FROM user_scores WHERE user_id = ? AND item_id = ?", (act[1], act[2]))
        elif kind == "restore_score":
            uid, item_id = act[1], act[2]
            att = c.execute(
                "SELECT payload, created_at FROM user_score_attempts "
                "WHERE user_id = ? AND item_id = ? ORDER BY created_at DESC LIMIT 1",
                (uid, item_id),
            ).fetchone()
            if not att:
                continue
            rec = json.loads(att["payload"])
            # user_scores historically omit wrong[]
            rec.pop("wrong", None)
            c.execute(
                "UPDATE user_scores SET payload = ?, updated_at = ? WHERE user_id = ? AND item_id = ?",
                (json.dumps(rec, ensure_ascii=False), att["created_at"], uid, item_id),
            )
        elif kind == "del_clone_attempt":
            c.execute("DELETE FROM user_score_attempts WHERE id = ?", (act[1],))
    c.commit()
    print(f"applied: {len(actions)} actions")
    return 0


if __name__ == "__main__":
    sys.exit(main())
