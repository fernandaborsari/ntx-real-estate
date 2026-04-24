import pandas as pd
import json
import numpy as np

data_path = "/Users/Fernanda/Desktop/Portifolio/Imobiliaria/HOME_VALUES/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"
output_path = "/Users/Fernanda/Desktop/Portifolio/NTX_REAL_ESTATE_ANALYSIS/ntx-dashboard/public/ntx_data.json"

df = pd.read_csv(data_path)
id_vars = ["RegionID", "SizeRank", "RegionName", "RegionType", "StateName", "State", "City", "Metro", "CountyName"]
date_columns = [col for col in df.columns if col not in id_vars]

df_long = df.melt(id_vars=id_vars, value_vars=date_columns, var_name="date", value_name="home_value")
df_long["date"] = pd.to_datetime(df_long["date"])
df_long = df_long.dropna(subset=["home_value"])

# ── NTX city list with county mapping ──
target_cities = [
    "Prosper", "Celina", "Frisco", "Southlake", "Flower Mound",
    "McKinney", "Allen", "Melissa", "Rockwall", "Little Elm",
    "Plano", "Richardson", "Keller", "Carrollton", "Lewisville",
    "Denton", "Irving", "Arlington",
]

CITY_COUNTY = {
    "Allen":        "Collin County",
    "Arlington":    "Tarrant County",
    "Carrollton":   "Denton County",
    "Celina":       "Collin County",
    "Denton":       "Denton County",
    "Flower Mound": "Denton County",
    "Frisco":       "Collin County",
    "Irving":       "Dallas County",
    "Keller":       "Tarrant County",
    "Lewisville":   "Denton County",
    "Little Elm":   "Denton County",
    "McKinney":     "Collin County",
    "Melissa":      "Collin County",
    "Plano":        "Collin County",
    "Prosper":      "Collin County",
    "Richardson":   "Dallas County",
    "Rockwall":     "Rockwall County",
    "Southlake":    "Tarrant County",
}

df_ntx = df_long[
    (df_long["State"] == "TX") & (df_long["City"].isin(target_cities))
].copy()

city_trend = df_ntx.groupby(["date", "City"], as_index=False)["home_value"].mean()
city_trend = city_trend.sort_values(["City", "date"])
city_trend["date_str"] = city_trend["date"].dt.strftime("%Y-%m")

# ── Core metrics ──
city_trend["yoy_change_pct"] = city_trend.groupby("City")["home_value"].pct_change(periods=12) * 100
city_trend["mom_change_pct"] = city_trend.groupby("City")["home_value"].pct_change() * 100
city_trend["price_index"] = (
    city_trend["home_value"] / city_trend.groupby("City")["home_value"].transform("first")
) * 100
city_trend["month"] = city_trend["date"].dt.month

# Rolling averages (3m and 6m of MoM change)
city_trend["rolling_3m"] = city_trend.groupby("City")["mom_change_pct"].transform(
    lambda x: x.rolling(3, min_periods=2).mean()
)
city_trend["rolling_6m"] = city_trend.groupby("City")["mom_change_pct"].transform(
    lambda x: x.rolling(6, min_periods=3).mean()
)

# ── County-level aggregated timeline ──
county_trend = df_ntx.groupby(["date", "CountyName"], as_index=False)["home_value"].mean()
county_trend = county_trend.sort_values(["CountyName", "date"])
county_trend["date_str"] = county_trend["date"].dt.strftime("%Y-%m")
county_trend["yoy_change_pct"] = county_trend.groupby("CountyName")["home_value"].pct_change(periods=12) * 100
county_trend["price_index"] = (
    county_trend["home_value"] / county_trend.groupby("CountyName")["home_value"].transform("first")
) * 100

# ── Helpers ──
def cagr(series, years):
    s = series.dropna()
    if len(s) < years * 12:
        return None
    start = s.iloc[-(years * 12)]
    end = s.iloc[-1]
    if start <= 0:
        return None
    return round(((end / start) ** (1 / years) - 1) * 100, 2)

