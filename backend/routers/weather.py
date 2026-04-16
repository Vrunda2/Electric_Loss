from fastapi import APIRouter
from typing import Optional
from sqlalchemy import text
from backend.config.database import get_engine

from fastapi import Depends
from backend.auth.dependencies import get_current_user
router = APIRouter(prefix="/weather", tags=["Weather"], dependencies=[Depends(get_current_user)])

@router.get("/daily")
def daily_weather(start_date: Optional[str] = None, end_date: Optional[str] = None):
    engine = get_engine()
    query = "SELECT * FROM weather_daily WHERE 1=1"
    params = {}
    if start_date:
        query += " AND weather_date >= :start"
        params["start"] = start_date
    if end_date:
        query += " AND weather_date <= :end"
        params["end"] = end_date
    query += " ORDER BY weather_date"
    with engine.connect() as conn:
        result = conn.execute(text(query), params)
        return [dict(row._mapping) for row in result]