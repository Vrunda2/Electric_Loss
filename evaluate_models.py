import pandas as pd
import numpy as np
import os
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from prophet import Prophet
from backend.services.anomaly_service import detect_anomalies
from backend.config.database import get_engine
from sqlalchemy import text

# Disable logging to keep output clean
import logging
logging.getLogger('prophet').setLevel(logging.ERROR)
logging.getLogger('cmdstanpy').setLevel(logging.ERROR)

def evaluate_forecasting(household_id: str):
    """
    Backtests the model: trains on history and tests on the last 30 days.
    """
    print(f"\n--- 📈 Backtesting Forecast for Household: {household_id} ---")
    
    engine = get_engine()
    query = text("""
        SELECT reading_date AS ds, energy_sum AS y 
        FROM daily_energy 
        WHERE household_id = :hid 
        ORDER BY reading_date ASC 
    """)
    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"hid": household_id})
    
    if len(df) < 60:
        print(f"❌ Not enough data (Only {len(df)} rows). Need 60+.")
        return
    
    df['ds'] = pd.to_datetime(df['ds'])
    
    # Split: Train on everything but the last 15 days
    # (Using 15 instead of 30 for higher reliability on smaller datasets)
    test_size = 15
    train_df = df.iloc[:-test_size].copy()
    test_df  = df.iloc[-test_size:].copy()
    
    print(f"Training on {len(train_df)} days, Testing on {len(test_df)} days...")
    
    model = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
    model.fit(train_df)
    
    future = model.make_future_dataframe(periods=test_size)
    forecast = model.predict(future)
    
    # Get predictions for the test dates
    predictions = forecast.tail(test_size)[['ds', 'yhat']].copy()
    predictions['ds'] = pd.to_datetime(predictions['ds']).dt.date
    test_df['ds']      = pd.to_datetime(test_df['ds']).dt.date
    
    comparison = pd.merge(test_df, predictions, on='ds')
    
    y_true = comparison['y']
    y_pred = comparison['yhat']
    
    mae  = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2   = r2_score(y_true, y_pred)
    
    print(f"\n✅ METRICS FOR REPORT:")
    print(f"   MAE (Average Error):  {mae:.4f} kWh")
    print(f"   RMSE (Std Deviation): {rmse:.4f} kWh")
    print(f"   R2 Score (Quality):   {r2:.4f}")
    
    return {"mae": mae, "rmse": rmse, "r2": r2}

def evaluate_anomalies(household_id: str):
    """
    Checks the efficiency of the Isolation Forest.
    """
    print(f"\n--- 🔍 Anomaly Detection Performance ---")
    results = detect_anomalies(household_id, save_to_db=False)
    
    if not results:
        print("ℹ️ No anomalies found for this period.")
        return
        
    df = pd.DataFrame(results)
    avg_dev = df['deviation_percent'].mean()
    count = len(df)
    
    print(f"✅ Detection Stats:")
    print(f"   Total Detected:      {count}")
    print(f"   Avg Severity Score:  {df['severity'].value_counts().idxmax()}")
    print(f"   Avg Outlier Magnitude: {avg_dev:.2f}% above expected use")

if __name__ == "__main__":
    # We use a known household with data
    evaluate_forecasting("MAC000147")
    evaluate_anomalies("MAC000147")
