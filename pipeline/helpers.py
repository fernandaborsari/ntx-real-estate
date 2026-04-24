# ── pipeline/helpers.py ──
# Pure functions: no I/O, no side effects.

import numpy as np


def cagr(series, years):
    """Compound Annual Growth Rate over `years` years."""
    s = series.dropna()
    if len(s) < years * 12:
        return None
    start = s.iloc[-(years * 12)]
    end   = s.iloc[-1]
    if start <= 0:
        return None
    return round(((end / start) ** (1 / years) - 1) * 100, 2)


def max_drawdown(series):
    """Worst peak-to-trough decline in the full series (%)."""
    s         = series.dropna()
    roll_max  = s.cummax()
    drawdowns = (s - roll_max) / roll_max * 100
    return round(drawdowns.min(), 2)


def crisis_drawdown(series, dates, start, end):
    """Peak-to-trough decline within a specific date window (%)."""
    import pandas as pd
    mask       = (dates >= start) & (dates <= end)
    s          = series[mask].dropna()
    if len(s) < 3:
        return None
    peak       = s.max()
    after_peak = s[s.index >= s.idxmax()]
    trough     = after_peak.min()
    return round((trough - peak) / peak * 100, 2)


def market_phase(mom_3m, yoy):
    """
    Classify market condition based on 3-month momentum and YoY change.

    Phases (best → worst):
      hot         strong short-term momentum + positive YoY
      appreciating moderate momentum + positive YoY
      recovering  positive momentum but still negative YoY
      stable      flat momentum + positive YoY
      stagnant    flat momentum + negative YoY
      cooling     mild decline
      declining   strong decline
      unknown     insufficient data
    """
    if mom_3m is None or np.isnan(mom_3m):
        return "unknown"
    yoy_positive = yoy is not None and not np.isnan(yoy) and yoy > 0
    if mom_3m >= 0.4:
        return "hot" if yoy_positive else "recovering"
    elif mom_3m >= 0.1:
        return "appreciating" if yoy_positive else "recovering"
    elif mom_3m >= -0.1:
        return "stable" if yoy_positive else "stagnant"
    elif mom_3m >= -0.4:
        return "cooling"
    else:
        return "declining"


def clean_nan(obj):
    """Recursively replace NaN/Inf with None for JSON serialisation."""
    if isinstance(obj, float):
        return None if (np.isnan(obj) or np.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_nan(v) for v in obj]
    return obj
