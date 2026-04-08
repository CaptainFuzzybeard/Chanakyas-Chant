#!/usr/bin/env python3
"""
convert_and_import.py

Downloads the OpenCity 2024 Lok Sabha results CSV, converts it to the
Lok Dhaba format, patches the import script for Python 3.14 compatibility,
then runs the import directly.
"""

import csv
import io
import os
import sys
import subprocess
from pathlib import Path
from collections import defaultdict

# Ensure pipeline is importable
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

try:
    import requests
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "-q"])
    import requests

# ── Download ────────────────────────────────────────────────────────────────
OPENCITY_URL = (
    "https://data.opencity.in/dataset/85a345c6-78c0-4f57-adfc-236c726c5456"
    "/resource/d164b73a-b855-4b68-be0c-0f3450e7ab9f"
    "/download/1b837c18-4f7a-4acb-aad0-918c51186a54.csv"
)

print("[INFO] Downloading 2024 Lok Sabha results from OpenCity...")
resp = requests.get(OPENCITY_URL, timeout=30)
resp.raise_for_status()
print(f"[INFO] Downloaded {len(resp.content):,} bytes")

rows = list(csv.DictReader(io.StringIO(resp.text)))
print(f"[INFO] Parsed {len(rows):,} candidate rows")

# ── Convert ──────────────────────────────────────────────────────────────────
def safe_int(v):
    try:
        return int(str(v).replace(",", "").strip())
    except:
        return 0

constituencies = defaultdict(list)
for row in rows:
    key = (row["State"].strip(), row["PC Name"].strip())
    constituencies[key].append(row)

output_rows = []
for (state, pc_name), candidates in constituencies.items():
    sorted_cands = sorted(candidates, key=lambda r: safe_int(r.get("Total Votes", 0)), reverse=True)
    total_votes_polled = sum(safe_int(r.get("Total Votes", 0)) for r in sorted_cands)
    winner_votes = safe_int(sorted_cands[0].get("Total Votes", 0)) if sorted_cands else 0
    runner_votes = safe_int(sorted_cands[1].get("Total Votes", 0)) if len(sorted_cands) > 1 else 0
    margin = winner_votes - runner_votes

    cat = "GEN"
    name_upper = pc_name.upper()
    if "(SC)" in name_upper:
        cat = "SC"
    elif "(ST)" in name_upper:
        cat = "ST"

    clean_name = pc_name.replace("(SC)", "").replace("(ST)", "").strip()

    for i, cand in enumerate(sorted_cands):
        votes = safe_int(cand.get("Total Votes", 0))
        vote_share = cand.get("Vote Share", "").strip()
        if not vote_share:
            vote_share = f"{(votes / total_votes_polled * 100):.2f}" if total_votes_polled > 0 else "0"

        output_rows.append({
            "Candidate":             cand.get("Candidate", "").strip().title(),
            "Party":                 cand.get("Party", "").strip(),
            "Constituency":          clean_name,
            "State":                 state,
            "Position":              str(i + 1),
            "Votes":                 str(votes),
            "Total_Votes_Polled":    str(total_votes_polled),
            "Vote_Share_Percentage": vote_share,
            "Margin":                str(margin) if i == 0 else "0",
            "Gender":                "",
            "Category":              cat,
        })

out_path = ROOT / "lok_sabha_2024_converted.csv"
fieldnames = [
    "Candidate", "Party", "Constituency", "State", "Position",
    "Votes", "Total_Votes_Polled", "Vote_Share_Percentage",
    "Margin", "Gender", "Category",
]
with open(out_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(output_rows)

print(f"[INFO] Converted CSV written: {out_path} ({len(output_rows):,} rows)")

# ── Patch the import script for Python 3.14 compatibility ───────────────────
script_path = ROOT / "scripts" / "import_eci_data.py"
original = script_path.read_text(encoding="utf-8")

# Fix the _FallbackLogger.error conflict: rename positional param to 'event'
patched = original.replace(
    "        def error(self, msg, **kw): print(f\"[ERROR] {msg}\", kw or \"\")",
    "        def error(self, event=None, msg=None, **kw): print(f\"[ERROR] {event or msg}\", kw or \"\")"
)
# Also fix the call site to use keyword
patched = patched.replace(
    'logger.error("pipeline_not_available",\n                     msg="Cannot import pipeline.shared.db — run from project root")',
    'logger.error(event="pipeline_not_available", msg="Cannot import pipeline.shared.db — run from project root")'
)

patched_path = ROOT / "scripts" / "import_eci_data_patched.py"
patched_path.write_text(patched, encoding="utf-8")
print("[INFO] Patched import script written")

# ── Run import ───────────────────────────────────────────────────────────────
print("\n[INFO] Running import...")
result = subprocess.run(
    [sys.executable, str(patched_path), "--csv", str(out_path)],
    cwd=ROOT,
)
sys.exit(result.returncode)
