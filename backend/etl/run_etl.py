"""
run_etl.py  — Enhanced version
Improvements:
  1. --incremental flag: skips full reload of daily_energy/halfhourly when True
  2. Data quality report printed after each step (row counts, null rates, date range)
  3. Individual step timing logged
  4. --steps flag lets you run only specific steps (e.g. --steps households weather)
"""

import sys, os, logging, time, argparse
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.config.database import test_connection, get_engine
from backend.etl.load_households import load_households
from backend.etl.load_weather import load_daily_weather, load_hourly_weather
from backend.etl.load_daily_energy import load_daily_energy
from backend.etl.load_halfhourly_energy import load_halfhourly_energy
from sqlalchemy import text

os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s  %(levelname)s  %(message)s',
    handlers=[
        logging.FileHandler('logs/etl.log'),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────
# Data quality report
# ─────────────────────────────────────────────────────────
def quality_report(table: str, date_col: str = None):
    """Print row count, null rate on energy_sum, and date range for a table."""
    engine = get_engine()
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()

            null_rate = None
            if table in ('daily_energy', 'halfhourly_energy'):
                col = 'energy_sum' if table == 'daily_energy' else 'energy_kwh'
                nulls = conn.execute(
                    text(f"SELECT COUNT(*) FROM {table} WHERE {col} IS NULL")
                ).scalar()
                null_rate = round((nulls / rows * 100), 2) if rows else 0

            date_range = ""
            if date_col:
                rng = conn.execute(
                    text(f"SELECT MIN({date_col}), MAX({date_col}) FROM {table}")
                ).fetchone()
                if rng and rng[0]:
                    date_range = f"  date: {rng[0]} → {rng[1]}"

        null_str = f"  nulls: {null_rate}%" if null_rate is not None else ""
        log.info(f"   {table}: {rows:,} rows{null_str}{date_range}")
    except Exception as e:
        log.warning(f"    Quality check failed for {table}: {e}")


# ─────────────────────────────────────────────────────────
# Incremental check helpers
# ─────────────────────────────────────────────────────────
def _table_has_data(table: str) -> bool:
    engine = get_engine()
    try:
        with engine.connect() as conn:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            return (count or 0) > 0
    except Exception:
        return False


# ─────────────────────────────────────────────────────────
# Step runners with timing
# ─────────────────────────────────────────────────────────
def run_step(name: str, fn, *args, **kwargs):
    log.info(f"\n{'='*50}")
    log.info(f"▶  Starting: {name}")
    t0 = time.time()
    try:
        fn(*args, **kwargs)
        elapsed = time.time() - t0
        log.info(f" Completed: {name}  ({elapsed:.1f}s)")
    except Exception as e:
        log.error(f" Failed: {name} — {e}")
        raise


# ─────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SmartGrid ETL pipeline")
    parser.add_argument(
        '--incremental', action='store_true',
        help='Skip tables that already have data (faster re-runs)'
    )
    parser.add_argument(
        '--steps', nargs='+',
        choices=['households', 'weather', 'daily', 'halfhourly', 'all'],
        default=['all'],
        help='Which steps to run (default: all)'
    )
    parser.add_argument(
        '--max-blocks', type=int, default=5,
        help='Max halfhourly CSV blocks to load (default: 5, use 0 for all)'
    )
    args = parser.parse_args()

    run_all    = 'all' in args.steps
    incremental = args.incremental
    max_blocks  = args.max_blocks if args.max_blocks > 0 else None

    if not test_connection():
        log.error(" Database connection failed — aborting")
        sys.exit(1)

    start = time.time()
    log.info(f"\n SmartGrid ETL starting  [incremental={incremental}]")

    # ── Households ──────────────────────────────────────
    if run_all or 'households' in args.steps:
        if incremental and _table_has_data('households'):
            log.info("⏭  households: skipped (data exists, incremental mode)")
        else:
            run_step("Load households", load_households)
        quality_report('households')

    # ── Weather ─────────────────────────────────────────
    if run_all or 'weather' in args.steps:
        if incremental and _table_has_data('weather_daily'):
            log.info("⏭  weather_daily: skipped (data exists, incremental mode)")
        else:
            run_step("Load daily weather", load_daily_weather)
            run_step("Load hourly weather", load_hourly_weather)
        quality_report('weather_daily', 'weather_date')

    # ── Daily energy ─────────────────────────────────────
    if run_all or 'daily' in args.steps:
        if incremental and _table_has_data('daily_energy'):
            log.info("⏭  daily_energy: skipped (data exists, incremental mode)")
        else:
            run_step("Load daily energy", load_daily_energy)
        quality_report('daily_energy', 'reading_date')

    # ── Half-hourly energy ───────────────────────────────
    if run_all or 'halfhourly' in args.steps:
        if incremental and _table_has_data('halfhourly_energy'):
            log.info("⏭  halfhourly_energy: skipped (data exists, incremental mode)")
        else:
            run_step(
                f"Load halfhourly energy (max_blocks={max_blocks or 'ALL'})",
                load_halfhourly_energy,
                max_blocks=max_blocks
            )
        quality_report('halfhourly_energy', 'reading_datetime')

    elapsed_total = time.time() - start
    log.info(f"\n ETL Done in {elapsed_total/60:.1f} mins")
    log.info("─" * 50)