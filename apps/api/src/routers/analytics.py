from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from ..models import models
from ..core.database import get_db

router = APIRouter()


@router.get("/detailed-results")
def get_detailed_benchmark_results(
    run_id: Optional[int] = None,
    chain: Optional[str] = None,
    page: int = Query(1, ge=1, description="Page number (starts at 1)"),
    page_size: int = Query(
        50, ge=10, le=200, description="Items per page (10-200)"),
    db_session: Session = Depends(get_db)
):
    """Get detailed benchmark results with pagination"""

    # Determine which run to analyze
    if run_id:
        target_run = db_session.query(models.BenchmarkRun).filter(
            models.BenchmarkRun.id == run_id).first()
    else:
        target_run = db_session.query(models.BenchmarkRun).order_by(
            models.BenchmarkRun.id.desc()).first()

    if not target_run:
        return {"error": "No benchmark runs found"}

    # Get trades count for pagination (before applying limit/offset)
    trades_query = db_session.query(models.TradeResult).filter(
        models.TradeResult.run_id == target_run.id)
    if chain:
        trades_query = trades_query.filter(models.TradeResult.chain == chain)

    total_count = trades_query.count()

    if total_count == 0:
        return {
            "run_id": target_run.id,
            "run_date": target_run.start_time,
            "chain_filter": chain,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_items": 0,
                "total_pages": 0,
                "has_next": False,
                "has_prev": False
            },
            "results": []
        }

    # Apply pagination to query
    offset = (page - 1) * page_size
    trades = trades_query.offset(offset).limit(page_size).all()

    detailed_results = []

    for trade in trades:
        # Initialize the result record with trade data
        result_record = {
            "chain": trade.chain,
            "trading_pair": trade.pair,
            # Human-readable symbol (e.g., "USDC")
            "from_token": trade.from_token_symbol,
            # Human-readable symbol (e.g., "WETH")
            "to_token": trade.to_token_symbol,
            "from_address": trade.from_token,           # Contract address
            "to_address": trade.to_token,               # Contract address
            "amount_usd": trade.amount_usd,
            # Initialize provider times and outputs
            "gluex_time": None,
            "zerox_time": None,
            "odos_time": None,
            "enso_time": None,
            "1inch_time": None,
            "liqdswap_time": None,
            "gluex_output": None,
            "zerox_output": None,
            "odos_output": None,
            "enso_output": None,
            "1inch_output": None,
            "liqdswap_output": None,
        }

        # Process provider results
        valid_outputs = {}

        for provider_result in trade.provider_results:
            provider_name = provider_result.provider.lower()

            # Map provider names to standardized keys
            provider_key_map = {
                "gluex": "gluex",
                "0x": "zerox",
                "odos": "odos",
                "enso": "enso",
                "1inch": "1inch",
                "liqdswap": "liqdswap"
            }

            provider_key = provider_key_map.get(provider_name, provider_name)

            # Set response time
            result_record[f"{provider_key}_time"] = provider_result.elapsed_time

            # Set output amount (already formatted by the backend)
            if provider_result.output_amount and provider_result.status_code == 200:
                result_record[f"{provider_key}_output"] = provider_result.output_amount
                try:
                    valid_outputs[provider_result.provider] = float(
                        provider_result.output_amount)
                except (ValueError, TypeError):
                    # Skip invalid outputs
                    pass

        # Calculate winner and output differences
        if len(valid_outputs) > 1:
            winner_provider = max(valid_outputs.items(), key=lambda x: x[1])[0]
            result_record["winner"] = winner_provider
            sorted_outputs = sorted(valid_outputs.values(), reverse=True)
            output_diff = sorted_outputs[0] - sorted_outputs[1]
            result_record["output_diff"] = output_diff
            result_record["output_diff_usd"] = None
        elif len(valid_outputs) == 1:
            result_record["winner"] = list(valid_outputs.keys())[0]
            result_record["output_diff"] = 0
            result_record["output_diff_usd"] = 0
        else:
            result_record["winner"] = "All Error"
            result_record["output_diff"] = None
            result_record["output_diff_usd"] = None

        detailed_results.append(result_record)

    # Calculate pagination metadata
    total_pages = (total_count + page_size - 1) // page_size
    has_next = page < total_pages
    has_prev = page > 1

    return {
        "run_id": target_run.id,
        "run_date": target_run.start_time,
        "chain_filter": chain,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total_count,
            "total_pages": total_pages,
            "has_next": has_next,
            "has_prev": has_prev
        },
        "results": detailed_results
    }


