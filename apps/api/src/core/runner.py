import concurrent.futures
import requests
import time

from datetime import datetime
from decimal import Decimal, getcontext, ROUND_DOWN

from ..core.database import get_db
from ..data.chain import CHAIN_CONFIG
from ..data.amount import TRADE_AMOUNTS
from ..models import BenchmarkRun, TradeResult, ProviderResult

from ..providers.gluex import GluexProvider
from ..providers.liqdswap import LiqdswapProvider

getcontext().prec = 28

# token-decimals mapping for quick lookup
TOKEN_DECIMALS = {}

for chain_id, chain_config in CHAIN_CONFIG.items():
    norm_token = chain_config["normalization_token"]
    TOKEN_DECIMALS[norm_token["address"].lower()] = norm_token["decimals"]
    for token in chain_config["trading_tokens"]:
        TOKEN_DECIMALS[token["address"].lower()] = token["decimals"]

print(
    f"🔧 DEBUG: Built TOKEN_DECIMALS mapping with {len(TOKEN_DECIMALS)} tokens"
)


def get_token_symbol_by_address(chain_id, token_address):
    """Get token symbol by address from chain config"""

    print(
        f"🔍 DEBUG: Looking up token symbol for {token_address} on chain {chain_id}"
    )

    chain_config = CHAIN_CONFIG.get(chain_id)
    if not chain_config:
        print(f"❌ DEBUG: No chain config found for chain {chain_id}")
        return "UNKNOWN"

    # check normalization token
    norm_token = chain_config["normalization_token"]
    if norm_token["address"].lower() == token_address.lower():
        print(f"✅ DEBUG: Found normalization token: {norm_token['symbol']}")
        return norm_token["symbol"]

    # check trading tokens
    for token in chain_config["trading_tokens"]:
        if token["address"].lower() == token_address.lower():
            print(f"✅ DEBUG: Found trading token: {token['symbol']}")
            return token["symbol"]

    print(
        f"❌ DEBUG: Token {token_address} not found in chain {chain_id} config"
    )

    return "UNKNOWN"


def get_token_price_in_usd(chain_id, token_address):
    """Get token price in USD using the chain's normalization token (USD equivalent) via exchange rates API"""

    chain_config = CHAIN_CONFIG.get(str(chain_id))

    if not chain_config:
        print(f"❌ DEBUG: No chain config found for chain {chain_id}")
        return None, 0

    blockchain_name = chain_config.get("blockchain")

    normalization_token = chain_config.get(
        "normalization_token", {}
    )  # the USD equivalent token
    usd_equivalent_token_address = normalization_token.get("address")

    if not blockchain_name or not usd_equivalent_token_address:
        print(
            f"❌ DEBUG: Missing blockchain name or USD equivalent token address for chain {chain_id}"
        )
        return None, 0

    # If the token to price is the USD equivalent token (normalization token), price is 1.0 USD
    if token_address.lower() == usd_equivalent_token_address.lower():
        print(
            f"✅ DEBUG: Token {token_address} is the USD equivalent token, price is 1.0"
        )
        return 1.0, 0.0

    url = "https://exchange-rates.gluex.xyz"
    print(f"🌐 DEBUG: Requesting price from: {url}")

    payload = [
        {
            "domestic_blockchain": blockchain_name,
            "domestic_token": token_address,
            "foreign_blockchain": blockchain_name,
            "foreign_token": usd_equivalent_token_address
        }
    ]

    start_time = time.time()

    try:
        print(
            f"📡 DEBUG: Making POST request to exchange rates API with payload: {payload}"
        )
        response = requests.post(url, json=payload, timeout=10)
        elapsed_time = time.time() - start_time

        print(
            f"📊 DEBUG: Response status: {response.status_code}, elapsed: {elapsed_time:.3f}s"
        )

        if response.status_code == 200:
            data = response.json()
            print(f"📄 DEBUG: Response data: {data}")

            if isinstance(data, list) and len(data) > 0 and "price" in data[0] and data[0]["price"] is not None:
                price = float(data[0]["price"])
                print(f"💰 DEBUG: Raw price from API: {price}")

                # normalize price based on decimal differences between USD token and target token
                token_decimals = TOKEN_DECIMALS.get(token_address.lower())

                usd_token_decimals = TOKEN_DECIMALS.get(
                    usd_equivalent_token_address.lower()
                )

                if token_decimals is None:
                    print(
                        f"❌ ERROR: Token {token_address} not found in TOKEN_DECIMALS mapping"
                    )
                    return None, elapsed_time
                if usd_token_decimals is None:
                    print(
                        f"❌ ERROR: USD token {usd_equivalent_token_address} not found in TOKEN_DECIMALS mapping"
                    )
                    return None, elapsed_time

                # calculate decimal adjustment factor
                decimal_adjustment = 10 ** (usd_token_decimals -
                                            token_decimals)

                # adjust price if there's a decimal difference
                if decimal_adjustment != 1:
                    adjusted_price = price / decimal_adjustment
                    print(
                        f"🔧 DEBUG: Adjusted token price from {price} to {adjusted_price} due to decimal difference"
                    )
                    return adjusted_price, elapsed_time

                print(f"💰 DEBUG: Final price: {price}")
                return price, elapsed_time
            else:
                print(
                    f"❌ DEBUG: Unexpected response format or no price data: {data}")
        else:
            print(
                f"❌ DEBUG: HTTP error {response.status_code}: {response.text[:200]}")

        print(
            f"Failed to get price for {token_address}: {response.status_code}"
        )

        return None, elapsed_time

    except Exception as e:
        elapsed_time = time.time() - start_time
        print(f"💥 DEBUG: Exception getting price for {token_address}: {e}")
        print(f"Error getting price for {token_address}: {e}")

        return None, elapsed_time


