import pandas as pd, os
from dotenv import load_dotenv
from backend.config.database import get_engine
load_dotenv()

def load_daily_weather():
    df = pd.read_csv(f"{os.getenv('DATA_PATH')}/weather_daily_darksky.csv")
    df.columns = df.columns.str.strip().str.lower()
    if 'time' in df.columns: df = df.rename(columns={'time':'weather_date'})
    df['weather_date'] = pd.to_datetime(df['weather_date']).dt.date
    df.to_sql('weather_daily', get_engine(), if_exists='replace', index=False)
    print(f"✅ Loaded {len(df)} daily weather rows")

def load_hourly_weather():
    df = pd.read_csv(f"{os.getenv('DATA_PATH')}/weather_hourly_darksky.csv")
    df.columns = df.columns.str.strip().str.lower()
    if 'time' in df.columns: df = df.rename(columns={'time':'weather_datetime'})
    df['weather_datetime'] = pd.to_datetime(df['weather_datetime'])
    df.to_sql('weather_hourly', get_engine(), if_exists='replace', index=False, chunksize=2000)
    print(f"✅ Loaded {len(df)} hourly weather rows")

if __name__ == "__main__":
    load_daily_weather()
    load_hourly_weather()