@router.get("/win-rates")
def get_win_rates(
    chain: Optional[str] = None,
    run_id: Optional[int] = None,
    db_session: Session = Depends(get_db)
):
    """Get win rate analysis across all providers, optionally filtered by chain or run"""

    # Determine which run to analyze
    if run_id:
        target_run = db_session.query(models.BenchmarkRun).filter(
            models.BenchmarkRun.id == run_id).first()
    else:
        target_run = db_session.query(models.BenchmarkRun).order_by(
            models.BenchmarkRun.id.desc()).first()

    if not target_run:
        return {"error": "No benchmark runs found"}

    # Get trades, optionally filtered by chain
    trades_query = db_session.query(models.TradeResult).filter(
        models.TradeResult.run_id == target_run.id)
    if chain:
        trades_query = trades_query.filter(models.TradeResult.chain == chain)
    trades = trades_query.all()

    if not trades:
        return {"error": "No trades found for the specified criteria"}

    # Calculate analytics
    provider_stats = {}
    total_trades = len(trades)

    # Initialize provider stats
    for trade in trades:
        for result in trade.provider_results:
            if result.provider not in provider_stats:
                provider_stats[result.provider] = {
                    "total_quotes": 0,
                    "successful_quotes": 0,
                    "wins": 0,
                    "total_response_time": 0.0,
                    "error_count": 0
                }

    # Count participations and calculate response times
    for trade in trades:
        for result in trade.provider_results:
            provider_stats[result.provider]["total_quotes"] += 1

            if result.output_amount and result.status_code == 200:
                provider_stats[result.provider]["successful_quotes"] += 1
                provider_stats[result.provider]["total_response_time"] += result.elapsed_time or 0
            else:
                provider_stats[result.provider]["error_count"] += 1

    # Determine winners for each trade
    for trade in trades:
        valid_results = [
            r for r in trade.provider_results if r.output_amount and r.status_code == 200]
        if valid_results:
            # Find the provider with the highest output amount
            winner = max(valid_results, key=lambda x: float(
                x.output_amount) if x.output_amount else 0)
            provider_stats[winner.provider]["wins"] += 1

    # Calculate final metrics
    analytics = {}
    for provider, stats in provider_stats.items():
        analytics[provider] = {
            "total_quotes": stats["total_quotes"],
            "successful_quotes": stats["successful_quotes"],
            "error_count": stats["error_count"],
            "participation_rate": (stats["successful_quotes"] / total_trades * 100) if total_trades > 0 else 0,
            "win_rate": (stats["wins"] / stats["successful_quotes"] * 100) if stats["successful_quotes"] > 0 else 0,
            "average_response_time": (stats["total_response_time"] / stats["successful_quotes"]) if stats["successful_quotes"] > 0 else 0,
            "total_wins": stats["wins"]
        }

    return {
        "run_id": target_run.id,
        "run_date": target_run.start_time,
        "chain_filter": chain,
        "total_trades_analyzed": total_trades,
        "provider_analytics": analytics
    }


@router.get("/chain-performance")
def get_chain_performance(db_session: Session = Depends(get_db)):
    """Get performance breakdown by chain"""

    latest_run = db_session.query(models.BenchmarkRun).order_by(
        models.BenchmarkRun.id.desc()).first()
    if not latest_run:
        return {"error": "No benchmark runs found"}

    # Group trades by chain
    chains = db_session.query(models.TradeResult.chain).filter(
        models.TradeResult.run_id == latest_run.id).distinct().all()

    chain_analytics = {}
    for (chain_id,) in chains:
        chain_trades = db_session.query(models.TradeResult).filter(
            models.TradeResult.run_id == latest_run.id,
            models.TradeResult.chain == chain_id
        ).all()

        # Calculate chain-specific metrics
        total_trades = len(chain_trades)
        provider_wins = {}
        provider_participations = {}

        for trade in chain_trades:
            valid_results = [
                r for r in trade.provider_results if r.output_amount and r.status_code == 200]

            # Count participations
            for result in trade.provider_results:
                if result.provider not in provider_participations:
                    provider_participations[result.provider] = 0
                if result.output_amount and result.status_code == 200:
                    provider_participations[result.provider] += 1

            # Determine winner
            if valid_results:
                winner = max(valid_results, key=lambda x: float(
                    x.output_amount) if x.output_amount else 0)
                if winner.provider not in provider_wins:
                    provider_wins[winner.provider] = 0
                provider_wins[winner.provider] += 1

        chain_analytics[chain_id] = {
            "total_trades": total_trades,
            "provider_wins": provider_wins,
            "provider_participations": provider_participations
        }

    return {
        "run_id": latest_run.id,
        "run_date": latest_run.start_time,
        "chain_analytics": chain_analytics
    }


