"""
energy_service.py  — Enhanced version
New features added:
  1. get_household_cost()          — cost estimate from energy * tariff rate
  2. get_household_benchmark()     — compare a household vs ACORN-group peers
  3. get_efficiency_scores()       — 0–100 score per household vs group average
  4. get_weather_energy_correlation() — now returns scatter_data + pearson r
  5. All existing functions preserved with original signatures
"""

import time
from sqlalchemy import text
from backend.config.database import get_engine

# ─────────────────────────────────────────────────────────
# Simple in-memory cache
# ─────────────────────────────────────────────────────────
_cache = {}

def _get_cache(key, ttl=300):
    if key in _cache:
        if time.time() - _cache[key]['ts'] < ttl:
            return _cache[key]['data']
    return None

def _set_cache(key, data):
    _cache[key] = {'data': data, 'ts': time.time()}
    return data


# ─────────────────────────────────────────────────────────
# Tariff rates (pence per kWh)
# Approximate UK rates — adjust to match your dataset period
# ─────────────────────────────────────────────────────────
TARIFF_RATES = {
    'Std': 0.28,    # Standard tariff — flat rate (£0.28/kWh)
    'ToU': None,    # Time-of-Use — estimated below with peak/off-peak split
}
TOU_PEAK_RATE     = 0.38    # 07:00–21:00
TOU_OFFPEAK_RATE  = 0.15    # 21:00–07:00
TOU_PEAK_FRACTION = 0.56    # ~56% of daily energy is in peak hours (empirical)


def _effective_rate(tariff_type: str) -> float:
    """Return effective £/kWh rate for a tariff type."""
    if tariff_type == 'ToU':
        return TOU_PEAK_FRACTION * TOU_PEAK_RATE + (1 - TOU_PEAK_FRACTION) * TOU_OFFPEAK_RATE
    return TARIFF_RATES.get(tariff_type, 0.28)


# ─────────────────────────────────────────────────────────
# Households
# ─────────────────────────────────────────────────────────
def get_all_households(limit: int = 100, offset: int = 0):
    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM households LIMIT :limit OFFSET :offset"),
            {"limit": limit, "offset": offset}
        )
        return [dict(row._mapping) for row in result]


def get_household_by_id(household_id: str):
    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM households WHERE household_id = :hid"),
            {"hid": household_id}
        ).fetchone()
        return dict(result._mapping) if result else None


# ─────────────────────────────────────────────────────────
# Daily energy per household
# ─────────────────────────────────────────────────────────
def get_daily_energy(household_id: str, start_date: str = None, end_date: str = None):
    engine = get_engine()
    query = """
        SELECT household_id, reading_date, energy_sum, energy_mean,
               energy_min, energy_max, energy_std
        FROM daily_energy
        WHERE household_id = :hid
    """
    params = {"hid": household_id}
    if start_date:
        query += " AND reading_date >= :start"
        params["start"] = start_date
    if end_date:
        query += " AND reading_date <= :end"
        params["end"] = end_date
    query += " ORDER BY reading_date"

    with engine.connect() as conn:
        result = conn.execute(text(query), params)
        return [dict(row._mapping) for row in result]


