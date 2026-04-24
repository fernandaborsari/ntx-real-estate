# ── pipeline/summary.py ──
# Builds the per-city summary row (latest snapshot + all KPIs).
# Also computes the normalised investment score across all cities.

import pandas as pd
import numpy as np
from helpers import cagr, max_drawdown, crisis_drawdown, market_phase


def build_city_summary(city: str, city_trend: pd.DataFrame, city_county: dict) -> dict | None:
    """
    Compute all KPIs for a single city from its time-series rows.
    Returns None if the city has no data.
    """
    cs = city_trend[city_trend["city"] == city].sort_values("date")
    if cs.empty:
        print(f"  ⚠ No data for {city}")
        return None

    vals  = cs["home_value"].reset_index(drop=True)
    dates = pd.to_datetime(cs["date"]).reset_index(drop=True)
    last  = cs.iloc[-1]

    # ATH metrics
    peak_idx   = vals.idxmax()
    peak_value = round(vals[peak_idx], 0)
    peak_date  = cs["date"].iloc[peak_idx]
    current    = last["home_value"]
    from_peak  = round((current - peak_value) / peak_value * 100, 2)

    # Volatility
    volatility = round(cs["mom_change_pct"].dropna().std(), 3)

    # Market phase
    last_3m  = last["rolling_3m"] if pd.notna(last["rolling_3m"]) else None
    last_yoy = last["yoy_change_pct"] if pd.notna(last["yoy_change_pct"]) else None
    phase    = market_phase(last_3m, last_yoy)

    # Consecutive positive / negative months
    recent_mom = cs["mom_change_pct"].dropna().values[-12:]
    cons_pos = cons_neg = 0
    for v in reversed(recent_mom):
        if v > 0: cons_pos += 1
        else: break
    for v in reversed(recent_mom):
        if v < 0: cons_neg += 1
        else: break

    def dollar_change(yrs):
        if len(vals) < yrs * 12:
            return None
        return round(vals.iloc[-1] - vals.iloc[-(yrs * 12)], 0)

    def last_val(col):
        v = last[col] if col in last.index else None
        return round(float(v), 2) if v is not None and pd.notna(v) else None

    return {
        "city":               city,
        "county":             city_county.get(city, ""),
        "home_value":         round(current, 0),
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
        # Redfin market metrics
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
    }


def build_all_summaries(target_cities: list, city_trend: pd.DataFrame, city_county: dict):
    """
    Build summary for every city and append the normalised investment score.

    Returns
    -------
    summary : list[dict]   sorted by investment_score desc
    active_cities : list[str]  cities that had data
    """
    print("Building city summaries...")
    summary       = []
    active_cities = []

    for city in target_cities:
        row = build_city_summary(city, city_trend, city_county)
        if row:
            summary.append(row)
            active_cities.append(city)

    # Investment score: normalised CAGR growth (50%) + dip opportunity (50%)
    df = pd.DataFrame(summary)
    idx_min, idx_max = df["price_index"].min(), df["price_index"].max()
    yoy_min, yoy_max = df["yoy_change_pct"].min(), df["yoy_change_pct"].max()

    df["growth_norm"] = (df["price_index"] - idx_min) / (idx_max - idx_min)
    df["dip_norm"]    = (yoy_max - df["yoy_change_pct"]) / (yoy_max - yoy_min)
    df["investment_score"] = (df["growth_norm"] * 0.5 + df["dip_norm"] * 0.5).round(4)

    summary = (
        df.drop(columns=["growth_norm", "dip_norm"])
        .sort_values("investment_score", ascending=False)
        .to_dict(orient="records")
    )

    return summary, active_cities
