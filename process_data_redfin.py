import pandas as pd
import numpy as np
import json

# ── Paths ──
REDFIN_PATH = "/Users/Fernanda/Desktop/Portifolio/Imobiliaria/HOME_VALUES/zip_code_market_tracker.tsv"
ZILLOW_PATH = "/Users/Fernanda/Desktop/Portifolio/Imobiliaria/HOME_VALUES/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"
ZILLOW_BR_PATH = "/Users/Fernanda/Desktop/Portifolio/Imobiliaria/HOME_VALUES/Zip_zhvi_bdrmcnt_{br}_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"
OUTPUT_PATH = "/Users/Fernanda/Desktop/Portifolio/NTX_REAL_ESTATE_ANALYSIS/ntx-dashboard/public/ntx_data.json"

# ── Build ZIP → City mapping dynamically from Zillow ──
# Filter: Texas + NTX counties only
NTX_COUNTIES = {
    "Collin County", "Denton County", "Tarrant County",
    "Dallas County", "Rockwall County"
}

print("Building ZIP → City mapping from Zillow...")
df_zillow_meta = pd.read_csv(
    ZILLOW_PATH,
    usecols=["RegionName", "State", "City", "CountyName"],
    dtype=str,
)
df_zillow_meta = df_zillow_meta[
    (df_zillow_meta["State"] == "TX") &
    (df_zillow_meta["CountyName"].isin(NTX_COUNTIES)) &
    (df_zillow_meta["City"].notna()) &
    (df_zillow_meta["City"] != "")
]
ZIP_CITY = {
    str(int(float(row["RegionName"]))): row["City"]
    for _, row in df_zillow_meta.iterrows()
    if row["RegionName"].replace(".","").isdigit()
}

# Derive city → county from the same source
CITY_COUNTY = (
    df_zillow_meta[["City","CountyName"]]
    .drop_duplicates("City")
    .set_index("City")["CountyName"]
    .to_dict()
)

# Derive target cities list (preserve preferred order, add any new ones)
PREFERRED_ORDER = [
    "Prosper", "Celina", "Frisco", "Southlake", "Flower Mound",
    "McKinney", "Allen", "Melissa", "Rockwall", "Little Elm",
    "Plano", "Richardson", "Keller", "Carrollton", "Lewisville",
    "Denton", "Irving", "Arlington",
]
all_cities_in_data = sorted(set(ZIP_CITY.values()))
TARGET_CITIES = [c for c in PREFERRED_ORDER if c in all_cities_in_data] + \
                [c for c in all_cities_in_data if c not in PREFERRED_ORDER]

print(f"  {len(ZIP_CITY)} ZIPs mapped → {len(TARGET_CITIES)} cities")

target_zips = set(ZIP_CITY.keys())

# ── Helpers ──
def cagr(series, years):
    s = series.dropna()
    if len(s) < years * 12:
        return None
    start = s.iloc[-(years * 12)]
    end   = s.iloc[-1]
    if start <= 0:
        return None
    return round(((end / start) ** (1 / years) - 1) * 100, 2)

def max_drawdown(series):
    s = series.dropna()
    roll_max  = s.cummax()
    drawdowns = (s - roll_max) / roll_max * 100
    return round(drawdowns.min(), 2)

def crisis_drawdown(series, dates, start, end):
    mask = (dates >= start) & (dates <= end)
    s = series[mask].dropna()
    if len(s) < 3:
        return None
    peak        = s.max()
    after_peak  = s[s.index >= s.idxmax()]
    trough      = after_peak.min()
    return round((trough - peak) / peak * 100, 2)

def market_phase(mom_3m, yoy):
    if mom_3m is None or np.isnan(mom_3m):
        return "unknown"
    yoy_positive = yoy is not None and not np.isnan(yoy) and yoy > 0
    if mom_3m >= 0.4:
        # Very strong short-term momentum — only "hot" if YoY is also positive
        return "hot" if yoy_positive else "recovering"
    elif mom_3m >= 0.1:
        # Moderate positive momentum — only "appreciating" if YoY is also positive
        return "appreciating" if yoy_positive else "recovering"
    elif mom_3m >= -0.1:
        return "stable" if yoy_positive else "stagnant"
    elif mom_3m >= -0.4:
        return "cooling"
    else:
        return "declining"

