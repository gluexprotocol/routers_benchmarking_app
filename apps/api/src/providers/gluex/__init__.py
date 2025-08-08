import requests
import time
from typing import List

from .config import settings
from ..base import BaseProvider
from ...data.user import USER_ADDRESS


class GluexProvider(BaseProvider):
    def __init__(self):
        super().__init__(api_key=settings.api_key)

    @property
    def name(self) -> str:
        return "GlueX"

    @property
    def supported_chains(self) -> List[str]:
        # Ethereum, BNB, Polygon, Arbitrum, HyperEVM, Base, Avalanche
        return ["1", "10", "56", "100", "137", "42161", "999",  "8453", "43114"]

    def get_quote(self, chain: str, from_token: str, to_token: str, from_amount: int, user_address: str = USER_ADDRESS):
        headers = {
            "accept": "*/*",
            "content-type": "application/json",
            "user-agent": "python-requests/3.x",
            "x-api-key": self.api_key
        }

        body = {
            "userAddress": user_address,
            "outputReceiver": user_address,
            "isPermit2": False,
            "computeStable": True,
            "computeEstimate": True,
            "inputToken": from_token,
            "outputToken": to_token,
            "inputAmount": str(from_amount),
            "networkID": chain,
            "uniquePID": settings.unique_pid,
        }

        start_time = time.perf_counter()

        try:
            response = requests.post(
                settings.url, headers=headers, json=body, timeout=10
            )

            elapsed_time = time.perf_counter() - start_time

            response.raise_for_status()

            # extract raw output amount
            raw_output = response.json().get("result", {}).get("outputAmount")
            formatted_output = None

            if raw_output:
                try:
                    # import TOKEN_DECIMALS for decimal conversion
                    from ...core.runner import TOKEN_DECIMALS

                    # convert raw amount to decimal format
                    output_decimals = TOKEN_DECIMALS.get(to_token.lower())
                    print(
                        f"🔢 GlueX: Output token {to_token} has {output_decimals} decimals"
                    )

                    if output_decimals is not None:
                        raw_float = float(raw_output)
                        converted_amount = raw_float / (10 ** output_decimals)
                        formatted_output = str(converted_amount)

                        print(
                            f"🧮 GlueX CONVERSION: {raw_float} ÷ 10^{output_decimals} = {converted_amount}"
                        )
                        print(f"✅ GlueX FINAL OUTPUT: {formatted_output}")

                    else:
                        print(
                            f"⚠️ GlueX: Token {to_token} not found in TOKEN_DECIMALS, returning raw amount"
                        )
                        formatted_output = str(raw_output)
                        print(
                            f"❌ GlueX FINAL OUTPUT (raw): {formatted_output}"
                        )

                except Exception as e:
                    formatted_output = str(raw_output)
                    print(
                        f"⚠️ GlueX: Error converting output amount: {e}, returning raw amount"
                    )
                    print(f"❌ GlueX FINAL OUTPUT (error): {formatted_output}")

            else:
                print(f"❌ GlueX: No raw output found")

            return {
                "name": self.name,
                "output_amount": formatted_output,
                "elapsed_time": elapsed_time,
                "status_code": response.status_code,
                "raw_response": response.json(),
            }

        except requests.RequestException as e:
            elapsed_time = time.perf_counter() - start_time

            return {
                "name": self.name,
                "error": str(e),
                "elapsed_time": elapsed_time,
                "status_code": e.response.status_code if e.response else None,
            }
