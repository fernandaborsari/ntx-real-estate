# ── pipeline/config.py ──
# All paths and constants in one place.
# Update DATA_DIR and OUTPUT_PATH to match your local folder structure.

import os

# Folder where the raw Redfin and Zillow files are stored
DATA_DIR = os.getenv("NTX_DATA_DIR", "./data/raw")

REDFIN_PATH    = os.path.join(DATA_DIR, "zip_code_market_tracker.tsv")
ZILLOW_PATH    = os.path.join(DATA_DIR, "Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv")
ZILLOW_BR_PATH = os.path.join(DATA_DIR, "Zip_zhvi_bdrmcnt_{br}_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv")

# Where the output JSON is written (consumed by the React dashboard)
OUTPUT_PATH = os.getenv("NTX_OUTPUT_PATH", "./outputs/ntx_data.json")

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
