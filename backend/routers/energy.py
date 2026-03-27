"""
energy.py  — Updated router
New endpoints added:
  GET /energy/household/{id}/cost          — daily cost estimates
  GET /energy/household/{id}/benchmark     — ACORN peer comparison
  GET /energy/efficiency                   — efficiency scores for all households
"""

from fastapi import APIRouter, Query, Depends
from typing import Optional
from backend.services.energy_service import (
    get_daily_energy,
    get_city_daily_summary,
    get_tariff_comparison,
    get_household_cost,
    get_household_benchmark,
    get_efficiency_scores,
)


router = APIRouter(prefix="/energy", tags=["Energy"])


# ── Existing endpoints (unchanged) ──────────────────────

@router.get("/household/{household_id}")
def household_energy(
    household_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """Get household energy data"""
    return get_daily_energy(household_id, start_date, end_date)


@router.get("/city/summary")
def city_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    return get_city_daily_summary(start_date, end_date)


@router.get("/tariff/comparison")
def tariff_comparison():
    return get_tariff_comparison()


# ── New endpoints ─────────────────────────────────────────

@router.get("/household/{household_id}/cost")
def household_cost(
    household_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Estimate daily and cumulative energy cost (£) for a household.
    Uses the household's tariff type and approximate UK rates.
    """
    return get_household_cost(household_id, start_date, end_date)


@router.get("/household/{household_id}/benchmark")
def household_benchmark(household_id: str):
    """
    Compare a household's average consumption against its ACORN peer group.
    Returns percentile rank, % above/below average, and group statistics.
    """
    return get_household_benchmark(household_id)


@router.get("/efficiency")
def efficiency_scores(limit: int = Query(500, le=5000)):
    """
    Efficiency score (0–100) for each household vs their ACORN group.
    100 = lowest consumer in the group, 0 = highest.
    """
    return get_efficiency_scores(limit)