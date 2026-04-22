# ── pipeline/redfin.py ──
# Loads the Redfin Market Tracker TSV, filters to NTX Single Family,
# aggregates by city + date, and computes derived metrics.

import pandas as pd
from config import REDFIN_PATH

COLS_NEEDED = [
    "PERIOD_BEGIN", "REGION", "PROPERTY_TYPE",
    "MEDIAN_SALE_PRICE", "MEDIAN_SALE_PRICE_MOM", "MEDIAN_SALE_PRICE_YOY",
    "MEDIAN_LIST_PRICE", "MEDIAN_PPSF", "MEDIAN_LIST_PPSF",
    "HOMES_SOLD", "PENDING_SALES", "NEW_LISTINGS",
    "INVENTORY", "MONTHS_OF_SUPPLY", "MEDIAN_DOM",
    "AVG_SALE_TO_LIST", "SOLD_ABOVE_LIST", "PRICE_DROPS",
    "OFF_MARKET_IN_TWO_WEEKS", "PARENT_METRO_REGION",
]

# Flow metrics are summed across ZIPs; price metrics are medianed.
AGG_FUNCS = {
    "MEDIAN_SALE_PRICE":       "median",
    "MEDIAN_SALE_PRICE_YOY":   "median",
    "MEDIAN_LIST_PRICE":       "median",
    "MEDIAN_PPSF":             "median",
    "HOMES_SOLD":              "sum",
    "PENDING_SALES":           "sum",
    "NEW_LISTINGS":            "sum",
    "INVENTORY":               "sum",
    "MONTHS_OF_SUPPLY":        "median",
    "MEDIAN_DOM":              "median",
    "AVG_SALE_TO_LIST":        "median",
    "SOLD_ABOVE_LIST":         "median",
    "PRICE_DROPS":             "median",
    "OFF_MARKET_IN_TWO_WEEKS": "median",
}

NUM_COLS = [
    "MEDIAN_SALE_PRICE", "MEDIAN_SALE_PRICE_MOM", "MEDIAN_SALE_PRICE_YOY",
    "MEDIAN_LIST_PRICE", "MEDIAN_PPSF", "MEDIAN_LIST_PPSF",
    "HOMES_SOLD", "PENDING_SALES", "NEW_LISTINGS",
    "INVENTORY", "MONTHS_OF_SUPPLY", "MEDIAN_DOM",
    "AVG_SALE_TO_LIST", "SOLD_ABOVE_LIST", "PRICE_DROPS",
    "OFF_MARKET_IN_TWO_WEEKS",
]


def load_and_aggregate(zip_city: dict) -> pd.DataFrame:
    """
    Load Redfin TSV, filter to NTX Single Family Residential,
    map ZIPs to cities, and aggregate by (city, date).

    Returns a DataFrame with one row per (city, date) and all
    derived metrics (mom_change_pct, yoy_change_pct, price_index,
    rolling_3m, rolling_6m).
    """
    print("Loading Redfin TSV...")
    df = pd.read_csv(
        REDFIN_PATH,
        sep="\t",
        usecols=COLS_NEEDED,
        dtype=str,
        low_memory=False,
    )
    print(f"  Loaded {len(df):,} rows")

    # Keep Dallas + Fort Worth metro, Single Family only
    df = df[df["PARENT_METRO_REGION"].str.strip('"').isin(["Dallas, TX", "Fort Worth, TX"])]
    df = df[df["PROPERTY_TYPE"].str.strip('"') == "Single Family Residential"]

    # Extract ZIP and map to city
    df["zip"]  = df["REGION"].str.extract(r"(\d{5})")
    df         = df[df["zip"].isin(zip_city)].copy()
    df["city"] = df["zip"].map(zip_city)
    df         = df.dropna(subset=["city"])

    # Parse date
    df["date"] = pd.to_datetime(df["PERIOD_BEGIN"].str.strip('"'), errors="coerce").dt.strftime("%Y-%m")
    df         = df.dropna(subset=["date"])

    # Convert numerics (values are quoted strings in the TSV)
    for col in NUM_COLS:
        df[col] = pd.to_numeric(df[col].str.strip('"'), errors="coerce")

    df = df.dropna(subset=["MEDIAN_SALE_PRICE"])
    print(f"  After filtering: {len(df):,} rows | {df['city'].nunique()} cities")

    # Aggregate by (city, date)
    city_trend = (
        df.groupby(["city", "date"])
        .agg(AGG_FUNCS)
        .reset_index()
        .rename(columns={"MEDIAN_SALE_PRICE": "home_value"})
        .sort_values(["city", "date"])
    )

    # Derived metrics
    city_trend["mom_change_pct"] = (
        city_trend.groupby("city")["home_value"].pct_change() * 100
    )
    city_trend["yoy_change_pct"] = (
        city_trend.groupby("city")["home_value"].pct_change(periods=12) * 100
    )
    city_trend["price_index"] = (
        city_trend["home_value"] /
        city_trend.groupby("city")["home_value"].transform("first")
    ) * 100
    city_trend["month"]      = pd.to_datetime(city_trend["date"]).dt.month
    city_trend["rolling_3m"] = city_trend.groupby("city")["mom_change_pct"].transform(
        lambda x: x.rolling(3, min_periods=2).mean()
    )
    city_trend["rolling_6m"] = city_trend.groupby("city")["mom_change_pct"].transform(
        lambda x: x.rolling(6, min_periods=3).mean()
    )

    return city_trend