@router.get("/pair-analysis")
def get_pair_analysis(
    chain: Optional[str] = None,
    pair_name: Optional[str] = None,
    db_session: Session = Depends(get_db)
):
    """Get detailed analysis for specific trading pairs"""

    latest_run = db_session.query(models.BenchmarkRun).order_by(
        models.BenchmarkRun.id.desc()).first()
    if not latest_run:
        return {"error": "No benchmark runs found"}

    # Build query
    trades_query = db_session.query(models.TradeResult).filter(
        models.TradeResult.run_id == latest_run.id)
    if chain:
        trades_query = trades_query.filter(models.TradeResult.chain == chain)
    if pair_name:
        trades_query = trades_query.filter(
            models.TradeResult.pair == pair_name)

    trades = trades_query.all()

    if not trades:
        return {"error": "No trades found for the specified criteria"}

    pair_analytics = {}
    for trade in trades:
        pair_key = f"{trade.chain}_{trade.pair}"
        if pair_key not in pair_analytics:
            pair_analytics[pair_key] = {
                "chain": trade.chain,
                "pair": trade.pair,
                "from_token": trade.from_token,
                "to_token": trade.to_token,
                "trades": []
            }

        # Process each trade's results
        trade_data = {
            "amount_usd": trade.amount_usd,
            "input_amount": trade.input_amount,
            "provider_results": {}
        }

        valid_outputs = {}
        for result in trade.provider_results:
            trade_data["provider_results"][result.provider] = {
                "output_amount": result.output_amount,
                "elapsed_time": result.elapsed_time,
                "status_code": result.status_code,
                "error": result.error
            }

            if result.output_amount and result.status_code == 200:
                valid_outputs[result.provider] = float(result.output_amount)

        # Determine winner and calculate differences
        if valid_outputs:
            winner = max(valid_outputs.items(), key=lambda x: x[1])
            trade_data["winner"] = winner[0]
            trade_data["winning_amount"] = winner[1]

            # Calculate output differences
            sorted_outputs = sorted(valid_outputs.values(), reverse=True)
            if len(sorted_outputs) > 1:
                trade_data["output_diff"] = sorted_outputs[0] - \
                    sorted_outputs[1]
            else:
                trade_data["output_diff"] = 0

        pair_analytics[pair_key]["trades"].append(trade_data)

    return {
        "run_id": latest_run.id,
        "run_date": latest_run.start_time,
        "filters": {"chain": chain, "pair_name": pair_name},
        "pair_analytics": pair_analytics
    }


@router.get("/performance-summary")
def get_performance_summary(db_session: Session = Depends(get_db)):
    """Get comprehensive performance summary matching the original CSV structure"""

    latest_run = db_session.query(models.BenchmarkRun).order_by(
        models.BenchmarkRun.id.desc()).first()
    if not latest_run:
        return {"error": "No benchmark runs found"}

    # Get all trades for the latest run
    trades = db_session.query(models.TradeResult).filter(
        models.TradeResult.run_id == latest_run.id).all()

    summary_data = []
    for trade in trades:
        trade_summary = {
            "chain": trade.chain,
            "pair": trade.pair,
            "from_address": trade.from_token,
            "to_address": trade.to_token,
            "amount_usd": trade.amount_usd,
            "input_amount": trade.input_amount
        }

        # Add provider-specific data
        provider_data = {}
        valid_outputs = {}

        for result in trade.provider_results:
            provider_key = result.provider.lower().replace(" ", "_")
            provider_data[f"{provider_key}_status"] = result.status_code
            provider_data[f"{provider_key}_time"] = result.elapsed_time
            provider_data[f"{provider_key}_output"] = result.output_amount

            if result.output_amount and result.status_code == 200:
                valid_outputs[result.provider] = float(result.output_amount)

        # Calculate winner and differences
        if valid_outputs:
            winner = max(valid_outputs.items(), key=lambda x: x[1])
            provider_data["better_rate"] = winner[0]

            sorted_outputs = sorted(valid_outputs.values(), reverse=True)
            if len(sorted_outputs) > 1:
                provider_data["output_diff"] = sorted_outputs[0] - \
                    sorted_outputs[1]
            else:
                provider_data["output_diff"] = 0
        else:
            provider_data["better_rate"] = "All Error"
            provider_data["output_diff"] = None

        trade_summary.update(provider_data)
        summary_data.append(trade_summary)

    return {
        "run_id": latest_run.id,
        "run_date": latest_run.start_time,
        "total_trades": len(summary_data),
        "detailed_results": summary_data
    }
