import requests
import time
from typing import List

from .config import settings
from ..base import BaseProvider
from ...data.user import USER_ADDRESS


class LiqdswapProvider(BaseProvider):
    def __init__(self):
        super().__init__(api_key=None)

    @property
    def name(self) -> str:
        return "Liqdswap"

    @property
    def supported_chains(self) -> List[str]:
        # HyperEVM
        return ["999"]

    def get_quote(self, chain: str, from_token: str, to_token: str, from_amount: int, user_address: str = USER_ADDRESS):
        """
        Get quote from Liqd.ag API
        """

        start_time = time.time()

        try:
            # import TOKEN_DECIMALS for decimal conversion
            from ...core.runner import TOKEN_DECIMALS

            # adjust amount by dividing by token decimals (Liqd expects decimal amount, not wei)
            input_decimals = TOKEN_DECIMALS.get(from_token.lower())
            if input_decimals is None:
                return {
                    "output_amount": None,
                    "elapsed_time": time.time() - start_time,
                    "status_code": 500,
                    "error": f"Token {from_token} not found in TOKEN_DECIMALS mapping",
                    "raw_response": None
                }
            adjusted_amount = int(from_amount) / (10 ** input_decimals)

            # prepare request parameters
            params = {
                "inputToken": from_token,
                "outputToken": to_token,
                "amount": str(adjusted_amount)
            }

            headers = {
                "accept": "*/*",
                "content-type": "application/json"
            }

            # API request
            response = requests.get(
                settings.url,
                params=params,
                headers=headers,
                timeout=10
            )

            elapsed_time = time.time() - start_time

            if response.status_code == 200:
                data = response.json()

                # extract output amount from response
                output_amount = None
                if isinstance(data, dict) and "estimatedTotalOutput" in data:
                    try:
                        raw_output = data["estimatedTotalOutput"]
                        print(f"🔍 Liqdswap RAW OUTPUT: {raw_output}")
                        # Liqd.ag returns the amount in decimal format already - no conversion needed!
                        output_amount = str(float(raw_output))
                        print(
                            f"✅ Liqdswap FINAL OUTPUT (no conversion): {output_amount}"
                        )

                    except (ValueError, TypeError):
                        print(f"❌ Liqdswap: Error converting raw output to float")
                        output_amount = None

                else:
                    print(f"❌ Liqdswap: No estimatedTotalOutput found in response")

                return {
                    "output_amount": output_amount,
                    "elapsed_time": elapsed_time,
                    "status_code": response.status_code,
                    "error": None,
                    "raw_response": data
                }
            else:
                return {
                    "output_amount": None,
                    "elapsed_time": elapsed_time,
                    "status_code": response.status_code,
                    "error": f"HTTP {response.status_code}: {response.text}",
                    "raw_response": response.text
                }

        except requests.exceptions.Timeout:
            elapsed_time = time.time() - start_time
            return {
                "output_amount": None,
                "elapsed_time": elapsed_time,
                "status_code": 408,
                "error": "Request timeout",
                "raw_response": None
            }

        except requests.exceptions.RequestException as e:
            elapsed_time = time.time() - start_time
            return {
                "output_amount": None,
                "elapsed_time": elapsed_time,
                "status_code": 500,
                "error": f"Request error: {str(e)}",
                "raw_response": None
            }

        except Exception as e:
            elapsed_time = time.time() - start_time
            return {
                "output_amount": None,
                "elapsed_time": elapsed_time,
                "status_code": 500,
                "error": f"Unexpected error: {str(e)}",
                "raw_response": None
            }
