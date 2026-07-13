# Free Travel Atlas (HKU BME · Kazakh · Non-HKPR)

Interactive GitHub Pages atlas of **funded travel and learning opportunities** for a Biomedical Engineering undergraduate at the University of Hong Kong who is a **Kazakhstan citizen** and **not** a Hong Kong permanent resident.

Live site (after Pages is enabled): `https://bobshenruililin.github.io/learnai/`

## What’s inside

- **100+ curated opportunities** with eligibility, funding level, destinations, deadlines, residency traps, and creative angles
- Interactive filters: best-fit, hide HK-PR-only traps, Kazakh unlocks, fully funded, deadline season
- **Clickable tags**, **destination region chips**, and active-lens filters
- Card / table / **year timeline (Gantt)** / agenda views
- **Shortlist** (localStorage) with Interested → Drafting → Applied → Outcome + export
- **Compare tray** for up to 3 opportunities side-by-side
- Detail drawer with official links + last link-health check
- **GitHub Actions** routine checker (Mon/Thu + manual) that refreshes `docs/data/status.json`

## Enable GitHub Pages

1. Repo **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` (or this PR branch), folder: **`/docs`**
4. Save — site publishes in a minute or two

## Update the dataset

Edit [`data/opportunities.json`](data/opportunities.json), then either:

```bash
python scripts/check_opportunities.py
```

or push and let the workflow sync into `docs/data/`.

## Profile this was built for

| Field | Value |
|---|---|
| University | HKU |
| Major | Biomedical Engineering |
| Citizenship | Kazakhstan |
| HK permanent resident | No |
| Languages | English (+ willing to learn Mandarin / Spanish) |

## Highest-ROI stack

1. **Laidlaw** (if Y1–Y2) + **Mitacs Globalink** / **Amgen Asia** / **EPFL E3** / **OIST**
2. **Non-means-tested MES** once on any HKU Mainland trip + Mandarin
3. **ROA** + Horizons enrichment awards + Experience Award video cash
4. Kazakh unlocks: **SCO Youth**, **Otandastar**, **Taiwan Huayu** (apply as KZ, not as HK)
5. Win tickets: **Imagine Cup**, **iGEM**, **IEEE EMBC** travel grant
6. Ignore: HSBC/Hang Seng PR awards, SSE/SSEBR, DAAD RISE from HKU, influencer “ambassador” DMs

## Disclaimer

Deadlines and eligibility change every year. Always verify the official URL before applying. Not affiliated with HKU.