def clean_nan(obj):
    if isinstance(obj, float):
        return None if (np.isnan(obj) or np.isinf(obj)) else obj
    if isinstance(obj, dict):  return {k: clean_nan(v) for k, v in obj.items()}
    if isinstance(obj, list):  return [clean_nan(v) for v in obj]
    return obj

# ════════════════════════════════════════
# 1. LOAD REDFIN DATA
# ════════════════════════════════════════
print("Loading Redfin TSV (this may take a minute)...")

cols_needed = [
    "PERIOD_BEGIN", "REGION", "PROPERTY_TYPE",
    "MEDIAN_SALE_PRICE", "MEDIAN_SALE_PRICE_MOM", "MEDIAN_SALE_PRICE_YOY",
    "MEDIAN_LIST_PRICE", "MEDIAN_PPSF", "MEDIAN_LIST_PPSF",
    "HOMES_SOLD", "PENDING_SALES", "NEW_LISTINGS",
    "INVENTORY", "MONTHS_OF_SUPPLY", "MEDIAN_DOM",
    "AVG_SALE_TO_LIST", "SOLD_ABOVE_LIST", "PRICE_DROPS",
    "OFF_MARKET_IN_TWO_WEEKS", "PARENT_METRO_REGION",
]

df_raw = pd.read_csv(
    REDFIN_PATH, sep="\t",
    usecols=cols_needed,
    dtype=str,
    low_memory=False,
)
print(f"  Loaded {len(df_raw):,} rows")

# Keep only Dallas metro, Single Family, our ZIPs
df_raw = df_raw[df_raw["PARENT_METRO_REGION"].str.strip('"').isin(["Dallas, TX", "Fort Worth, TX"])]
df_raw = df_raw[df_raw["PROPERTY_TYPE"].str.strip('"') == "Single Family Residential"]

# Extract ZIP code (REGION = '"Zip Code: 75034"')
df_raw["zip"] = df_raw["REGION"].str.extract(r'(\d{5})')
df_raw = df_raw[df_raw["zip"].isin(target_zips)].copy()

# Map to city
df_raw["city"] = df_raw["zip"].map(ZIP_CITY)
df_raw = df_raw.dropna(subset=["city"])

# Parse date → YYYY-MM
df_raw["date"] = pd.to_datetime(df_raw["PERIOD_BEGIN"].str.strip('"'), errors="coerce").dt.strftime("%Y-%m")
df_raw = df_raw.dropna(subset=["date"])

# Convert numeric columns
num_cols = [
    "MEDIAN_SALE_PRICE", "MEDIAN_SALE_PRICE_MOM", "MEDIAN_SALE_PRICE_YOY",
    "MEDIAN_LIST_PRICE", "MEDIAN_PPSF", "MEDIAN_LIST_PPSF",
    "HOMES_SOLD", "PENDING_SALES", "NEW_LISTINGS",
    "INVENTORY", "MONTHS_OF_SUPPLY", "MEDIAN_DOM",
    "AVG_SALE_TO_LIST", "SOLD_ABOVE_LIST", "PRICE_DROPS",
    "OFF_MARKET_IN_TWO_WEEKS",
]
for c in num_cols:
    df_raw[c] = pd.to_numeric(df_raw[c].str.strip('"'), errors="coerce")

df_raw = df_raw.dropna(subset=["MEDIAN_SALE_PRICE"])
print(f"  After filtering: {len(df_raw):,} rows | {df_raw['city'].nunique()} cities")

