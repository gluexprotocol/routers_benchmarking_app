# Dex Aggregator Benchmarking

Benchmarking and comparing top DEX aggregators across multiple chains on the basis of price, speed and reliability

## Monorepo Overview

This repository contains a benchmarking suite for DEX aggregators. It enables automated, repeatable comparisons of aggregator performance across chains and providers

### Structure

- **`apps/api`** – FastAPI backend:

  - schedules and runs benchmark jobs (every 24h or on demand)
  - stores raw quotes, metadata, and analytics
  - serves API endpoints for win rates, participation, and trade details

- **`apps/web`** – Next.js frontend:
  - visualizes benchmark results by run, chain, and token pair
  - computes analytics server side (win rates, trade summaries)

---

## Scope & Roadmap

- **Initial Scope:** HyperEVM (chain ID 999) with GlueX and Liqdswap providers
- **Planned Expansion:** Support for additional chains (Arbitrum, Avalanche, Base, BNB, Ethereum, Gnosis, Optimism, Polygon, Sonic, Unichain, Solana) and providers (1inch, Odos, Bebop, Velora, 0x, Li.Fi, Bungee, Jumper, Enso)

---

## Features

- **Automated Multi Provider Quoting:** Concurrently fetches quotes for multiple token pairs and USD amounts
- **Configurable Chains and Tokens:** Easily add new chains and tokens - runner generates all pairs automatically
- **Provider Plugin Framework:** Add providers via a simple class with `get_quote` and metadata
- **Normalization and Pricing:** Standardizes input sizes using token prices and normalization tokens (USD equivalent)
- **Data Persistence:** Stores raw provider outputs, timings, errors and per trade winner and difference
- **Analytics API:** Exposes win rates, participation, response times, chain breakdowns and pair analysis

---

## Architecture

### High-Level Flow

1. **Runner (`apps/api/src/core/runner.py`):**

   - Iterates over configured chains and token pairs (excluding self pairs)
   - Sizes input amounts based on USD value and token price
   - Calls all supported providers concurrently for each trade
   - Persists trade and provider results
   - Computes winners and differences for summaries

2. **API (`apps/api`):**

   - Serves benchmark runs and analytics (win rates, detailed rows, chain and pair views)

3. **Web (`apps/web`):**
   - Reads from the same postgres database
   - Exposes cached, paginated API routes for the UI

---

## Data Model

Backed by Postgres (or SQLite for development environment). SQLAlchemy models are located in `apps/api/src/models/models.py`

**Schema Sketch:**

```sql
CREATE TABLE benchmark_runs (
    id SERIAL PRIMARY KEY,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time   TIMESTAMPTZ
);

CREATE TABLE trade_results (
    id SERIAL PRIMARY KEY,
    run_id INTEGER REFERENCES benchmark_runs(id),
    chain TEXT,
    pair TEXT,
    from_token TEXT,
    to_token TEXT,
    from_token_symbol TEXT,
    to_token_symbol TEXT,
    amount_usd DOUBLE PRECISION,
    input_amount TEXT
);

CREATE TABLE provider_results (
    id SERIAL PRIMARY KEY,
    trade_id INTEGER REFERENCES trade_results(id),
    provider TEXT,
    output_amount TEXT,
    elapsed_time DOUBLE PRECISION,
    status_code INTEGER,
    error TEXT,
    raw_response JSONB
);
```

---

## Configuration & Source Files

- **Chain and Token Config:** `apps/api/src/data/chain.py`
- **Trade Sizes:** `apps/api/src/data/amount.py`
- **Runner:** `apps/api/src/core/runner.py`
- **Database:** `apps/api/src/core/database.py`
- **Providers:** `apps/api/src/providers/*`
- **Web APIs:** `apps/web/src/app/api/benchmark/*`

---

## Definitions

### Analytics

All computed in `apps/api/src/routers/analytics.py` and `apps/web/src/app/api/benchmark/*`

- Participation Rate: `successful_quotes / (successful_quotes + error_count) * 100` (ie, % of quotes that returned a valid output for the trades it attempted)

- Win Rate: Among trades where the provider returned a valid output, % of trades where the provider’s output amount is strictly the highest

- Average Response Time: `sum(elapsed_time for successful quotes) / successful_quotes`

- Winner: Provider with the strictly highest `output_amount` for a given trade

---

## Getting Started

### Prerequisites

