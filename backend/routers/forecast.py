from fastapi import APIRouter, Query
from backend.services.forecast_service import get_forecast

router = APIRouter(prefix="/forecast", tags=["Forecast"])

@router.get("/{household_id}")
def forecast_energy(household_id: str, days: int = Query(30, le=90)):
    return get_forecast(household_id, days)