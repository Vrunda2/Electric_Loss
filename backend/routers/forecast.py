from fastapi import APIRouter, Query
from backend.services.forecast_service import get_forecast

from fastapi import Depends
from backend.auth.dependencies import get_current_user
router = APIRouter(prefix="/forecast", tags=["Forecast"], dependencies=[Depends(get_current_user)])

@router.get("/{household_id}")
def forecast_energy(household_id: str, days: int = Query(30, le=90)):
    return get_forecast(household_id, days)