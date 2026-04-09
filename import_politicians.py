#!/usr/bin/env python3
"""
import_politicians.py — Standalone Lok Sabha 2024 import for Chanakya's Chant.
No pipeline dependencies. Connects directly to Supabase.

Usage:
    python import_politicians.py

Requirements:
    pip install "supabase==2.5.0" "httpx==0.27.0" python-dotenv requests
"""

from __future__ import annotations
import csv, hashlib, io, os, sys, time
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# ── Load .env ────────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass  # Manual env vars also work

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERROR] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    sys.exit(1)

try:
    import requests
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "-q"])
    import requests

from supabase import create_client

# ── Data ─────────────────────────────────────────────────────────────────────
OPENCITY_URL = (
    "https://data.opencity.in/dataset/85a345c6-78c0-4f57-adfc-236c726c5456"
    "/resource/d164b73a-b855-4b68-be0c-0f3450e7ab9f"
    "/download/1b837c18-4f7a-4acb-aad0-918c51186a54.csv"
)

PARTY_CANONICAL = {
    "Bharatiya Janata Party":      {"name": "Bharatiya Janata Party",   "abbreviation": "BJP",    "alliance": "NDA",       "is_national": True},
    "BJP":                         {"name": "Bharatiya Janata Party",   "abbreviation": "BJP",    "alliance": "NDA",       "is_national": True},
    "Indian National Congress":    {"name": "Indian National Congress", "abbreviation": "INC",    "alliance": "I.N.D.I.A", "is_national": True},
    "INC":                         {"name": "Indian National Congress", "abbreviation": "INC",    "alliance": "I.N.D.I.A", "is_national": True},
    "Samajwadi Party":             {"name": "Samajwadi Party",          "abbreviation": "SP",     "alliance": "I.N.D.I.A", "is_national": False},
    "All India Trinamool Congress":{"name": "All India Trinamool Congress","abbreviation":"TMC",  "alliance": "I.N.D.I.A", "is_national": True},
    "Trinamool Congress":          {"name": "All India Trinamool Congress","abbreviation":"TMC",  "alliance": "I.N.D.I.A", "is_national": True},
    "Dravida Munnetra Kazhagam":   {"name": "Dravida Munnetra Kazhagam","abbreviation": "DMK",   "alliance": "I.N.D.I.A", "is_national": False},
    "Telugu Desam":                {"name": "Telugu Desam Party",       "abbreviation": "TDP",    "alliance": "NDA",       "is_national": False},
    "Telugu Desam Party":          {"name": "Telugu Desam Party",       "abbreviation": "TDP",    "alliance": "NDA",       "is_national": False},
    "Janata Dal (United)":         {"name": "Janata Dal (United)",      "abbreviation": "JD(U)",  "alliance": "NDA",       "is_national": False},
    "Shiv Sena (Uddhav Balasaheb Thackeray)": {"name": "Shiv Sena (UBT)", "abbreviation": "SHS(UBT)", "alliance": "I.N.D.I.A", "is_national": False},
    "Shiv Sena":                   {"name": "Shiv Sena",               "abbreviation": "SHS",    "alliance": "NDA",       "is_national": False},
    "Nationalist Congress Party":  {"name": "Nationalist Congress Party","abbreviation": "NCP",   "alliance": "I.N.D.I.A", "is_national": False},
    "Nationalist Congress Party - Sharadchandra Pawar": {"name": "NCP (SP)", "abbreviation": "NCP(SP)", "alliance": "I.N.D.I.A", "is_national": False},
    "Communist Party of India  (Marxist)": {"name": "CPI(M)", "abbreviation": "CPI(M)", "alliance": "I.N.D.I.A", "is_national": True},
    "Communist Party of India (Marxist)":  {"name": "CPI(M)", "abbreviation": "CPI(M)", "alliance": "I.N.D.I.A", "is_national": True},
    "Aam Aadmi Party":             {"name": "Aam Aadmi Party",         "abbreviation": "AAP",    "alliance": "I.N.D.I.A", "is_national": True},
    "Indian Union Muslim League":  {"name": "Indian Union Muslim League","abbreviation": "IUML",  "alliance": "I.N.D.I.A", "is_national": False},
    "Rashtriya Janata Dal":        {"name": "Rashtriya Janata Dal",    "abbreviation": "RJD",    "alliance": "I.N.D.I.A", "is_national": False},
    "Jharkhand Mukti Morcha":      {"name": "Jharkhand Mukti Morcha",  "abbreviation": "JMM",    "alliance": "I.N.D.I.A", "is_national": False},
    "Yuvajana Sramika Rythu Congress Party": {"name": "YSR Congress Party", "abbreviation": "YSRCP", "alliance": None, "is_national": False},
    "Independent":                 {"name": "Independent",             "abbreviation": "IND",    "alliance": None,        "is_national": False},
}

