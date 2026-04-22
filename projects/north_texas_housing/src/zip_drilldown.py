# ── pipeline/zip_drilldown.py ──
# Builds ZIP-level drilldown data from Zillow ZHVI,
# including per-bedroom breakdowns.

import pandas as pd
from config import ZILLOW_PATH, ZILLOW_BR_PATH, BEDROOMS
from helpers import cagr


def _load_zillow_long(path: str, target_cities: list) -> pd.DataFrame:
    """Melt a Zillow wide CSV into a long (date, city, value) DataFrame."""
    df = pd.read_csv(path)
    id_vars   = ["RegionID","SizeRank","RegionName","RegionType",
                  "StateName","State","City","Metro","CountyName"]
    date_cols = [c for c in df.columns if c not in id_vars]
    df_long   = df.melt(id_vars=id_vars, value_vars=date_cols,
                        var_name="date", value_name="home_value")
    df_long["date"] = pd.to_datetime(df_long["date"])
    df_long = df_long.dropna(subset=["home_value"])
    return df_long[(df_long["State"] == "TX") & (df_long["City"].isin(target_cities))].copy()


def build_zip_drilldown(target_cities: list, city_county: dict) -> dict:
    """
    For each city, build a per-ZIP summary + monthly timeline.
    Then enrich each ZIP with bedroom-level data (2–5BR).

    Returns
    -------
    zip_data : dict[city, dict[zip_str, dict]]
    """
    print("Building ZIP drilldown from Zillow...")
    df_ntx = _load_zillow_long(ZILLOW_PATH, target_cities)

    zip_data: dict = {}

    for city in target_cities:
        city_zips     = df_ntx[df_ntx["City"] == city]["RegionName"].unique()
        city_zip_data = {}

        for zc in city_zips:
            zr = df_ntx[df_ntx["RegionName"] == zc].copy()
            if zr.empty:
                continue

            zt = zr.groupby("date", as_index=False)["home_value"].mean().sort_values("date")
            zt["date_str"]    = zt["date"].dt.strftime("%Y-%m")
            zt["yoy"]         = zt["home_value"].pct_change(periods=12) * 100
            zt["price_index"] = (zt["home_value"] / zt["home_value"].iloc[0]) * 100

            vals = zt["home_value"].reset_index(drop=True)
            last = zt.iloc[-1]
            pi   = vals.idxmax()
            pv   = round(vals[pi], 0)
            pd_  = zt["date_str"].iloc[pi]
            fp   = round((vals.iloc[-1] - pv) / pv * 100, 2)

            city_zip_data[str(int(zc))] = {
                "zip":            str(int(zc)),
                "city":           city,
                "county":         city_county.get(city, ""),
                "current_value":  round(last["home_value"], 0),
                "yoy_change_pct": round(last["yoy"], 2) if pd.notna(last["yoy"]) else None,
                "price_index":    round(last["price_index"], 2),
                "peak_value":     pv,
                "peak_date":      pd_,
                "from_peak_pct":  fp,
                "cagr_10y":       cagr(vals, 10),
                "cagr_5y":        cagr(vals, 5),
                "timeline": [
                    {
                        "date":  r["date_str"],
                        "value": round(r["home_value"], 0),
                        "yoy":   round(r["yoy"], 2) if pd.notna(r["yoy"]) else None,
                        "index": round(r["price_index"], 2),
                    }
                    for _, r in zt.iterrows()
                ],
            }

        if city_zip_data:
            zip_data[city] = city_zip_data

    total_zips = sum(len(v) for v in zip_data.values())
    print(f"  ZIP drilldown: {total_zips} ZIPs across {len(zip_data)} cities")

    # ── Bedroom enrichment (2–5BR) ──
    print("Adding bedroom data from Zillow...")
    for br in [2, 3, 4, 5]:
        path      = ZILLOW_BR_PATH.format(br=br)
        ntx_br    = _load_zillow_long(path, target_cities)

        for city in zip_data:
            for zc in zip_data[city]:
                zr = ntx_br[ntx_br["RegionName"] == int(zc)].sort_values("date")
                if zr.empty:
                    continue
                zvals    = zr["home_value"].reset_index(drop=True)
                last_val = zvals.iloc[-1]
                last_yoy = zr["home_value"].pct_change(periods=12).iloc[-1] * 100

                if "bedrooms" not in zip_data[city][zc]:
                    zip_data[city][zc]["bedrooms"] = {}

                zip_data[city][zc]["bedrooms"][str(br)] = {
                    "current_value":  round(last_val, 0),
                    "yoy_change_pct": round(last_yoy, 2) if pd.notna(last_yoy) else None,
                    "cagr_10y":       cagr(zvals, 10),
                    "cagr_5y":        cagr(zvals, 5),
                    "timeline": [
                        {"date": r["date"].strftime("%Y-%m"), "value": round(r["home_value"], 0)}
                        for _, r in zr.iterrows()
                    ],
                }

    return zip_data


def build_bedroom_data(target_cities: list) -> tuple[dict, dict]:
    """
    City-level bedroom timeline and summary (all bedrooms 1–5).

    Returns
    -------
    bedroom_timeline : dict[br_str, list[dict]]   date × city matrix per bedroom
    bedroom_summary  : dict[city, dict[br_str, dict]]
    """
    print("Building bedroom timeline...")
    bedroom_timeline: dict = {}
    bedroom_summary: dict  = {}

    for br in BEDROOMS:
        path   = ZILLOW_BR_PATH.format(br=br)
        ntx_br = _load_zillow_long(path, target_cities)
        if ntx_br.empty:
            continue

        trend = ntx_br.groupby(["date", "City"], as_index=False)["home_value"].mean()
        trend = trend.sort_values(["City", "date"])
        trend["date_str"] = trend["date"].dt.strftime("%Y-%m")
        trend["yoy"]      = trend.groupby("City")["home_value"].pct_change(periods=12) * 100

        br_dates  = sorted(trend["date_str"].unique())
        br_cities = sorted(trend["City"].unique())

        br_rows = []
        for d in br_dates:
            row = {"date": d}
            for city in br_cities:
                sub = trend[(trend["City"] == city) & (trend["date_str"] == d)]
                if not sub.empty:
                    row[city] = round(sub.iloc[0]["home_value"], 0)
            br_rows.append(row)
        bedroom_timeline[str(br)] = br_rows

        for city in br_cities:
            cs = trend[trend["City"] == city].sort_values("date")
            if cs.empty:
                continue
            vals = cs["home_value"].reset_index(drop=True)
            last = cs.iloc[-1]
            if city not in bedroom_summary:
                bedroom_summary[city] = {}
            bedroom_summary[city][str(br)] = {
                "home_value":     round(last["home_value"], 0),
                "yoy_change_pct": round(last["yoy"], 2) if pd.notna(last["yoy"]) else None,
                "cagr_5y":        cagr(vals, 5),
                "cagr_10y":       cagr(vals, 10),
            }

    return bedroom_timeline, bedroom_summary
