.PHONY: install start

install:
	poetry install

start:
	poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

synchronise:
	poetry run python -c "from src.core.database import init_db; init_db()"

benchmark:
	poetry run benchmark-run