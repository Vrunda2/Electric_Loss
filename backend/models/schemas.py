from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class HouseholdOut(BaseModel):
    household_id: str
    acorn_group: Optional[str]
    acorn_category: Optional[str]
    tariff_type: Optional[str]
    block_id: Optional[str]

class DailyEnergyOut(BaseModel):
    household_id: str
    reading_date: date
    energy_sum: Optional[float]
    energy_mean: Optional[float]
    energy_min: Optional[float]
    energy_max: Optional[float]
    energy_std: Optional[float]

class WeatherOut(BaseModel):
    weather_date: date
    temp_max: Optional[float]
    temp_min: Optional[float]
    temp_mean: Optional[float]
    humidity: Optional[float]
    wind_speed: Optional[float]
    cloud_cover: Optional[float]
    precip_probability: Optional[float]
    summary: Optional[str]
    icon: Optional[str]

class AnomalyOut(BaseModel):
    id: int
    household_id: str
    detected_at: datetime
    anomaly_type: str
    severity: str
    energy_value: Optional[float]
    expected_value: Optional[float]
    deviation_percent: Optional[float]
    is_resolved: bool

class ForecastOut(BaseModel):
    date: date
    predicted_kwh: float
    lower_bound: float
    upper_bound: float

class SummaryStats(BaseModel):
    total_households: int
    total_readings: int
    avg_daily_consumption: float
    total_anomalies: int
    date_range_start: Optional[date]
    date_range_end: Optional[date]