def max_drawdown(series):
    s = series.dropna()
    roll_max = s.cummax()
    drawdowns = (s - roll_max) / roll_max * 100
    return round(drawdowns.min(), 2)

def crisis_drawdown(series, dates, start, end):
    mask = (dates >= start) & (dates <= end)
    s = series[mask].dropna()
    if len(s) < 3:
        return None
    peak = s.max()
    after_peak = s[s.index >= s.idxmax()]
    trough = after_peak.min()
    return round((trough - peak) / peak * 100, 2)

def market_phase(mom_3m, yoy):
    """Classify market phase based on recent momentum."""
    if mom_3m is None or np.isnan(mom_3m):
        return "unknown"
    if mom_3m >= 0.4:
        return "hot"
    elif mom_3m >= 0.1:
        return "appreciating"
    elif mom_3m >= -0.1:
        if yoy is not None and not np.isnan(yoy) and yoy > 0:
            return "stable"
        return "stagnant"
    elif mom_3m >= -0.4:
        return "cooling"
    else:
        return "declining"

# ── Summary + advanced metrics per city ──
summary = []
for city in target_cities:
    cs = city_trend[city_trend["City"] == city].sort_values("date")
    if cs.empty:
        continue
    vals = cs["home_value"].reset_index(drop=True)
    dates = cs["date"].reset_index(drop=True)
    last = cs.iloc[-1]

    # Peak & trough (all time)
    peak_idx = vals.idxmax()
    peak_value = round(vals[peak_idx], 0)
    peak_date = dates[peak_idx].strftime("%Y-%m")

    # From ATH
    current_val = last["home_value"]
    from_peak_pct = round((current_val - peak_value) / peak_value * 100, 2)

    # Dollar changes
    def dollar_change(years):
        if len(vals) < years * 12:
            return None
        return round(vals.iloc[-1] - vals.iloc[-(years * 12)], 0)

    # Monthly volatility
    mom_returns = cs["mom_change_pct"].dropna()
    volatility = round(mom_returns.std(), 3)

    # Market phase (use last 3m rolling avg)
    last_rolling_3m = last["rolling_3m"] if pd.notna(last["rolling_3m"]) else None
    last_yoy = last["yoy_change_pct"] if pd.notna(last["yoy_change_pct"]) else None
    phase = market_phase(last_rolling_3m, last_yoy)

    # Months of consecutive growth / decline
    recent_mom = cs["mom_change_pct"].dropna().values[-12:]
    consecutive_positive = 0
    for v in reversed(recent_mom):
        if v > 0:
            consecutive_positive += 1
        else:
            break
    consecutive_negative = 0
    for v in reversed(recent_mom):
        if v < 0:
            consecutive_negative += 1
        else:
            break

    summary.append({
        "city": city,
        "county": CITY_COUNTY.get(city, ""),
        "home_value": round(current_val, 0),
        "price_index": round(last["price_index"], 2),
        "yoy_change_pct": round(last_yoy, 2) if last_yoy is not None else None,
        "mom_change_pct": round(last["mom_change_pct"], 3) if pd.notna(last["mom_change_pct"]) else None,
        "rolling_3m": round(last_rolling_3m, 3) if last_rolling_3m is not None else None,
        "rolling_6m": round(last["rolling_6m"], 3) if pd.notna(last["rolling_6m"]) else None,
        "cagr_5y": cagr(vals, 5),
        "cagr_10y": cagr(vals, 10),
        "cagr_20y": cagr(vals, 20),
        "volatility_monthly": volatility,
        "max_drawdown": max_drawdown(vals),
        "drawdown_gfc": crisis_drawdown(vals, dates, pd.Timestamp("2007-06"), pd.Timestamp("2012-12")),
        "drawdown_2022": crisis_drawdown(vals, dates, pd.Timestamp("2022-03"), pd.Timestamp("2024-06")),
        "peak_value": peak_value,
        "peak_date": peak_date,
        "from_peak_pct": from_peak_pct,
        "dollar_change_1y": dollar_change(1),
        "dollar_change_5y": dollar_change(5),
        "dollar_change_10y": dollar_change(10),
        "market_phase": phase,
        "consecutive_positive": int(consecutive_positive),
        "consecutive_negative": int(consecutive_negative),
    })

