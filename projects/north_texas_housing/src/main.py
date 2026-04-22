# ── pipeline/main.py ──
# Entry point. Run this to regenerate ntx_data.json.
#
#   cd pipeline
#   python main.py

import json
import pandas as pd

from config        import OUTPUT_PATH
from geo           import build_geo_mappings
from redfin        import load_and_aggregate
from summary       import build_all_summaries
from timeline      import build_combined_timeline, build_county_timeline, build_city_series
from zip_drilldown import build_zip_drilldown, build_bedroom_data
from helpers       import clean_nan


def main():
    # 1. Geographic mappings
    zip_city, city_county, target_cities = build_geo_mappings()

    # 2. Load + aggregate Redfin data
    city_trend = load_and_aggregate(zip_city)

    # 3. City summaries + investment score
    summary, active_cities = build_all_summaries(target_cities, city_trend, city_county)

    # 4. Time-series structures
    combined_timeline             = build_combined_timeline(city_trend, active_cities)
    all_counties, county_timeline, county_summary = build_county_timeline(city_trend, city_county)
    city_series, seasonality      = build_city_series(city_trend, active_cities)

    # 5. ZIP drilldown + bedrooms
    zip_data                      = build_zip_drilldown(target_cities, city_county)
    bedroom_timeline, bedroom_summary = build_bedroom_data(target_cities)

    # 6. Write JSON
    output = {
        "source":            "Redfin Market Tracker + Zillow ZHVI (ZIP/bedrooms)",
        "last_updated":      pd.Timestamp.now().strftime("%Y-%m-%d"),
        "cities":            active_cities,
        "counties":          list(all_counties),
        "summary":           summary,
        "county_summary":    county_summary,
        "combined_timeline": combined_timeline,
        "county_timeline":   county_timeline,
        "city_series":       city_series,
        "seasonality":       seasonality,
        "city_county_map":   city_county,
        "bedroom_timeline":  bedroom_timeline,
        "bedroom_summary":   bedroom_summary,
        "zip_data":          zip_data,
    }

    with open(OUTPUT_PATH, "w") as f:
        json.dump(clean_nan(output), f)

    print(f"\n✅  Done! {len(active_cities)} cities · {len(combined_timeline)} months")
    print(f"    Output → {OUTPUT_PATH}\n")

    # Quick summary table
    print(f"{'City':<20} {'Value':>10}  {'YoY':>7}  {'DOM':>5}  {'Inv':>6}  {'Phase'}")
    print("-" * 75)
    for s in sorted(summary, key=lambda x: x["home_value"], reverse=True):
        dom = f"{s['median_dom']:.0f}d" if s.get("median_dom") else "—"
        inv = f"{s['inventory']:.0f}"   if s.get("inventory")  else "—"
        yoy = f"{s['yoy_change_pct']:+.1f}%" if s.get("yoy_change_pct") is not None else "—"
        print(f"  {s['city']:<18} ${s['home_value']:>9,.0f}  {yoy:>7}  {dom:>5}  {inv:>6}  {s['market_phase']}")


if __name__ == "__main__":
    main()
