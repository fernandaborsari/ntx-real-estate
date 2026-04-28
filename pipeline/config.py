# ── pipeline/config.py ──
# All paths and constants in one place.
# Place your raw data files in the data/raw/ folder inside this project,
# or set the DATA_DIR environment variable to point to another location.

import os
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
_DATA = Path(os.environ.get("DATA_DIR", _ROOT / "data" / "raw"))

REDFIN_PATH    = _DATA / "zip_code_market_tracker.tsv"
ZILLOW_PATH    = _DATA / "Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"
ZILLOW_BR_PATH = str(_DATA / "Zip_zhvi_bdrmcnt_{br}_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv")

OUTPUT_PATH = _ROOT / "ntx-dashboard" / "public" / "ntx_data.json"

NTX_COUNTIES = {
    "Collin County", "Denton County", "Tarrant County",
    "Dallas County", "Rockwall County",
}

# Cities shown in the dashboard (ordered by priority).
# Any city found in the data but not listed here is appended at the end.
PREFERRED_ORDER = [
    "Prosper", "Celina", "Frisco", "Southlake", "Flower Mound",
    "McKinney", "Allen", "Melissa", "Rockwall", "Little Elm",
    "Plano", "Richardson", "Keller", "Carrollton", "Lewisville",
    "Denton", "Irving", "Arlington",
]

BEDROOMS = [1, 2, 3, 4, 5]