# ─────────────────────────────────────────────────────────
# NEW: Cost estimation
# ─────────────────────────────────────────────────────────
def get_household_cost(household_id: str, start_date: str = None, end_date: str = None):
    """
    Estimate daily and cumulative energy cost (£) for a household.
    Uses tariff type from households table + rates defined above.
    """
    # Get household's tariff
    hh = get_household_by_id(household_id)
    if not hh:
        return {"error": "Household not found"}

    tariff_type = hh.get('tariff_type', 'Std')
    rate = _effective_rate(tariff_type)

    energy_data = get_daily_energy(household_id, start_date, end_date)
    if not energy_data:
        return {"error": "No energy data found"}

    cumulative = 0.0
    result = []
    for row in energy_data:
        daily_kwh  = row.get('energy_sum') or 0
        daily_cost = round(daily_kwh * rate, 4)
        cumulative = round(cumulative + daily_cost, 4)
        result.append({
            "reading_date":      str(row['reading_date']),
            "energy_kwh":        round(daily_kwh, 4),
            "rate_per_kwh":      rate,
            "daily_cost_gbp":    daily_cost,
            "cumulative_cost_gbp": cumulative,
            "tariff_type":       tariff_type,
        })

    total_kwh  = sum(r['energy_kwh'] for r in result)
    total_cost = round(total_kwh * rate, 2)

    return {
        "household_id":    household_id,
        "tariff_type":     tariff_type,
        "rate_per_kwh":    rate,
        "total_kwh":       round(total_kwh, 2),
        "total_cost_gbp":  total_cost,
        "avg_daily_cost_gbp": round(total_cost / len(result), 4) if result else 0,
        "daily":           result,
    }