# ════════════════════════════════════════
# 2. AGGREGATE BY CITY + DATE (median across ZIPs)
# ════════════════════════════════════════
agg_funcs = {
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

city_trend = df_raw.groupby(["city", "date"]).agg(agg_funcs).reset_index()
city_trend = city_trend.rename(columns={"MEDIAN_SALE_PRICE": "home_value"})
city_trend = city_trend.sort_values(["city", "date"])

# Derived metrics
city_trend["mom_change_pct"] = city_trend.groupby("city")["home_value"].pct_change() * 100
city_trend["yoy_change_pct"] = city_trend.groupby("city")["home_value"].pct_change(periods=12) * 100
city_trend["price_index"]    = (
    city_trend["home_value"] /
    city_trend.groupby("city")["home_value"].transform("first")
) * 100
city_trend["month"] = pd.to_datetime(city_trend["date"]).dt.month
city_trend["rolling_3m"] = city_trend.groupby("city")["mom_change_pct"].transform(
    lambda x: x.rolling(3, min_periods=2).mean()
)
city_trend["rolling_6m"] = city_trend.groupby("city")["mom_change_pct"].transform(
    lambda x: x.rolling(6, min_periods=3).mean()
)

# ════════════════════════════════════════
# 3. SUMMARY PER CITY
# ════════════════════════════════════════
print("Building city summaries...")
summary = []
active_cities = []

for city in TARGET_CITIES:
    cs = city_trend[city_trend["city"] == city].sort_values("date")
    if cs.empty:
        print(f"  ⚠ No data for {city}")
        continue
    active_cities.append(city)

    vals  = cs["home_value"].reset_index(drop=True)
    dates = pd.to_datetime(cs["date"]).reset_index(drop=True)
    last  = cs.iloc[-1]

    peak_idx    = vals.idxmax()
    peak_value  = round(vals[peak_idx], 0)
    peak_date   = cs["date"].iloc[peak_idx]
    current_val = last["home_value"]
    from_peak   = round((current_val - peak_value) / peak_value * 100, 2)

    mom_returns = cs["mom_change_pct"].dropna()
    volatility  = round(mom_returns.std(), 3)

    last_3m  = last["rolling_3m"] if pd.notna(last["rolling_3m"]) else None
    last_yoy = last["yoy_change_pct"] if pd.notna(last["yoy_change_pct"]) else None
    phase    = market_phase(last_3m, last_yoy)

    recent_mom = cs["mom_change_pct"].dropna().values[-12:]
    cons_pos = cons_neg = 0
    for v in reversed(recent_mom):
        if v > 0: cons_pos += 1
        else: break
    for v in reversed(recent_mom):
        if v < 0: cons_neg += 1
        else: break

    def dollar_change(yrs):
        if len(vals) < yrs * 12: return None
        return round(vals.iloc[-1] - vals.iloc[-(yrs * 12)], 0)

    # Latest Redfin-specific metrics
    def last_val(col):
        v = last[col] if col in last.index else None
        return round(float(v), 2) if v is not None and pd.notna(v) else None

    summary.append({
        "city":               city,
        "county":             CITY_COUNTY.get(city, ""),
        "home_value":         round(current_val, 0),
        "price_index":        round(last["price_index"], 2),
        "yoy_change_pct":     round(last_yoy, 2) if last_yoy is not None else None,
        "mom_change_pct":     round(last["mom_change_pct"], 3) if pd.notna(last["mom_change_pct"]) else None,
        "rolling_3m":         round(last_3m, 3) if last_3m is not None else None,
        "rolling_6m":         round(last["rolling_6m"], 3) if pd.notna(last["rolling_6m"]) else None,
        "cagr_5y":            cagr(vals, 5),
        "cagr_10y":           cagr(vals, 10),
        "cagr_20y":           cagr(vals, 20),
        "volatility_monthly": volatility,
        "max_drawdown":       max_drawdown(vals),
        "drawdown_gfc":       crisis_drawdown(vals, dates, pd.Timestamp("2007-06"), pd.Timestamp("2012-12")),
        "drawdown_2022":      crisis_drawdown(vals, dates, pd.Timestamp("2022-03"), pd.Timestamp("2024-06")),
        "peak_value":         peak_value,
        "peak_date":          peak_date,
        "from_peak_pct":      from_peak,
        "dollar_change_1y":   dollar_change(1),
        "dollar_change_5y":   dollar_change(5),
        "dollar_change_10y":  dollar_change(10),
        "market_phase":       phase,
        "consecutive_positive": int(cons_pos),
        "consecutive_negative": int(cons_neg),
        # ── New Redfin metrics ──
        "median_list_price":       last_val("MEDIAN_LIST_PRICE"),
        "median_ppsf":             last_val("MEDIAN_PPSF"),
        "homes_sold":              last_val("HOMES_SOLD"),
        "pending_sales":           last_val("PENDING_SALES"),
        "new_listings":            last_val("NEW_LISTINGS"),
        "inventory":               last_val("INVENTORY"),
        "months_of_supply":        last_val("MONTHS_OF_SUPPLY"),
        "median_dom":              last_val("MEDIAN_DOM"),
        "avg_sale_to_list":        last_val("AVG_SALE_TO_LIST"),
        "sold_above_list":         last_val("SOLD_ABOVE_LIST"),
        "price_drops":             last_val("PRICE_DROPS"),
        "off_market_in_two_weeks": last_val("OFF_MARKET_IN_TWO_WEEKS"),
    })

# Investment score
df_sum = pd.DataFrame(summary)
idx_min, idx_max = df_sum["price_index"].min(), df_sum["price_index"].max()
yoy_min, yoy_max = df_sum["yoy_change_pct"].min(), df_sum["yoy_change_pct"].max()
df_sum["growth_norm"] = (df_sum["price_index"] - idx_min) / (idx_max - idx_min)
df_sum["dip_norm"]    = (yoy_max - df_sum["yoy_change_pct"]) / (yoy_max - yoy_min)
df_sum["investment_score"] = (df_sum["growth_norm"] * 0.5 + df_sum["dip_norm"] * 0.5).round(4)
summary = df_sum.drop(columns=["growth_norm", "dip_norm"]).to_dict(orient="records")
summary.sort(key=lambda x: x["investment_score"], reverse=True)

# ════════════════════════════════════════
# 4. COMBINED TIMELINE
# ════════════════════════════════════════
all_dates = sorted(city_trend["date"].unique())
combined  = []
for d in all_dates:
    row = {"date": d}
    for city in active_cities:
        sub = city_trend[(city_trend["city"] == city) & (city_trend["date"] == d)]
        if not sub.empty:
            r = sub.iloc[0]
            row[city]               = round(r["home_value"], 0)
            row[f"{city}_index"]    = round(r["price_index"], 2)
            yoy = r["yoy_change_pct"]
            row[f"{city}_yoy"]      = round(yoy, 2) if pd.notna(yoy) else None
    combined.append(row)

# ════════════════════════════════════════
# 5. COUNTY TIMELINE (aggregate cities)
# ════════════════════════════════════════
city_trend["county"] = city_trend["city"].map(CITY_COUNTY)
county_trend = city_trend.groupby(["county", "date"])["home_value"].mean().reset_index()
county_trend = county_trend.sort_values(["county", "date"])
county_trend["yoy_change_pct"] = county_trend.groupby("county")["home_value"].pct_change(periods=12) * 100
county_trend["price_index"]    = (
    county_trend["home_value"] /
    county_trend.groupby("county")["home_value"].transform("first")
) * 100

all_counties  = sorted(county_trend["county"].dropna().unique())
county_dates  = sorted(county_trend["date"].unique())
county_combined = []
for d in county_dates:
    row = {"date": d}
    for county in all_counties:
        sub = county_trend[(county_trend["county"] == county) & (county_trend["date"] == d)]
        if not sub.empty:
            r = sub.iloc[0]
            row[county]               = round(r["home_value"], 0)
            yoy = r["yoy_change_pct"]
            row[f"{county}_yoy"]      = round(yoy, 2) if pd.notna(yoy) else None
            row[f"{county}_index"]    = round(r["price_index"], 2)
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

# ════════════════════════════════════════
# 6. CITY SERIES + SEASONALITY
# ════════════════════════════════════════
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

# ════════════════════════════════════════
# 7. ZIP DRILLDOWN (keep using Zillow for granularity + bedrooms)
# ════════════════════════════════════════
print("Building ZIP drilldown from Zillow...")
df_z = pd.read_csv(ZILLOW_PATH)
id_vars  = ["RegionID","SizeRank","RegionName","RegionType","StateName","State","City","Metro","CountyName"]
date_cols = [c for c in df_z.columns if c not in id_vars]
df_z_long = df_z.melt(id_vars=id_vars, value_vars=date_cols, var_name="date", value_name="home_value")
df_z_long["date"] = pd.to_datetime(df_z_long["date"])
df_z_long = df_z_long.dropna(subset=["home_value"])
df_ntx = df_z_long[(df_z_long["State"] == "TX") & (df_z_long["City"].isin(TARGET_CITIES))].copy()

zip_data = {}
for city in TARGET_CITIES:
    city_zips = df_ntx[df_ntx["City"] == city]["RegionName"].unique()
    city_zip_data = {}
    for zc in city_zips:
        zr = df_ntx[df_ntx["RegionName"] == zc].copy()
        if zr.empty: continue
        zt = zr.groupby("date", as_index=False)["home_value"].mean()
        zt = zt.sort_values("date")
        zt["date_str"]   = zt["date"].dt.strftime("%Y-%m")
        zt["yoy"]        = zt["home_value"].pct_change(periods=12) * 100
        zt["price_index"]= (zt["home_value"] / zt["home_value"].iloc[0]) * 100
        vals = zt["home_value"].reset_index(drop=True)
        last = zt.iloc[-1]
        pi   = vals.idxmax()
        pv   = round(vals[pi], 0)
        pd_  = zt["date_str"].iloc[pi]
        fp   = round((vals.iloc[-1] - pv) / pv * 100, 2)
        city_zip_data[str(int(zc))] = {
            "zip": str(int(zc)), "city": city,
            "county": CITY_COUNTY.get(city, ""),
            "current_value": round(last["home_value"], 0),
            "yoy_change_pct": round(last["yoy"], 2) if pd.notna(last["yoy"]) else None,
            "price_index": round(last["price_index"], 2),
            "peak_value": pv, "peak_date": pd_, "from_peak_pct": fp,
            "cagr_10y": cagr(vals, 10), "cagr_5y": cagr(vals, 5),
            "timeline": [
                {"date": r["date_str"], "value": round(r["home_value"],0),
                 "yoy": round(r["yoy"],2) if pd.notna(r["yoy"]) else None,
                 "index": round(r["price_index"],2)}
                for _, r in zt.iterrows()
            ],
        }
    if city_zip_data:
        zip_data[city] = city_zip_data

print(f"  ZIP drilldown: {sum(len(v) for v in zip_data.values())} ZIPs across {len(zip_data)} cities")

# Bedroom data
print("Adding bedroom data from Zillow...")
for br in [2, 3, 4, 5]:
    path = ZILLOW_BR_PATH.format(br=br)
    df_br = pd.read_csv(path)
    id_v  = ["RegionID","SizeRank","RegionName","RegionType","StateName","State","City","Metro","CountyName"]
    date_c= [c for c in df_br.columns if c not in id_v]
    df_br_long = df_br.melt(id_vars=id_v, value_vars=date_c, var_name="date", value_name="home_value")
    df_br_long["date"] = pd.to_datetime(df_br_long["date"])
    df_br_long = df_br_long.dropna(subset=["home_value"])
    ntx_br = df_br_long[(df_br_long["State"]=="TX") & (df_br_long["City"].isin(TARGET_CITIES))].copy()
    for city in zip_data:
        for zc in zip_data[city]:
            zr = ntx_br[ntx_br["RegionName"] == int(zc)].sort_values("date")
            if zr.empty: continue
            zvals    = zr["home_value"].reset_index(drop=True)
            last_val = zvals.iloc[-1]
            last_yoy = zr["home_value"].pct_change(periods=12).iloc[-1] * 100
            if "bedrooms" not in zip_data[city][zc]:
                zip_data[city][zc]["bedrooms"] = {}
            zip_data[city][zc]["bedrooms"][str(br)] = {
                "current_value":  round(last_val, 0),
                "yoy_change_pct": round(last_yoy, 2) if pd.notna(last_yoy) else None,
                "cagr_10y": cagr(zvals, 10), "cagr_5y": cagr(zvals, 5),
                "timeline": [
                    {"date": r["date"].strftime("%Y-%m"), "value": round(r["home_value"],0)}
                    for _, r in zr.iterrows()
                ],
            }

# Bedroom timeline/summary
print("Building bedroom timeline...")
BEDROOMS = [1, 2, 3, 4, 5]
bedroom_timeline = {}
bedroom_summary  = {}
for br in BEDROOMS:
    path = ZILLOW_BR_PATH.format(br=br)
    df_br = pd.read_csv(path)
    id_v  = ["RegionID","SizeRank","RegionName","RegionType","StateName","State","City","Metro","CountyName"]
    date_c= [c for c in df_br.columns if c not in id_v]
    df_br_long = df_br.melt(id_vars=id_v, value_vars=date_c, var_name="date", value_name="home_value")
    df_br_long["date"] = pd.to_datetime(df_br_long["date"])
    df_br_long = df_br_long.dropna(subset=["home_value"])
    ntx_br = df_br_long[(df_br_long["State"]=="TX") & (df_br_long["City"].isin(TARGET_CITIES))].copy()
    if ntx_br.empty: continue
    trend  = ntx_br.groupby(["date","City"], as_index=False)["home_value"].mean()
    trend  = trend.sort_values(["City","date"])
    trend["date_str"] = trend["date"].dt.strftime("%Y-%m")
    trend["yoy"]      = trend.groupby("City")["home_value"].pct_change(periods=12) * 100
    br_dates  = sorted(trend["date_str"].unique())
    br_cities = sorted(trend["City"].unique())
    br_rows   = []
    for d in br_dates:
        row = {"date": d}
        for city in br_cities:
            sub = trend[(trend["City"]==city) & (trend["date_str"]==d)]
            if not sub.empty: row[city] = round(sub.iloc[0]["home_value"], 0)
        br_rows.append(row)
    bedroom_timeline[str(br)] = br_rows
    for city in br_cities:
        cs = trend[trend["City"]==city].sort_values("date")
        if cs.empty: continue
        vals = cs["home_value"].reset_index(drop=True)
        last = cs.iloc[-1]
        if city not in bedroom_summary: bedroom_summary[city] = {}
        bedroom_summary[city][str(br)] = {
            "home_value":     round(last["home_value"], 0),
            "yoy_change_pct": round(last["yoy"], 2) if pd.notna(last["yoy"]) else None,
            "cagr_5y":  cagr(vals, 5),
            "cagr_10y": cagr(vals, 10),
        }

# ════════════════════════════════════════
# 8. WRITE OUTPUT
# ════════════════════════════════════════
output = {
    "source":             "Redfin Market Tracker + Zillow ZHVI (ZIP/bedrooms)",
    "last_updated":       pd.Timestamp.now().strftime("%Y-%m-%d"),
    "cities":             active_cities,
    "counties":           all_counties,
    "summary":            summary,
    "county_summary":     county_summary,
    "combined_timeline":  combined,
    "county_timeline":    county_combined,
    "city_series":        city_series,
    "seasonality":        seasonal_dict,
    "city_county_map":    CITY_COUNTY,
    "bedroom_timeline":   bedroom_timeline,
    "bedroom_summary":    bedroom_summary,
    "zip_data":           zip_data,
}

with open(OUTPUT_PATH, "w") as f:
    json.dump(clean_nan(output), f)

print(f"\n✅ Done! {len(active_cities)} cities · {len(combined)} months · source: Redfin + Zillow")
print(f"\n{'City':<20} {'Value':>10}  {'YoY':>7}  {'DOM':>5}  {'Inv':>6}  {'Phase'}")
print("-" * 75)
for s in sorted(summary, key=lambda x: x["home_value"], reverse=True):
    dom = f"{s['median_dom']:.0f}d" if s.get("median_dom") else "—"
    inv = f"{s['inventory']:.0f}"   if s.get("inventory")  else "—"
    print(
        f"  {s['city']:<18} ${s['home_value']:>9,.0f}  "
        f"{str(round(s['yoy_change_pct'],1))+'%' if s['yoy_change_pct'] else '—':>7}  "
        f"{dom:>5}  {inv:>6}  {s['market_phase']}"
    )
