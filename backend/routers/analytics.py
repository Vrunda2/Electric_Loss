from fastapi import APIRouter
from backend.services.energy_service import (
    get_acorn_analytics, get_weather_energy_correlation, get_dashboard_summary
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard")
def dashboard_summary():
    return get_dashboard_summary()

@router.get("/acorn")
def acorn_analytics():
    return get_acorn_analytics()

@router.get("/weather-correlation")
def weather_correlation():
    return get_weather_energy_correlation()