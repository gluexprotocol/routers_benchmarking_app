from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..models import models
from ..core.database import get_db

router = APIRouter()


@router.get("/")
def get_all_runs(db_session: Session = Depends(get_db)):
    """Get all benchmark runs"""
    runs = db_session.query(models.BenchmarkRun).order_by(
        models.BenchmarkRun.id.desc()).all()

    return [
        {
            "id": run.id,
            "start_time": run.start_time,
            "end_time": run.end_time,
            "trade_count": len(run.trades)
        }
        for run in runs
    ]


@router.get("/{run_id}")
def get_run_details(run_id: int, db_session: Session = Depends(get_db)):
    """Get detailed information about a specific run"""
    run = db_session.query(models.BenchmarkRun).filter(
        models.BenchmarkRun.id == run_id).first()

    if not run:
        return {"error": "Run not found"}

    return {
        "id": run.id,
        "start_time": run.start_time,
        "end_time": run.end_time,
        "trades": [
            {
                "id": trade.id,
                "chain": trade.chain,
                "pair": trade.pair,
                "from_token": trade.from_token,
                "to_token": trade.to_token,
                "amount_usd": trade.amount_usd,
                "input_amount": trade.input_amount,
                "provider_results_count": len(trade.provider_results)
            }
            for trade in run.trades
        ]
    }