def normalise_party(raw: str) -> dict:
    s = raw.strip()
    if s in PARTY_CANONICAL:
        return PARTY_CANONICAL[s]
    for k, v in PARTY_CANONICAL.items():
        if k.lower() in s.lower() or s.lower() in k.lower():
            return v
    abbr = s[:8].upper().replace(" ", "")
    return {"name": s, "abbreviation": abbr, "alliance": None, "is_national": False}

def eci_id(name: str, constituency: str, year: int = 2024) -> str:
    raw = f"{year}:{constituency.lower().strip()}:{name.lower().strip()}"
    return f"eci_{year}_{hashlib.md5(raw.encode()).hexdigest()[:8]}"

def generate_aliases(name: str) -> list[str]:
    aliases = [name]
    tokens = name.lower().split()
    HONORIFICS = {"dr.", "dr", "shri", "smt.", "smt", "mr.", "mr", "mrs.", "mrs", "prof.", "prof"}
    clean = [t for t in tokens if t.rstrip(".") not in HONORIFICS]
    clean_name = " ".join(clean).title()
    if clean_name != name:
        aliases.append(clean_name)
    if clean:
        surname = clean[-1].title()
        AMBIGUOUS = {"yadav","singh","kumar","sharma","patel","shah","rao","reddy","naidu"}
        if len(surname) >= 4 and clean[-1] not in AMBIGUOUS and surname not in aliases:
            aliases.append(surname)
    return aliases

@dataclass
class Candidate:
    name: str
    party: str
    constituency: str
    state: str
    position: int
    votes: int
    total_votes: int
    vote_share: float
    margin: int
    category: str

# ── Download & convert ────────────────────────────────────────────────────────
print("[INFO] Downloading 2024 Lok Sabha results...")
resp = requests.get(OPENCITY_URL, timeout=30)
resp.raise_for_status()
rows = list(csv.DictReader(io.StringIO(resp.text)))
print(f"[INFO] {len(rows):,} rows downloaded")

def safe_int(v):
    try: return int(str(v).replace(",","").strip())
    except: return 0
def safe_float(v):
    try: return float(str(v).strip())
    except: return 0.0

constituencies: dict = defaultdict(list)
for row in rows:
    key = (row["State"].strip(), row["PC Name"].strip())
    constituencies[key].append(row)

