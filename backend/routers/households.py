from fastapi import APIRouter, HTTPException, Query
from backend.services.energy_service import get_all_households, get_household_by_id

router = APIRouter(prefix="/households", tags=["Households"])

@router.get("/")
def list_households(limit: int = Query(100, le=1000), offset: int = 0):
    return get_all_households(limit, offset)

@router.get("/{household_id}")
def get_household(household_id: str):
    hh = get_household_by_id(household_id)
    if not hh:
        raise HTTPException(status_code=404, detail="Household not found")
    return hh