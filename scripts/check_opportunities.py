#!/usr/bin/env python3
"""Routine opportunity link + deadline health check for the Travel Atlas.

Writes docs/data/status.json and refreshes meta timestamps.
Intended to run in GitHub Actions on a schedule.
"""

from __future__ import annotations

import json
import re
import ssl
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS_DATA = ROOT / "docs" / "data"
SRC_DATA = ROOT / "data"
OPS_PATH = DOCS_DATA / "opportunities.json"
STATUS_PATH = DOCS_DATA / "status.json"
SOURCES_PATH = SRC_DATA / "sources.json"

UA = "HKU-Travel-Atlas-Bot/1.0 (+https://github.com/bobshenruililin/learnai; research link checker)"
TIMEOUT = 20


def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write("\n")


def fetch(url: str) -> dict:
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        method="GET",
    )
    started = time.time()
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as resp:
            body = resp.read(200_000)
            text = body.decode("utf-8", errors="ignore")
            return {
                "ok": 200 <= resp.status < 400,
                "status": resp.status,
                "final_url": resp.geturl(),
                "elapsed_ms": int((time.time() - started) * 1000),
                "bytes": len(body),
                "title_hint": _title(text),
                "deadline_mentions": _deadline_mentions(text),
                "error": None,
            }
    except urllib.error.HTTPError as e:
        return {
            "ok": False,
            "status": e.code,
            "final_url": url,
            "elapsed_ms": int((time.time() - started) * 1000),
            "bytes": 0,
            "title_hint": None,
            "deadline_mentions": [],
            "error": f"HTTPError: {e}",
        }
    except Exception as e:  # noqa: BLE001 - collect any network failure
        return {
            "ok": False,
            "status": None,
            "final_url": url,
            "elapsed_ms": int((time.time() - started) * 1000),
            "bytes": 0,
            "title_hint": None,
            "deadline_mentions": [],
            "error": str(e),
        }


def _title(html: str) -> str | None:
    m = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.I | re.S)
    if not m:
        return None
    return re.sub(r"\s+", " ", m.group(1)).strip()[:160]


def _deadline_mentions(html: str) -> list[str]:
    # Lightweight scrape for human review — not a parser of truth
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text)
    pats = [
        r"deadline[^.]{0,80}",
        r"applications? (?:close|open|due)[^.]{0,80}",
        r"apply by[^.]{0,60}",
        r"\b20\d{2}-\d{2}-\d{2}\b",
        r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? 20\d{2}\b",
    ]
    hits = []
    for p in pats:
        for m in re.finditer(p, text, flags=re.I):
            snippet = m.group(0).strip()
            if snippet and snippet not in hits:
                hits.append(snippet[:140])
            if len(hits) >= 5:
                return hits
    return hits


def sync_ops_to_docs() -> dict:
    src = load_json(SRC_DATA / "opportunities.json")
    src["meta"]["generated_at"] = datetime.now(timezone.utc).isoformat()
    save_json(OPS_PATH, src)
    save_json(SRC_DATA / "opportunities.json", src)
    return src


def main() -> int:
    ops = sync_ops_to_docs()
    sources = []
    for o in ops["opportunities"]:
        url = (o.get("official_url") or "").strip()
        if not url:
            continue
        sources.append({"id": o["id"], "name": o["name"], "url": url, "priority": o.get("priority", 5)})

    # Prefer high-priority URLs first; cap to keep CI time reasonable
    sources.sort(key=lambda s: (s["priority"], s["name"]))
    # Check all, but sleep politely
    results = []
    ok = fail = redirect = 0
    now = datetime.now(timezone.utc).isoformat()

    for i, src in enumerate(sources):
        info = fetch(src["url"])
        if info["ok"]:
            ok += 1
            if info.get("final_url") and info["final_url"].rstrip("/") != src["url"].rstrip("/"):
                redirect += 1
        else:
            fail += 1
        results.append({
            "id": src["id"],
            "name": src["name"],
            "url": src["url"],
            "checked_at": now,
            **info,
        })
        # polite crawl delay
        time.sleep(0.4 if src["priority"] <= 3 else 0.2)
        if (i + 1) % 10 == 0:
            print(f"Checked {i + 1}/{len(sources)}…")

    status = {
        "checked_at": now,
        "summary": {
            "total": len(results),
            "ok": ok,
            "fail": fail,
            "redirect": redirect,
        },
        "results": results,
        "notes": "Automated link reachability + rough deadline mention scrape. Always verify official pages.",
    }
    save_json(STATUS_PATH, status)
    save_json(SOURCES_PATH, {"sources": sources, "checked_at": now})

    # Mirror opportunities already synced; also mirror status into /data for repo consumers
    save_json(SRC_DATA / "status.json", status)

    print(json.dumps(status["summary"], indent=2))
    return 0 if fail < max(3, len(results) // 3) else 0  # never fail the build hard on flaky sites


if __name__ == "__main__":
    raise SystemExit(main())