# ── Investment score ──
df_sum = pd.DataFrame(summary)
idx_min, idx_max = df_sum["price_index"].min(), df_sum["price_index"].max()
yoy_min, yoy_max = df_sum["yoy_change_pct"].min(), df_sum["yoy_change_pct"].max()
df_sum["growth_norm"] = (df_sum["price_index"] - idx_min) / (idx_max - idx_min)
df_sum["dip_norm"] = (yoy_max - df_sum["yoy_change_pct"]) / (yoy_max - yoy_min)
df_sum["investment_score"] = (df_sum["growth_norm"] * 0.5 + df_sum["dip_norm"] * 0.5).round(4)
summary = df_sum.drop(columns=["growth_norm", "dip_norm"]).to_dict(orient="records")
summary.sort(key=lambda x: x["investment_score"], reverse=True)

# ── Seasonality ──
seasonal_dict = {}
for city in target_cities:
    cs = city_trend[city_trend["City"] == city]
    if cs.empty:
        continue
    seasonal = cs.groupby("month")["mom_change_pct"].mean().reset_index()
    seasonal_dict[city] = [
        {"month": int(r["month"]), "avg_mom": round(r["mom_change_pct"], 3)}
        for _, r in seasonal.iterrows()
    ]

# ── Combined timeline ──
all_dates = sorted(city_trend["date_str"].unique())
active_cities = [s["city"] for s in summary]
combined = []
for d in all_dates:
    row = {"date": d}
    for city in active_cities:
        sub = city_trend[(city_trend["City"] == city) & (city_trend["date_str"] == d)]
        if not sub.empty:
            row[city] = round(sub.iloc[0]["home_value"], 0)
            row[f"{city}_index"] = round(sub.iloc[0]["price_index"], 2)
            yoy = sub.iloc[0]["yoy_change_pct"]
            row[f"{city}_yoy"] = round(yoy, 2) if pd.notna(yoy) else None
    combined.append(row)

# ── County timeline ──
all_counties = sorted(county_trend["CountyName"].unique())
county_dates = sorted(county_trend["date_str"].unique())
county_combined = []
for d in county_dates:
    row = {"date": d}
    for county in all_counties:
        sub = county_trend[(county_trend["CountyName"] == county) & (county_trend["date_str"] == d)]
        if not sub.empty:
            row[county] = round(sub.iloc[0]["home_value"], 0)
            yoy = sub.iloc[0]["yoy_change_pct"]
            row[f"{county}_yoy"] = round(yoy, 2) if pd.notna(yoy) else None
            row[f"{county}_index"] = round(sub.iloc[0]["price_index"], 2)
    county_combined.append(row)

# County summary
county_summary = []
for county in all_counties:
    cs = county_trend[county_trend["CountyName"] == county].sort_values("date")
    if cs.empty:
        continue
    last = cs.iloc[-1]
    yoy = last["yoy_change_pct"]
    county_summary.append({
        "county": county,
        "home_value": round(last["home_value"], 0),
        "price_index": round(last["price_index"], 2),
        "yoy_change_pct": round(yoy, 2) if pd.notna(yoy) else None,
    })

# ── City series ──
city_series = {}
for city in active_cities:
    rows = city_trend[city_trend["City"] == city].sort_values("date")
    city_series[city] = [
        {
            "date": r["date_str"],
            "home_value": round(r["home_value"], 0),
            "price_index": round(r["price_index"], 2),
            "yoy_change_pct": round(r["yoy_change_pct"], 2) if pd.notna(r["yoy_change_pct"]) else None,
            "mom_change_pct": round(r["mom_change_pct"], 3) if pd.notna(r["mom_change_pct"]) else None,
            "rolling_3m": round(r["rolling_3m"], 3) if pd.notna(r["rolling_3m"]) else None,
            "rolling_6m": round(r["rolling_6m"], 3) if pd.notna(r["rolling_6m"]) else None,
        }
        for _, r in rows.iterrows()
    ]