candidates: list[Candidate] = []
for (state, pc_name), cands in constituencies.items():
    sorted_c = sorted(cands, key=lambda r: safe_int(r.get("Total Votes", 0)), reverse=True)
    total = sum(safe_int(r.get("Total Votes", 0)) for r in sorted_c)
    winner_v = safe_int(sorted_c[0].get("Total Votes", 0)) if sorted_c else 0
    runner_v = safe_int(sorted_c[1].get("Total Votes", 0)) if len(sorted_c) > 1 else 0
    margin = winner_v - runner_v
    cat = "SC" if "(SC)" in pc_name.upper() else "ST" if "(ST)" in pc_name.upper() else "GEN"
    clean_pc = pc_name.replace("(SC)","").replace("(ST)","").strip()

    # Only import winner (position 1)
    c = sorted_c[0]
    votes = safe_int(c.get("Total Votes", 0))
    vs = safe_float(c.get("Vote Share", "0"))
    candidates.append(Candidate(
        name=c.get("Candidate","").strip().title(),
        party=c.get("Party","").strip(),
        constituency=clean_pc,
        state=state,
        position=1,
        votes=votes,
        total_votes=total,
        vote_share=vs,
        margin=margin,
        category=cat,
    ))

print(f"[INFO] {len(candidates):,} winners to import")

# ── Connect to Supabase ───────────────────────────────────────────────────────
print("[INFO] Connecting to Supabase...")
client = create_client(SUPABASE_URL, SUPABASE_KEY)
print("[INFO] Connected")

# ── Import ────────────────────────────────────────────────────────────────────
party_cache: dict[str, str] = {}
ok = 0
errors = 0

for i, c in enumerate(candidates):
    try:
        party_data = normalise_party(c.party)
        abbr = party_data["abbreviation"]

        # Upsert party
        if abbr not in party_cache:
            r = client.table("parties").upsert({
                "eci_party_id": f"eci_party_{abbr.lower()}",
                "name": party_data["name"],
                "abbreviation": abbr,
                "alliance": party_data.get("alliance"),
                "is_national": party_data.get("is_national", False),
            }, on_conflict="eci_party_id").execute()
            if r.data:
                party_cache[abbr] = r.data[0]["id"]
            else:
                ex = client.table("parties").select("id").eq("abbreviation", abbr).single().execute()
                party_cache[abbr] = ex.data["id"]

        party_id = party_cache[abbr]

        # Upsert politician
        eid = eci_id(c.name, c.constituency)
        r = client.table("politicians").upsert({
            "eci_candidate_id": eid,
            "current_party_id": party_id,
            "name": c.name,
            "name_aliases": generate_aliases(c.name),
            "constituency": c.constituency,
            "state": c.state,
            "tier": "national",
            "office_status": "in_office",
            "gender": "",
        }, on_conflict="eci_candidate_id").execute()

        if r.data:
            pol_id = r.data[0]["id"]
        else:
            ex = client.table("politicians").select("id").eq("eci_candidate_id", eid).single().execute()
            pol_id = ex.data["id"]

        # Election result
        client.table("election_results").upsert({
            "politician_id": pol_id,
            "election_type": "lok_sabha",
            "election_year": 2024,
            "constituency": c.constituency,
            "state": c.state,
            "votes_received": c.votes,
            "total_votes_cast": c.total_votes,
            "vote_share_pct": round(c.vote_share, 2),
            "result": "won",
            "margin": c.margin,
        }, on_conflict="politician_id,election_type,election_year").execute()

        # Party history
        ex = client.table("politician_party_history").select("id").eq("politician_id", pol_id).is_("ended_at", "null").execute()
        if not ex.data:
            client.table("politician_party_history").insert({
                "politician_id": pol_id,
                "party_id": party_id,
                "started_at": "2024-06-04T00:00:00Z",
                "ended_at": None,
                "reason": "election",
            }).execute()

        # Stats row
        st = client.table("politician_stats").select("politician_id").eq("politician_id", pol_id).execute()
        if not st.data:
            client.table("politician_stats").insert({"politician_id": pol_id}).execute()

        ok += 1
        if (i + 1) % 50 == 0:
            print(f"[INFO] {i+1}/{len(candidates)} imported...")
            time.sleep(0.1)

    except Exception as e:
        print(f"[WARN] {c.name} ({c.constituency}): {e}")
        errors += 1

print(f"\n[DONE] Imported {ok} politicians, {errors} errors")
print("Refresh the card bank in your browser — politicians should now appear.")