def calculate_input_amount(usd_amount, token_price_in_usd, token_decimals):
    """Calculate the input token amount based on USD amount and token price in USD"""

    try:
        if not token_price_in_usd or token_price_in_usd == 0:
            print(f"❌ DEBUG: Invalid token price: {token_price_in_usd}")
            return None

        print(
            f"🧮 DEBUG: Calculating input amount: ${usd_amount} / ${token_price_in_usd} price with {token_decimals} decimals"
        )

        # calculate token amount in decimal format
        token_amount = usd_amount / token_price_in_usd

        # convert to proper decimals (multiply by 10 ^ decimals)
        token_amount_with_decimals = int(token_amount * (10 ** token_decimals))
        print(
            f"✅ DEBUG: Calculated input token amount: {token_amount_with_decimals}"
        )

        return str(token_amount_with_decimals)

    except Exception as e:
        print(f"💥 DEBUG: Error calculating input amount: {e}")
        print(f"Error calculating input amount: {e}")

        return None


def generate_pairs_for_chain(chain_id):
    """Generate trading pairs for a specific chain"""

    print(f"🔗 DEBUG: Generating pairs for chain {chain_id}")
    chain_config = CHAIN_CONFIG.get(chain_id)

    if not chain_config:
        print(f"❌ DEBUG: No config for chain {chain_id}")
        return []

    normalization_token = chain_config["normalization_token"]
    trading_tokens = chain_config["trading_tokens"]

    print(f"🎯 DEBUG: Normalization token: {normalization_token['symbol']}")
    print(f"📊 DEBUG: Trading tokens: {[t['symbol'] for t in trading_tokens]}")

    pairs = []

    # create pairs: trading_token -> trading_token
    for i, token_in in enumerate(trading_tokens):
        for j, token_out in enumerate(trading_tokens):
            if i == j:
                # skip self pair
                continue
            pair_name = f"{token_in['symbol']}->{token_out['symbol']}"
            pairs.append({
                "name": pair_name,
                "input_token_address": token_in["address"],
                "output_token_address": token_out["address"]
            })
            print(f"🔁 DEBUG: Created pair: {pair_name}")

    print(f"✅ DEBUG: Generated {len(pairs)} pairs total")
    return pairs


def get_all_token_pairs(chain_id):
    """Get all token pairs for a chain"""

    try:
        pairs = generate_pairs_for_chain(chain_id)

        if not pairs:
            print(f"No pairs generated for chain {chain_id}")
            return []

        print(f"Generated {len(pairs)} pairs for chain {chain_id}")
        return pairs

    except Exception as e:
        print(f"Error generating pairs for chain {chain_id}: {e}")
        return []