BASE_PATH = "/Users/Fernanda/Desktop/Portifolio/Imobiliaria/HOME_VALUES"

# ── ZIP drill-down ──
zip_data = {}
for city in target_cities:
    city_zips = df_ntx[df_ntx["City"] == city]["RegionName"].unique()
    city_zip_data = {}
    for zip_code in city_zips:
        zip_rows = df_ntx[df_ntx["RegionName"] == zip_code].copy()
        if zip_rows.empty:
            continue
        zip_trend = zip_rows.groupby("date", as_index=False)["home_value"].mean()
        zip_trend = zip_trend.sort_values("date")
        zip_trend["date_str"] = zip_trend["date"].dt.strftime("%Y-%m")
        zip_trend["yoy"] = zip_trend["home_value"].pct_change(periods=12) * 100
        zip_trend["price_index"] = (zip_trend["home_value"] / zip_trend["home_value"].iloc[0]) * 100

        vals = zip_trend["home_value"].reset_index(drop=True)
        last = zip_trend.iloc[-1]
        peak_idx = vals.idxmax()
        peak_val = round(vals[peak_idx], 0)
        peak_date = zip_trend["date_str"].iloc[peak_idx]
        from_peak = round((vals.iloc[-1] - peak_val) / peak_val * 100, 2)

        city_zip_data[str(int(zip_code))] = {
            "zip": str(int(zip_code)),
            "city": city,
            "county": CITY_COUNTY.get(city, ""),
            "current_value": round(last["home_value"], 0),
            "yoy_change_pct": round(last["yoy"], 2) if pd.notna(last["yoy"]) else None,
            "price_index": round(last["price_index"], 2),
            "peak_value": peak_val,
            "peak_date": peak_date,
            "from_peak_pct": from_peak,
            "cagr_10y": cagr(vals, 10),
            "cagr_5y": cagr(vals, 5),
            "timeline": [
                {
                    "date": r["date_str"],
                    "value": round(r["home_value"], 0),
                    "yoy": round(r["yoy"], 2) if pd.notna(r["yoy"]) else None,
                    "index": round(r["price_index"], 2),
                }
                for _, r in zip_trend.iterrows()
            ],
        }
    if city_zip_data:
        zip_data[city] = city_zip_data

print(f"ZIP drill-down: {sum(len(v) for v in zip_data.values())} ZIPs across {len(zip_data)} cities")

# ── Add bedroom data per ZIP ──
for br in [2, 3, 4, 5]:
    path = f"{BASE_PATH}/Zip_zhvi_bdrmcnt_{br}_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"
    df_br = pd.read_csv(path)
    id_v = ["RegionID","SizeRank","RegionName","RegionType","StateName","State","City","Metro","CountyName"]
    date_c = [c for c in df_br.columns if c not in id_v]
    df_br_long = df_br.melt(id_vars=id_v, value_vars=date_c, var_name="date", value_name="home_value")
    df_br_long["date"] = pd.to_datetime(df_br_long["date"])
    df_br_long = df_br_long.dropna(subset=["home_value"])
    ntx_br = df_br_long[(df_br_long["State"]=="TX") & (df_br_long["City"].isin(target_cities))].copy()

    for city in zip_data:
        for zip_code in zip_data[city]:
            zr = ntx_br[ntx_br["RegionName"] == int(zip_code)].sort_values("date")
            if zr.empty:
                continue
            zvals = zr["home_value"].reset_index(drop=True)
            last_val = zvals.iloc[-1]
            last_yoy = zr["home_value"].pct_change(periods=12).iloc[-1] * 100
            if "bedrooms" not in zip_data[city][zip_code]:
                zip_data[city][zip_code]["bedrooms"] = {}
            zip_data[city][zip_code]["bedrooms"][str(br)] = {
                "current_value": round(last_val, 0),
                "yoy_change_pct": round(last_yoy, 2) if pd.notna(last_yoy) else None,
                "cagr_10y": cagr(zvals, 10),
                "cagr_5y": cagr(zvals, 5),
                "timeline": [
                    {"date": r["date"].strftime("%Y-%m"), "value": round(r["home_value"], 0)}
                    for _, r in zr.iterrows()
                    if r["date"].day <= 15  # sample ~monthly
                ],
            }

