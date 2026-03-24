import pandas as pd
import os
from dotenv import load_dotenv
from backend.config.database import get_engine
load_dotenv()

def load_households():
    df = pd.read_csv(f"{os.getenv('DATA_PATH')}/informations_households.csv")
    
    # Rename to match your actual CSV columns
    df = df.rename(columns={
        'LCLid':        'household_id',
        'stdorToU':     'tariff_type',
        'Acorn':        'acorn_category',
        'Acorn_grouped':'acorn_group',
        'file':         'block_id'
    })
    
    df = df[['household_id', 'acorn_group', 'acorn_category', 'tariff_type', 'block_id']].drop_duplicates()
    df = df.dropna(subset=['household_id'])
    
    df.to_sql('households', get_engine(), if_exists='replace', index=False)
    print(f"✅ Loaded {len(df)} households")

if __name__ == "__main__":
    load_households()