def run_benchmark_for_all_chains():
    """Run benchmark for all chains in a single benchmark run"""

    print("🚀 Starting benchmark run...")

    db_session = next(get_db())

    try:
        # create ONE run for all chains
        run = BenchmarkRun(start_time=datetime.utcnow())

        db_session.add(run)
        db_session.flush()  # get the ID without committing

        print(f"✅ Created benchmark run #{run.id}")

        chains = list(CHAIN_CONFIG.keys())
        total_chains = len(chains)

        for idx, chain_id in enumerate(chains, 1):
            print(
                f"\n📊 [{idx}/{total_chains}] Running benchmark for chain {chain_id}..."
            )

            try:
                run_benchmark_single_chain(chain_id, run, db_session)
                print(
                    f"✅ [{idx}/{total_chains}] Completed benchmark for chain {chain_id}"
                )

            except Exception as e:
                # Continue with other chains even if one fails
                print(f"❌ [{idx}/{total_chains}] Error in chain {chain_id}: {e}")

        # update run end time and commit everything at once
        run.end_time = datetime.utcnow()
        db_session.commit()
        print(f"\n🎉 Benchmark run #{run.id} completed!")

        return run.id

    except Exception as e:
        print(f"💥 Critical error in benchmark run: {e}")
        db_session.rollback()
        raise
    finally:
        db_session.close()


