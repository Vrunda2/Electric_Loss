import pandas as pd, os, glob
from dotenv import load_dotenv
from backend.config.database import get_engine
from tqdm import tqdm
load_dotenv()

def load_halfhourly_energy(max_blocks=None):
    files = sorted(glob.glob(f"{os.getenv('DATA_PATH')}/halfhourly_dataset/*.csv"))
    if max_blocks: files = files[:max_blocks]
    engine = get_engine()
    total = 0
    for f in tqdm(files, desc="Half-hourly blocks"):
        df = pd.read_csv(f)
        df.columns = df.columns.str.strip().str.lower()
        df = df.rename(columns={'lclid':'household_id','tstp':'reading_datetime','energy(kwh/hh)':'energy_kwh'})
        df['reading_datetime'] = pd.to_datetime(df['reading_datetime'], errors='coerce')
        df['energy_kwh'] = pd.to_numeric(df['energy_kwh'], errors='coerce')
        df = df.dropna().query("energy_kwh >= 0 and energy_kwh < 100")
        df[['household_id','reading_datetime','energy_kwh']].to_sql(
            'halfhourly_energy', engine, if_exists='append', index=False, chunksize=10000)
        total += len(df)
    print(f"✅ Half-hourly rows loaded: {total:,}")