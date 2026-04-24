# ── pipeline/config.py ──
# All paths and constants in one place.
# Change these when moving to a new machine or updating data files.

BASE = "/Users/Fernanda/Desktop/Portifolio/Imobiliaria/HOME_VALUES"

REDFIN_PATH   = f"{BASE}/zip_code_market_tracker.tsv"
ZILLOW_PATH   = f"{BASE}/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"
ZILLOW_BR_PATH = f"{BASE}/Zip_zhvi_bdrmcnt_{{br}}_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"

OUTPUT_PATH = (
    "/Users/Fernanda/Desktop/Portifolio/NTX_REAL_ESTATE_ANALYSIS"
    "/ntx-dashboard/public/ntx_data.json"
)

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
