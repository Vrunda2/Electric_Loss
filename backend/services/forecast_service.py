"""
forecast_service.py  — Enhanced version
Improvements over original:
  1. temp_mean added as Prophet external regressor (energy-temperature correlation is strong)
  2. UK bank holidays added as holiday calendar (reduces holiday-day forecast errors)
  3. Changepoint prior scale tuned to be less aggressive on short series
  4. Floor/cap added so predictions never go negative or implausibly high

Fix: uses actual DarkSky column names (temperaturehigh, temperaturelow) instead of temp_mean
"""

import pandas as pd
from sqlalchemy import text
from backend.config.database import get_engine


def _get_uk_holidays(start_year: int, end_year: int) -> pd.DataFrame:
    """Generate approximate UK bank holiday dates for Prophet."""
    holidays = []
    for year in range(start_year, end_year + 1):
        holidays += [
            (f"{year}-01-01", "New Years Day"),
            (f"{year}-12-25", "Christmas Day"),
            (f"{year}-12-26", "Boxing Day"),
        ]
    df = pd.DataFrame(holidays, columns=['ds', 'holiday'])
    df['ds'] = pd.to_datetime(df['ds'])
    return df


def get_forecast(household_id: str, days: int = 30):
    """
    Forecast energy consumption using Prophet with:
    - temp_mean (derived from temperaturehigh + temperaturelow) as external regressor
    - UK bank holidays
    - logistic growth (prevents negative predictions)
    """
    try:
        from prophet import Prophet
    except ImportError:
        return {"error": "Prophet not installed. Run: pip install prophet"}

    engine = get_engine()

    # Fetch energy + weather joined — using actual DarkSky column names
    query = text("""
        SELECT
            d.reading_date           AS ds,
            d.energy_sum             AS y,
            COALESCE((w.temperaturehigh + w.temperaturelow) / 2, 12.0) AS temp_mean
        FROM daily_energy d
        LEFT JOIN weather_daily w ON w.weather_date = d.reading_date
        WHERE d.household_id = :hid
          AND d.energy_sum IS NOT NULL
          AND d.energy_sum > 0
        ORDER BY d.reading_date
    """)
    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"hid": household_id})

    if len(df) < 30:
        return {"error": "Not enough data for forecasting (need at least 30 days)"}

    df['ds'] = pd.to_datetime(df['ds'])
    df['temp_mean'] = df['temp_mean'].fillna(df['temp_mean'].median())

    # Logistic growth requires cap/floor columns
    cap   = df['y'].quantile(0.99) * 1.5
    floor = 0.0
    df['cap']   = cap
    df['floor'] = floor

    # UK holidays for the training period + forecast horizon
    start_year = df['ds'].dt.year.min()
    end_year   = df['ds'].dt.year.max() + 2
    holidays   = _get_uk_holidays(start_year, end_year)

    # Build and fit model
    model = Prophet(
        growth='logistic',
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        holidays=holidays,
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10.0,
    )
    model.add_regressor('temp_mean')
    model.fit(df)

    # Build future dataframe — fill future temp with last 30-day average
    future = model.make_future_dataframe(periods=days)
    future['cap']   = cap
    future['floor'] = floor

    last_30_temp = df['temp_mean'].tail(30).mean()
    future['temp_mean'] = df.set_index('ds')['temp_mean'].reindex(future['ds']).values
    future['temp_mean'] = future['temp_mean'].fillna(last_30_temp)

    forecast    = model.predict(future)
    future_only = forecast.tail(days)[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]

    return [
        {
            "date":          row['ds'].date().isoformat(),
            "predicted_kwh": round(max(float(row['yhat']),       0.0), 4),
            "lower_bound":   round(max(float(row['yhat_lower']), 0.0), 4),
            "upper_bound":   round(max(float(row['yhat_upper']), 0.0), 4),
        }
        for _, row in future_only.iterrows()
    ]