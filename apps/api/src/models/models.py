from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

from ..core.database import Base


class BenchmarkRun(Base):
    __tablename__ = 'benchmark_runs'

    id = Column(Integer, primary_key=True)

    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime)
    trades = relationship("TradeResult", back_populates="run")


class TradeResult(Base):
    __tablename__ = 'trade_results'

    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey('benchmark_runs.id'))

    chain = Column(String)
    pair = Column(String)
    from_token = Column(String)
    to_token = Column(String)
    from_token_symbol = Column(String)
    to_token_symbol = Column(String)
    amount_usd = Column(Float)
    input_amount = Column(String)

    run = relationship("BenchmarkRun", back_populates="trades")
    provider_results = relationship("ProviderResult", back_populates="trade")


class ProviderResult(Base):
    __tablename__ = 'provider_results'

    id = Column(Integer, primary_key=True)
    trade_id = Column(Integer, ForeignKey('trade_results.id'))

    provider = Column(String)
    output_amount = Column(String)
    elapsed_time = Column(Float)
    status_code = Column(Integer)
    error = Column(String, nullable=True)
    raw_response = Column(JSON)

    trade = relationship("TradeResult", back_populates="provider_results")
