# 🏡 NTX Real Estate Market Analysis

> **End-to-end real estate analytics platform** — modular Python ETL pipeline + interactive React dashboard covering 76 cities across 5 North Texas counties.

---

## Overview

This project ingests publicly available data from **Redfin Market Tracker** and **Zillow ZHVI**, processes it through a modular Python ETL pipeline, and powers an interactive React dashboard with four analytical sections:

| Tab | What it answers |
|---|---|
| 📍 Market Pulse | Where are we now? Phase distribution, investment signals, city cards |
| 🏆 Performance | Where is the best return? Risk vs. return scatter, CAGR ranking |
| 🔍 Explore | Custom analysis — market metrics, ZIP drilldown, pivot table |
| 🔮 Forecast | Statistical price projections with 80% confidence intervals |

---

## Data Sources

| Source | File | Used for |
|---|---|---|
| [Redfin Market Tracker](https://www.redfin.com/news/data-center/) | `zip_code_market_tracker.tsv` | Sale prices, DOM, inventory, market velocity metrics |
| [Zillow ZHVI](https://www.zillow.com/research/data/) | `Zip_zhvi_*.csv` | ZIP → City mapping, bedroom-level pricing (1–5 BR) |

---

## ETL Pipeline (`src/`)

Fully modular — each file has a single responsibility:

```
src/
├── config.py        → File paths and constants
├── helpers.py       → CAGR, drawdown, market_phase, clean_nan
├── geo.py           → ZIP → City → County mapping (from Zillow)
├── redfin.py        → Load, filter and aggregate Redfin TSV by city
├── summary.py       → City-level KPIs + investment score
├── timeline.py      → Combined timeline, county series, seasonality
├── zip_drilldown.py → ZIP + bedroom breakdown (Zillow ZHVI)
└── main.py          → Orchestrates all steps → outputs ntx_data.json
```

### Run

```bash
cd src
python main.py
```

Output: `ntx_data.json` — static JSON consumed by the React dashboard. No backend required.

---

## Key Metrics Computed

| Metric | Description |
|---|---|
| **CAGR 5Y / 10Y** | Compound Annual Growth Rate |
| **Market Phase** | Hot · Appreciating · Recovering · Stable · Stagnant · Cooling · Declining |
| **Investment Score** | Composite: CAGR growth (50%) + dip opportunity (50%), normalized 0–100 |
| **Volatility** | Monthly standard deviation of price changes |
| **ATH Distance** | How far each city is from its all-time high price |
| **Price Projection** | CAGR-based forecast · 80% CI (volatility capped at 5% per Case-Shiller) |

---

## Notebooks (`notebooks/`)

| Notebook | Description |
|---|---|
| `01_zhvi_data_exploration.ipynb` | Initial Zillow data exploration and ZIP mapping validation |
| `02_north_texas_real_estate_analysis.ipynb` | Market analysis and visualization development |

---

## Tech Stack

**ETL:** Python · Pandas · NumPy  
**Dashboard:** React · Vite · Tailwind CSS · Recharts  
**Data:** Redfin Market Tracker · Zillow ZHVI (public datasets)

---

## Coverage

- **18 cities** — Collin, Denton, Tarrant, Dallas, Rockwall counties
- **169 months** of price history (Jan 2012 – Jan 2026)
- **ZIP code drilldown** per city with bedroom breakdown
- **5 bedroom tiers** (1–5 BR) via Zillow ZHVI

---

*Data sourced from Redfin and Zillow public research datasets. Used strictly for educational and portfolio purposes.*
