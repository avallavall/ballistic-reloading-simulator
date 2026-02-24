---
created: 2026-02-24T22:41:46.513Z
title: Expand validation loads with more calibers and sources
area: testing
files:
  - backend/tests/fixtures/validation_loads.py
---

## Problem

The solver validation benchmark currently has only 21 fixed loads across 4 calibers (.308 Win, 6.5 Creedmoor, .223 Rem, .300 Win Mag) with data from Hodgdon, Sierra, Hornady, and Berger manuals. This is a relatively small dataset for confidently measuring solver accuracy (currently 1.45% mean error).

More reference loads would:
- Improve statistical confidence in the error metric
- Cover edge cases (very light/heavy bullets, fast/slow powders)
- Test additional calibers (e.g., 6mm Creedmoor, .270 Win, .30-06, 7mm Rem Mag)
- Include data from more sources (Nosler, Alliant, ADI)

## Solution

Edit `backend/tests/fixtures/validation_loads.py` to add more reference loads:
- Add 2-3 more calibers (e.g., .30-06 Springfield, 7mm Rem Mag, 6mm Creedmoor)
- Add more powder/bullet combos for existing calibers
- Include data from additional reloading manuals (Nosler, Alliant, ADI/Australian)
- Target ~40-50 total loads for a more robust benchmark
- Re-run `/api/v1/simulate/validate` to update the mean error metric
