# ── pipeline/geo.py ──
# Builds geographic mappings from the Zillow metadata.
# Returns ZIP → City and City → County dictionaries.

import pandas as pd
from config import ZILLOW_PATH, NTX_COUNTIES, PREFERRED_ORDER


def build_geo_mappings():
    """
    Read Zillow CSV metadata columns only (fast — skips all date columns).

    Returns
    -------
    zip_city : dict[str, str]
        ZIP code string → city name
    city_county : dict[str, str]
        city name → county name
    target_cities : list[str]
        All cities found in the data, PREFERRED_ORDER first.
    """
    print("Building ZIP → City mapping from Zillow...")

    df = pd.read_csv(
        ZILLOW_PATH,
        usecols=["RegionName", "State", "City", "CountyName"],
        dtype=str,
    )

    df = df[
        (df["State"] == "TX") &
        (df["CountyName"].isin(NTX_COUNTIES)) &
        (df["City"].notna()) &
        (df["City"] != "")
    ]

    zip_city = {
        str(int(float(row["RegionName"]))): row["City"]
        for _, row in df.iterrows()
        if row["RegionName"].replace(".", "").isdigit()
    }

    city_county = (
        df[["City", "CountyName"]]
        .drop_duplicates("City")
        .set_index("City")["CountyName"]
        .to_dict()
    )

    all_found   = sorted(set(zip_city.values()))
    target_cities = (
        [c for c in PREFERRED_ORDER if c in all_found] +
        [c for c in all_found if c not in PREFERRED_ORDER]
    )

    print(f"  {len(zip_city)} ZIPs → {len(target_cities)} cities")
    return zip_city, city_county, target_cities