def run_benchmark_single_chain(chain_id: str, benchmark_run, db_session, pairs=None):
    """Run benchmark for a single chain using an existing benchmark run"""

    print(f"🔗 DEBUG: Starting benchmark for chain {chain_id}")

    # available providers
    all_providers = [
        GluexProvider(),
        LiqdswapProvider()
    ]

    # filter providers based on chain support
    providers = [
        provider for provider in all_providers if provider.supports_chain(chain_id)
    ]

    if not providers:
        print(f"⚠️  No providers support chain {chain_id}")
        return

    provider_names = [provider.name for provider in providers]
    print(f"🔗 Chain {chain_id}: Using providers: {', '.join(provider_names)}")

    token_pairs = get_all_token_pairs(chain_id) if pairs is None else pairs

    # batch objects to be inserted
    trade_results_to_insert = []
    provider_results_to_insert = []

    for pair in token_pairs:
        print(f"\nProcessing pair {pair['name']} on {chain_id}")

        # get input token price in USD (via normalization token)
        print(
            f"💰 DEBUG: Getting input token price for {pair['input_token_address']}"
        )

        input_token_price, input_time = get_token_price_in_usd(
            chain_id, pair["input_token_address"]
        )

        if not input_token_price:
            print(
                f"Failed to get price for {pair['input_token_address']} in USD"
            )
            continue

        # get output token price in USD (for calculating USD differences)
        print(
            f"💰 DEBUG: Getting output token price for {pair['output_token_address']}"
        )
        output_token_price, output_time = get_token_price_in_usd(
            chain_id, pair["output_token_address"]
        )
        if not output_token_price:
            print(
                f"Failed to get price for {pair['output_token_address']} in USD"
            )
            continue

        exchange_rates_time = input_time + output_time

        for amount in TRADE_AMOUNTS:
            print(f"  Testing ${amount['usd']} trade...")

            # calculate proper input amount based on USD amount and token decimals
            input_decimals = TOKEN_DECIMALS.get(
                pair["input_token_address"].lower()
            )
            if input_decimals is None:
                print(
                    f"❌ ERROR: Input token {pair['input_token_address']} not found in TOKEN_DECIMALS mapping"
                )
                continue
            token_amount = calculate_input_amount(
                amount["usd"], input_token_price, input_decimals
            )
            if not token_amount:
                continue

            # get token symbols for the new database schema
            input_token_symbol = get_token_symbol_by_address(
                chain_id, pair["input_token_address"]
            )

            output_token_symbol = get_token_symbol_by_address(
                chain_id, pair["output_token_address"]
            )

            print(
                f"💾 DEBUG: Creating TradeResult with symbols: {input_token_symbol} -> {output_token_symbol}"
            )

            human_amount = Decimal(token_amount) / \
                (Decimal(10) ** input_decimals)

            formatted_amount = human_amount.quantize(
                Decimal("0.00000001"), rounding=ROUND_DOWN)

            # create trade result object but don't insert yet
            trade_result = TradeResult(
                run_id=benchmark_run.id,
                chain=chain_id,
                pair=pair["name"],
                from_token=pair["input_token_address"],
                to_token=pair["output_token_address"],
                from_token_symbol=input_token_symbol,
                to_token_symbol=output_token_symbol,
                amount_usd=amount["usd"],
                input_amount=str(formatted_amount)
            )

            print(
                f"📦 DEBUG: Created TradeResult: {trade_result.input_amount} {trade_result.from_token_symbol} -> {trade_result.to_token_symbol}"
            )

            # add to session and flush to get the ID, but don't commit yet
            db_session.add(trade_result)
            db_session.flush()

            # make concurrent requests to all providers
            with concurrent.futures.ThreadPoolExecutor(max_workers=len(providers)) as executor:
                futures = {
                    executor.submit(p.get_quote, chain_id, pair["input_token_address"], pair["output_token_address"], token_amount): p
                    for p in providers
                }

                results = {}
                for future in concurrent.futures.as_completed(futures):
                    provider = futures[future]
                    try:
                        result = future.result()
                        results[provider.name] = result

                        # Create provider result object but don't insert yet
                        provider_result = ProviderResult(
                            trade_id=trade_result.id,
                            provider=provider.name,
                            output_amount=result.get("output_amount"),
                            elapsed_time=result.get("elapsed_time"),
                            status_code=result.get("status_code"),
                            error=result.get("error"),
                            raw_response=result.get("raw_response")
                        )

                        provider_results_to_insert.append(provider_result)

                    except Exception as e:
                        print(
                            f"Error processing result for {provider.name}: {e}"
                        )

            # calculate winner and output differences using provider formatted amounts
            print(
                f"\n🏆 FINAL COMPARISON for {pair['name']} (${amount['usd']} trade):"
            )

            print(f"📊 All provider results:")
            for provider_name, result in results.items():
                status = result.get("status_code")
                output = result.get("output_amount")
                error = result.get("error")
                print(
                    f"  {provider_name}: Status={status}, Output={output}, Error={error}"
                )

            valid_outputs = {}
            for provider_name, result in results.items():
                if result.get("output_amount") and result.get("status_code") == 200:
                    # use the provider formatted amount directly
                    output_amount = result.get("output_amount")
                    if output_amount:
                        try:
                            float_amount = float(output_amount)
                            valid_outputs[provider_name] = float_amount
                            print(
                                f"✅ {provider_name}: Valid output = {float_amount}")
                        except (ValueError, TypeError) as e:
                            print(
                                f"❌ {provider_name}: Could not convert output amount {output_amount} to float: {e}")

            print(f"🎯 Valid outputs for comparison: {valid_outputs}")

            # determine winner and calculate differences
            winner = "All Error"
            output_diff = None
            output_diff_usd = None

            if len(valid_outputs) > 1:
                # find winner (highest output)
                winner = max(valid_outputs.items(), key=lambda x: x[1])[0]

                # calculate difference between best and second best
                sorted_outputs = sorted(valid_outputs.values(), reverse=True)
                output_diff = sorted_outputs[0] - sorted_outputs[1]
                output_diff_usd = output_diff * output_token_price

                print(f"🥇 Winner: {winner} with {sorted_outputs[0]} output")
                print(
                    f"📈 Output difference: {output_diff} ({output_diff_usd} USD)"
                )

            elif len(valid_outputs) == 1:
                winner = list(valid_outputs.keys())[0]
                print(f"🥇 Single winner: {winner}")

            # store additional calculated data
            print(
                f"🏁 Final result - Winner: {winner}, Output diff: {output_diff}, USD diff: {output_diff_usd}"
            )

    # bulk insert all provider results at once
    if provider_results_to_insert:
        db_session.bulk_save_objects(provider_results_to_insert)
        print(
            f"📦 Bulk inserted {len(provider_results_to_insert)} provider results for chain {chain_id}")
