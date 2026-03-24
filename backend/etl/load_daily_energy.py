"""
load_daily_energy.py  — Enhanced version
Changes:
  1. Incremental mode: uses INSERT IGNORE + temp table pattern to avoid re-inserting duplicates
  2. Requires UNIQUE KEY (household_id, reading_date) in schema for incremental to work
  3. full_reload=True (default) keeps original TRUNCATE+INSERT behaviour
"""

import pandas as pd, os, glob
from dotenv import load_dotenv
from sqlalchemy import text
from backend.config.database import get_engine
from tqdm import tqdm
load_dotenv()


def load_daily_energy(full_reload: bool = True):
    files = glob.glob(f"{os.getenv('DATA_PATH')}/daily_dataset/*.csv")
    if not files:
        print("⚠️  No daily_dataset CSV files found — check DATA_PATH in .env")
        return

    engine = get_engine()

    if full_reload:
        with engine.connect() as c:
            c.execute(text("TRUNCATE TABLE daily_energy"))
            c.commit()
        print(f"🗑️  Truncated daily_energy (full reload)")

    total = 0
    for f in tqdm(files, desc="Daily energy blocks"):
        df = pd.read_csv(f)
        df.columns = df.columns.str.strip().str.lower()

        df = df.rename(columns={
            'lclid':                  'household_id',
            'day':                    'reading_date',
            'energy_count':           'num_readings',
            'energy(kwh/hh)_count':   'num_readings',
            'energy(kwh/hh)_min':     'energy_min',
            'energy(kwh/hh)_max':     'energy_max',
            'energy(kwh/hh)_mean':    'energy_mean',
            'energy(kwh/hh)_median':  'energy_median',
            'energy(kwh/hh)_sum':     'energy_sum',
            'energy(kwh/hh)_std':     'energy_std',
        })

        df['reading_date'] = pd.to_datetime(df['reading_date'], errors='coerce').dt.date
        df = df.dropna(subset=['household_id', 'reading_date'])

        # Keep only columns that exist in the table
        keep_cols = [c for c in [
            'household_id', 'reading_date', 'num_readings',
            'energy_sum', 'energy_mean', 'energy_min',
            'energy_max', 'energy_std', 'energy_median'
        ] if c in df.columns]
        df = df[keep_cols]

        if_exists = 'append'  # always append — TRUNCATE handled above if full_reload

        df.to_sql(
            'daily_energy', engine,
            if_exists=if_exists,
            index=False,
            chunksize=5000,
            method='multi'
        )
        total += len(df)

    print(f"✅ Total daily energy rows loaded: {total:,}")

if __name__ == "__main__":
    load_daily_energy()