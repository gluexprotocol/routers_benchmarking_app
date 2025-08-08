import os

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker


# Postgres - Production
DATABASE_URL = os.getenv("DATABASE_URL")

print(f"Using DATABASE_URL: {DATABASE_URL}")

# SQLite - Development or When DATABASE_URL is not set
if not DATABASE_URL:
    db_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    if not os.path.exists(db_dir):
        os.makedirs(db_dir)

    db_path = os.path.join(db_dir, "benchmark.db")
    DATABASE_URL = f"sqlite:///{db_path}"


connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, **connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db():
    from ..models import models
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