# ─────────────────────────────────────────────────────────
# NEW: Peer benchmarking
# ─────────────────────────────────────────────────────────
def get_household_benchmark(household_id: str):
    """
    Compare a household's consumption against its ACORN-group peers.
    Returns percentile rank, % above/below group average, and peer stats.
    """
    cache_key = f"benchmark_{household_id}"
    cached = _get_cache(cache_key, ttl=600)
    if cached:
        return cached

    engine = get_engine()

    # Get the household's ACORN group
    hh = get_household_by_id(household_id)
    if not hh:
        return {"error": "Household not found"}
    acorn_group = hh.get('acorn_group')

    with engine.connect() as conn:
        # Household's own average
        own = conn.execute(text("""
            SELECT AVG(energy_sum) AS avg_kwh, COUNT(*) AS days
            FROM daily_energy
            WHERE household_id = :hid AND energy_sum IS NOT NULL
        """), {"hid": household_id}).fetchone()

        if not own or not own[0]:
            return {"error": "No energy data found for this household"}

        own_avg = float(own[0])

        # Peer group averages
        peer_rows = conn.execute(text("""
            SELECT d.household_id, AVG(d.energy_sum) AS avg_kwh
            FROM daily_energy d
            JOIN households h ON d.household_id = h.household_id
            WHERE h.acorn_group = :grp AND d.energy_sum IS NOT NULL
            GROUP BY d.household_id
        """), {"grp": acorn_group}).fetchall()

    if not peer_rows:
        return {"error": f"No peer data for ACORN group: {acorn_group}"}

    peer_avgs  = [float(r[1]) for r in peer_rows]
    group_mean = round(sum(peer_avgs) / len(peer_avgs), 4)
    group_median = round(sorted(peer_avgs)[len(peer_avgs) // 2], 4)

    # Percentile rank of this household within its group
    rank = sum(1 for p in peer_avgs if p < own_avg) / len(peer_avgs) * 100

    pct_vs_avg = round((own_avg - group_mean) / (group_mean + 1e-9) * 100, 1)
    label = "above" if pct_vs_avg > 0 else "below"

    data = {
        "household_id":    household_id,
        "acorn_group":     acorn_group,
        "own_avg_kwh":     round(own_avg, 4),
        "group_avg_kwh":   group_mean,
        "group_median_kwh":group_median,
        "group_min_kwh":   round(min(peer_avgs), 4),
        "group_max_kwh":   round(max(peer_avgs), 4),
        "peer_count":      len(peer_avgs),
        "percentile_rank": round(rank, 1),
        "pct_vs_group_avg": pct_vs_avg,
        "comparison_label": f"You use {abs(pct_vs_avg):.1f}% {label} your peer group average",
    }
    return _set_cache(cache_key, data)


# ─────────────────────────────────────────────────────────
# NEW: Efficiency scoring
# ─────────────────────────────────────────────────────────
def get_efficiency_scores(limit: int = 500):
    """
    Score households 0–100 based on consumption vs ACORN group average.
    100 = lowest consumer in group, 0 = highest.
    Cached 10 minutes — heavy JOIN.
    """
    cached = _get_cache("efficiency_scores", ttl=600)
    if cached:
        return cached

    engine = get_engine()
    query = text("""
        SELECT
            d.household_id,
            h.acorn_group,
            h.tariff_type,
            AVG(d.energy_sum) AS avg_kwh
        FROM daily_energy d
        JOIN households h ON d.household_id = h.household_id
        WHERE d.energy_sum IS NOT NULL
        GROUP BY d.household_id, h.acorn_group, h.tariff_type
        LIMIT :limit
    """)
    with engine.connect() as conn:
        import pandas as pd
        df = pd.read_sql(query, conn, params={"limit": limit})

    # Score within each ACORN group: 100 = min consumer, 0 = max consumer
    def score_group(g):
        mn, mx = g['avg_kwh'].min(), g['avg_kwh'].max()
        if mx == mn:
            g['efficiency_score'] = 50
        else:
            g['efficiency_score'] = ((mx - g['avg_kwh']) / (mx - mn) * 100).round(1)
        return g

    df = df.groupby('acorn_group', group_keys=False).apply(score_group)
    df['avg_kwh'] = df['avg_kwh'].round(4)

    data = df.sort_values('efficiency_score', ascending=False).to_dict(orient='records')
    return _set_cache("efficiency_scores", data)


# ─────────────────────────────────────────────────────────
# City daily summary — cached 5 min
# ─────────────────────────────────────────────────────────
def get_city_daily_summary(start_date: str = None, end_date: str = None):
    cache_key = f"city_v2_{start_date}_{end_date}"
    cached = _get_cache(cache_key, ttl=300)
    if cached is not None:
        return cached

    engine = get_engine()
    query_str = "SELECT * FROM city_daily_summary WHERE 1=1"
    params = {}
    if start_date:
        query_str += " AND reading_date >= :start"
        params["start"] = start_date
    if end_date:
        query_str += " AND reading_date <= :end"
        params["end"] = end_date
    query_str += " ORDER BY reading_date"

    with engine.connect() as conn:
        result = conn.execute(text(query_str), params)
        data = [dict(row._mapping) for row in result]

    return _set_cache(cache_key, data)


# ─────────────────────────────────────────────────────────
# Dashboard summary — cached 5 min
# ─────────────────────────────────────────────────────────
def get_dashboard_summary():
    cached = _get_cache("dashboard_v2", ttl=300)
    if cached is not None:
        return cached

    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(text("""
            SELECT
                SUM(active_households) AS total_readings,
                SUM(total_consumption) / SUM(active_households) AS avg_consumption,
                MIN(reading_date) AS date_start,
                MAX(reading_date) AS date_end
            FROM city_daily_summary
        """)).fetchone()

        households = conn.execute(text("SELECT COUNT(*) FROM households")).scalar()
        anomalies  = conn.execute(text("SELECT COUNT(*) FROM anomalies")).scalar()

    data = {
        "total_households":      int(households or 0),
        "total_readings":        int(row[0] or 0),
        "avg_daily_consumption": round(float(row[1] or 0), 4),
        "total_anomalies":       int(anomalies or 0),
        "date_range_start":      str(row[2]) if row[2] else "",
        "date_range_end":        str(row[3]) if row[3] else "",
    }
    return _set_cache("dashboard_v2", data)


# ─────────────────────────────────────────────────────────
# ACORN analytics — cached 10 min
# ─────────────────────────────────────────────────────────
def get_acorn_analytics():
    cached = _get_cache("acorn_v2", ttl=600)
    if cached is not None:
        return cached

    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM acorn_summary ORDER BY avg_daily_consumption DESC"))
        data = [dict(row._mapping) for row in result]
    return _set_cache("acorn_v2", data)


# ─────────────────────────────────────────────────────────
# Weather correlation — enhanced with scatter data + Pearson r
# ─────────────────────────────────────────────────────────
def get_weather_energy_correlation():
    cached = _get_cache("weather_corr_v2", ttl=600)
    if cached is not None:
        return cached

    engine = get_engine()
    query = text("""
        SELECT
            w.weather_date,
            (w.temperaturemax + w.temperaturemin) / 2 AS temp_mean,
            w.temperaturemin AS temp_min,
            w.temperaturemax AS temp_max,
            w.humidity,
            w.windspeed AS wind_speed,
            CASE WHEN w.preciptype = 'rain' THEN 1.0 ELSE 0.0 END AS precip_probability,
            ROUND(AVG(d.energy_sum), 4) AS avg_consumption
        FROM weather_daily w
        JOIN daily_energy d ON w.weather_date = d.reading_date
        WHERE d.energy_sum IS NOT NULL
        GROUP BY w.weather_date, w.temperaturemax, w.temperaturemin, w.humidity, w.windspeed, w.preciptype
        ORDER BY w.weather_date
    """)
    with engine.connect() as conn:
        import pandas as pd
        df = pd.read_sql(query, conn)

    if df.empty:
        return {"error": "No joined weather+energy data"}

    # Pearson r for each weather variable
    weather_vars = ['temp_mean', 'humidity', 'wind_speed', 'precip_probability']
    correlations = []
    for var in weather_vars:
        if var in df.columns and df[var].notna().sum() > 10:
            r = df[[var, 'avg_consumption']].dropna().corr().iloc[0, 1]
            r_rounded = round(float(r), 3)
            correlations.append({
                "variable":    var,
                "correlation": r_rounded,
                "strength":    "Strong" if abs(r_rounded) > 0.5 else "Moderate" if abs(r_rounded) > 0.3 else "Weak",
                "direction":   "Positive" if r_rounded > 0 else "Negative",
            })

    # Scatter data: temp_mean vs avg_consumption (sample max 500 points for performance)
    scatter_df = df[['temp_mean', 'avg_consumption']].dropna()
    if len(scatter_df) > 500:
        scatter_df = scatter_df.sample(500, random_state=42)

    data = {
        "correlations":  correlations,
        "scatter_data":  scatter_df.rename(columns={'avg_consumption': 'avg_consumption'}).to_dict(orient='records'),
        "data_points":   int(len(df)),
        "date_range": {
            "start": str(df['weather_date'].min()),
            "end":   str(df['weather_date'].max()),
        },
        "raw": df[['weather_date', 'temp_mean', 'humidity', 'wind_speed',
                   'precip_probability', 'avg_consumption']].to_dict(orient='records'),
    }
    return _set_cache("weather_corr_v2", data)


# ─────────────────────────────────────────────────────────
# Tariff comparison — cached 10 min
# ─────────────────────────────────────────────────────────
def get_tariff_comparison():
    cached = _get_cache("tariff_v2", ttl=600)
    if cached is not None:
        return cached

    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM tariff_summary"))
        data = [dict(row._mapping) for row in result]
    return _set_cache("tariff_v2", data)

    results = {}
    for d in d_rows:
        hid = str(d[0])
        tariff = tariffs.get(hid, "Unknown")
        reads = int(d[1]) if d[1] is not None else 0
        total = float(d[2]) if d[2] is not None else 0.0
        
        if tariff not in results:
            results[tariff] = {"tariff_type": tariff, "household_count": 0, "reads": 0, "total": 0.0}
            
        results[tariff]["household_count"] += 1
        results[tariff]["reads"] += reads
        results[tariff]["total"] += total

    final_data = []
    for t, s in results.items():
        avg = s["total"] / s["reads"] if s["reads"] > 0 else 0
        final_data.append({
            "tariff_type": t,
            "household_count": s["household_count"],
            "avg_daily_kwh": round(avg, 4),
            "total_kwh": round(s["total"], 2)
        })
    return _set_cache("tariff", final_data)