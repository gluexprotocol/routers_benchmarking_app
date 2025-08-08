from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from .routers import analytics, benchmarks, health

app = FastAPI(
    title="GlueX - DEX Aggregator Benchmarking API",
    description="comprehensive services for benchmarking DEX aggregators and their performance",
    version="0.0.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health")
app.include_router(analytics.router, prefix="/analytics")
app.include_router(benchmarks.router, prefix="/benchmarks")

handler = Mangum(app)
