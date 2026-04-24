# ── pipeline/timeline.py ──
# Builds time-series structures:
#   combined_timeline  — date × city price matrix (for multi-city charts)
#   county_timeline    — date × county aggregate
#   city_series        — full monthly series per city
#   seasonality        — average monthly momentum per city

import pandas as pd


def build_combined_timeline(city_trend: pd.DataFrame, active_cities: list) -> list:
    """Wide matrix: one row per date, one column per city."""
    all_dates = sorted(city_trend["date"].unique())
    rows = []
    for d in all_dates:
        row = {"date": d}
        for city in active_cities:
            sub = city_trend[(city_trend["city"] == city) & (city_trend["date"] == d)]
            if not sub.empty:
                r = sub.iloc[0]
                row[city]            = round(r["home_value"], 0)
                row[f"{city}_index"] = round(r["price_index"], 2)
                yoy = r["yoy_change_pct"]
                row[f"{city}_yoy"]   = round(yoy, 2) if pd.notna(yoy) else None
        rows.append(row)
    return rows


def build_county_timeline(city_trend: pd.DataFrame, city_county: dict):
    """
    Aggregate cities into counties and return:
      county_combined : list[dict]   wide matrix date × county
      county_summary  : list[dict]   latest snapshot per county
    """
    ct = city_trend.copy()
    ct["county"] = ct["city"].map(city_county)
    county_trend = (
        ct.groupby(["county", "date"])["home_value"]
        .mean()
        .reset_index()
        .sort_values(["county", "date"])
    )
    county_trend["yoy_change_pct"] = (
        county_trend.groupby("county")["home_value"].pct_change(periods=12) * 100
    )
    county_trend["price_index"] = (
        county_trend["home_value"] /
        county_trend.groupby("county")["home_value"].transform("first")
    ) * 100

    all_counties = sorted(county_trend["county"].dropna().unique())
    all_dates    = sorted(county_trend["date"].unique())

    county_combined = []
    for d in all_dates:
        row = {"date": d}
        for county in all_counties:
            sub = county_trend[(county_trend["county"] == county) & (county_trend["date"] == d)]
            if not sub.empty:
                r = sub.iloc[0]
                row[county]              = round(r["home_value"], 0)
                yoy = r["yoy_change_pct"]
                row[f"{county}_yoy"]     = round(yoy, 2) if pd.notna(yoy) else None
                row[f"{county}_index"]   = round(r["price_index"], 2)
        county_combined.append(row)

    county_summary = []
    for county in all_counties:
        cs   = county_trend[county_trend["county"] == county].sort_values("date")
        last = cs.iloc[-1]
        yoy  = last["yoy_change_pct"]
        county_summary.append({
            "county":         county,
            "home_value":     round(last["home_value"], 0),
            "price_index":    round(last["price_index"], 2),
            "yoy_change_pct": round(yoy, 2) if pd.notna(yoy) else None,
        })

    return all_counties, county_combined, county_summary


def build_city_series(city_trend: pd.DataFrame, active_cities: list):
    """
    Per-city monthly series and average monthly seasonality.

    Returns
    -------
    city_series   : dict[city, list[dict]]
    seasonal_dict : dict[city, list[dict]]
    """
    city_series   = {}
    seasonal_dict = {}

    for city in active_cities:
        cs = city_trend[city_trend["city"] == city].sort_values("date")

        city_series[city] = [
            {
                "date":           r["date"],
                "home_value":     round(r["home_value"], 0),
                "price_index":    round(r["price_index"], 2),
                "yoy_change_pct": round(r["yoy_change_pct"], 2) if pd.notna(r["yoy_change_pct"]) else None,
                "mom_change_pct": round(r["mom_change_pct"], 3) if pd.notna(r["mom_change_pct"]) else None,
                "rolling_3m":     round(r["rolling_3m"], 3) if pd.notna(r["rolling_3m"]) else None,
                "rolling_6m":     round(r["rolling_6m"], 3) if pd.notna(r["rolling_6m"]) else None,
            }
            for _, r in cs.iterrows()
        ]

        seasonal = cs.groupby("month")["mom_change_pct"].mean().reset_index()
        seasonal_dict[city] = [
            {"month": int(r["month"]), "avg_mom": round(r["mom_change_pct"], 3)}
            for _, r in seasonal.iterrows()
        ]

    return city_series, seasonal_dict