print(f"ZIP bedroom data added.")

# ── Bedroom analysis ──
BEDROOMS = [1, 2, 3, 4, 5]

bedroom_timeline = {}   # {br: [{date, City1: val, ...}, ...]}
bedroom_summary  = {}   # {city: {br: {home_value, cagr_5y, cagr_10y, yoy}}}

for br in BEDROOMS:
    path = f"{BASE_PATH}/Zip_zhvi_bdrmcnt_{br}_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"
    df_br = pd.read_csv(path)
    id_v = ["RegionID","SizeRank","RegionName","RegionType","StateName","State","City","Metro","CountyName"]
    date_c = [c for c in df_br.columns if c not in id_v]

    df_br_long = df_br.melt(id_vars=id_v, value_vars=date_c, var_name="date", value_name="home_value")
    df_br_long["date"] = pd.to_datetime(df_br_long["date"])
    df_br_long = df_br_long.dropna(subset=["home_value"])

    ntx_br = df_br_long[(df_br_long["State"]=="TX") & (df_br_long["City"].isin(target_cities))].copy()
    if ntx_br.empty:
        continue

    trend = ntx_br.groupby(["date","City"], as_index=False)["home_value"].mean()
    trend = trend.sort_values(["City","date"])
    trend["date_str"] = trend["date"].dt.strftime("%Y-%m")
    trend["yoy"] = trend.groupby("City")["home_value"].pct_change(periods=12) * 100

    # Build timeline rows
    br_dates = sorted(trend["date_str"].unique())
    br_cities = sorted(trend["City"].unique())
    br_rows = []
    for d in br_dates:
        row = {"date": d}
        for city in br_cities:
            sub = trend[(trend["City"]==city) & (trend["date_str"]==d)]
            if not sub.empty:
                row[city] = round(sub.iloc[0]["home_value"], 0)
        br_rows.append(row)
    bedroom_timeline[str(br)] = br_rows

    # Per-city summary for this bedroom count
    for city in br_cities:
        cs = trend[trend["City"]==city].sort_values("date")
        if cs.empty:
            continue
        vals = cs["home_value"].reset_index(drop=True)
        last = cs.iloc[-1]
        if city not in bedroom_summary:
            bedroom_summary[city] = {}
        bedroom_summary[city][str(br)] = {
            "home_value": round(last["home_value"], 0),
            "yoy_change_pct": round(last["yoy"], 2) if pd.notna(last["yoy"]) else None,
            "cagr_5y": cagr(vals, 5),
            "cagr_10y": cagr(vals, 10),
        }

print(f"Bedrooms processed: {list(bedroom_timeline.keys())}")

output = {
    "cities": active_cities,
    "counties": all_counties,
    "summary": summary,
    "county_summary": county_summary,
    "combined_timeline": combined,
    "county_timeline": county_combined,
    "city_series": city_series,
    "seasonality": seasonal_dict,
    "city_county_map": CITY_COUNTY,
    "bedroom_timeline": bedroom_timeline,
    "bedroom_summary": bedroom_summary,
    "zip_data": zip_data,
}

def clean_nan(obj):
    """Recursively replace NaN/Inf with None for valid JSON."""
    if isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_nan(v) for v in obj]
    return obj

with open(output_path, "w") as f:
    json.dump(clean_nan(output), f)

print(f"Done! {len(active_cities)} cities, {len(combined)} months\n")
print(f"{'City':<20} {'Value':>10}  {'YoY':>7}  {'3m Avg':>7}  {'Phase':<14} {'County'}")
print("-" * 85)
for s in sorted(summary, key=lambda x: x['home_value'], reverse=True):
    print(
        f"  {s['city']:<18} ${s['home_value']:>9,.0f}  "
        f"{str(s['yoy_change_pct'])+('%' if s['yoy_change_pct'] else ''):>7}  "
        f"{str(s['rolling_3m'])+('%' if s['rolling_3m'] else ''):>7}  "
        f"{s['market_phase']:<14} {s['county']}"
    )