- [Node.js 20.x](https://nodejs.org/en/download/)
- [Yarn 1.x](https://classic.yarnpkg.com/en/docs/install/)
- [Python 3.11](https://www.python.org/downloads/release/python-3110/)
- [Poetry 1.6+](https://python-poetry.org/docs/#installation)
- [Postgres 14+](https://www.postgresql.org/download/)
- [Supabase (optional)](https://supabase.com/docs/guides/getting-started)

> The API will default to a local SQLite file if DATABASE_URL isn’t set

### API

```bash
cd apps/api

# Install dependencies
make install # or: poetry install

# Create .env (see template below)
cp src/providers/gluex/.env.example src/providers/gluex/.env
cp src/providers/liqdswap/.env.example src/providers/liqdswap/.env

# Initialize DB schema
make synchronise # or: poetry run python -c "from src.core.database import init_db; init_db()"

# Run the API server
make start
# FastAPI will run at http://0.0.0.0:8000
```

### Run benchmark

```bash
cd apps/api
make benchmark # -> runs scripts/run_automated_benchmark.py
```

### Web

```bash
cd apps/web

# Use Yarn (enforced)
yarn install

# Create .env

# Run dev server
yarn dev
# -> http://localhost:3000
```

### Environment Variables

#### API reference:

- `DATABASE_URL` — Postgres URL. If unset, uses `sqlite:///apps/api/src/benchmark.db`

GlueX provider (`apps/api/src/providers/gluex/config.py`):

- `GLUEX_API_KEY` — API key for GlueX Router API
- `GLUEX_URL` — Router endpoint (default: https://router.gluex.xyz/v1/quote)
- `GLUEX_UNIQUE_PID` — Partner/unique PID string

Liqdswap provider (`apps/api/src/providers/liqdswap/config.py`):

- `LIQDSWAP_URL` — Quote endpoint (default: https://api.liqd.ag/quote)

> The runner also calls the GlueX Exchange Rates API (public) at `https://exchange-rates.gluex.xyz`

#### Web reference:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (if using service role server side)

> The web server queries tables: `benchmark_runs`, `trade_results`, `provider_results`. Ensure your Supabase project contains these tables (see DDL above). If running Nextjs against the same DB as FastAPI, you can point Supabase to that instance

---

## Running Benchmarks

On demand: `make benchmark` (API app)

## Flow:

- Loads chain config (CHAIN_CONFIG) and trade sizes (TRADE_AMOUNTS)
- For each chain, builds all token pairs trading_token[i] → trading_token[j] (i != j)
- Sizes input amount for the given USD budget using the normalization token as USD proxy
- Queries all supported providers concurrently (ThreadPoolExecutor) for that trade
- Persists results, computes winner and differences

---

# Adding a New Chain

To add a new chain, update `CHAIN_CONFIG` in `apps/api/src/data/chain.py`:

1. **Add a dictionary entry** keyed by the chain's string ID. Example:

```python
CHAIN_CONFIG["<chain_id>"] = {
  "blockchain": "base",  # identifier for Exchange Rates API
  "normalization_token": {
   "address": "<USDC/USDe/...>",
   "symbol": "USDC",
   "decimals": 6
  },
  "trading_tokens": [
   { "address": "<WETH>", "symbol": "WETH", "decimals": 18 },
   { "address": "<USDC>", "symbol": "USDC", "decimals": 6 },
   # Add more tokens as needed
  ]
}
```

- `blockchain`: [identifier](https://router.gluex.xyz/liquidity/staging) for the chain
- `normalization_token`: USD equivalent token details (`address`, `symbol`, `decimals`)
- `trading_tokens`: List of tokens to benchmark (each with `address`, `symbol`, `decimals`)

2. **Declare provider support:**  
   Ensure each provider’s `supported_chains` includes the new chain ID (as a string)

3. **Run a benchmark:**  
   Execute `make benchmark` and verify that rows for the new chain appear.  
   The runner automatically builds all possible trading token pairs (excluding self swaps)

---

# Adding a New Provider

1. **Create a provider folder:**  
   Add a new folder under `apps/api/src/providers/<provider_name>/`.

2. **Implement the provider class:**  
   Inherit from `BaseProvider` and define:

- `name`: Provider name (string)
- `supported_chains`: List of supported chain IDs (strings)
- `get_quote(chain, from_token, to_token, from_amount, user_address)`:  
  Returns a dictionary:
  ```python
  {
   "name": "MyProvider",
   "output_amount": "<decimal string or None>",
   "elapsed_time": 0.123,            # seconds
   "status_code": 200,               # HTTP status
   "error": None or "<errmsg>",
   "raw_response": { ... }           # ideally JSON-compatible
  }
  ```
  - Convert raw output to a human readable decimal amount (not wei).  
    Use the shared `TOKEN_DECIMALS` mapping as needed

3. **Wire into the runner:**  
   Add your provider instance to `all_providers` in `apps/api/src/core/runner.py`:

   ```python
   all_providers = [
   GluexProvider(),
   LiqdswapProvider(),
   MyNewProvider(),    # <= add your provider here
   ]
   ```

4. **Environment configuration:**  
   If your provider requires secrets, add a `config.py` using `pydantic.BaseSettings` with an appropriate `env_prefix`

---

## Contributing

We welcome contributions for:

- New providers
- New chains or tokens
- New analytics features
- UI/UX improvements
- Performance and reliability fixes

## Development Workflow

1. **Fork the repository** and create a feature branch:  
   `feat/<provider-or-chain-name>`

2. **Add tests** where appropriate (eg: provider adapters)

3. **Run locally** and verify:

   - `make benchmark` completes successfully
   - `/analytics/*` endpoints return valid data
   - Web routes under `/api/benchmark/*` respond with non-empty payloads

4. **Open a Pull Request (PR):**
   - Clearly describe your changes, configuration additions and any new environment variables
   - Include sample responses or screenshots

## Style & Conventions

- **Python:**

  - Keep provider adapters self contained
  - Return formatted decimal output strings
  - Use timeouts (eg: `timeout=10`)

- **TypeScript:**

  - Avoid external state in API routes
  - Use chunked/paged DB queries to stay under PostgREST limits

- **Logging:**
  - Prefer structured prints for runner steps
  - Avoid leaking secrets

## Adding Tests (Suggested)

- Add unit tests for new provider adapters’ output normalization (eg: wei → decimals)
- Add integration tests for the runner with a mock provider to ensure persistence and analytics behave as expected

---

## FAQ

Q: Why a “normalization token”?
A: To size trades by USD, the runner needs a stable unit. Each chain specifies a USD equivalent token (eg: USDC/USDe). Input amounts are computed using current prices vs. that token

Q: What happens if a provider returns success but no output?
A: The trade is logged - provider’s `status_code` and error (if any) are stored. Such results are excluded from “valid output” comparisons

Q: How are ties handled?
A: A winner is counted only if strictly higher than second best. Equal outputs do not count as wins

Q: Can I benchmark non EVM chains?
A: The framework is EVM oriented today, but providers can extend `supported_chains` if they can quote on other networks and you supply a chain config + pricing path
