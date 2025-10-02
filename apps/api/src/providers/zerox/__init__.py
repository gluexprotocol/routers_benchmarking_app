import requests
import time
from typing import List
from .config import settings
from ..base import BaseProvider
from ...data.user import USER_ADDRESS

class ZeroxProvider(BaseProvider):
    def __init__(self):
        super().__init__(api_key=settings.api_key)

    @property
    def name(self) -> str:
        return "0x"

    @property
    def supported_chains(self) -> List[str]:
        # Ethereum, BNB, Polygon, Arbitrum, HyperEVM, Base, Avalanche, Plasma
        return ["1", "10", "56", "137", "42161", "8453", "43114", "9745" ]  

    def get_quote(self, chain: str, from_token: str, to_token: str, from_amount: int, user_address: str = USER_ADDRESS):
        headers = {
            "accept": "*/*",
            "content-type": "application/json",
            "0x-api-key": self.api_key,
            "0x-version": "v2"
        }
        params = {
            "sellToken": from_token,
            "buyToken": to_token,
            "sellAmount": str(from_amount),
            "taker": user_address,
            "chainId": chain
        }

        start_time = time.perf_counter()
        try:
            response = requests.get(settings.url, headers=headers, params=params, timeout=10)
            elapsed_time = time.perf_counter() - start_time
            response.raise_for_status()
            
            # Extract raw output amount
            raw_output = response.json().get("buyAmount")
            formatted_output = None
            
            print(f"🔍 0x RAW OUTPUT: {raw_output}")
            
            if raw_output:
                try:
                    # Import TOKEN_DECIMALS for decimal conversion
                    from ...core.runner import TOKEN_DECIMALS
                    
                    # Convert raw amount to decimal format
                    output_decimals = TOKEN_DECIMALS.get(to_token.lower())
                    print(f"🔢 0x: Output token {to_token} has {output_decimals} decimals")
                    
                    if output_decimals is not None:
                        raw_float = float(raw_output)
                        converted_amount = raw_float / (10 ** output_decimals)
                        formatted_output = str(converted_amount)
                        print(f"🧮 0x CONVERSION: {raw_float} ÷ 10^{output_decimals} = {converted_amount}")
                        print(f"✅ 0x FINAL OUTPUT: {formatted_output}")
                    else:
                        print(f"⚠️ 0x: Token {to_token} not found in TOKEN_DECIMALS, returning raw amount")
                        formatted_output = str(raw_output)
                        print(f"❌ 0x FINAL OUTPUT (raw): {formatted_output}")
                except Exception as e:
                    print(f"⚠️ 0x: Error converting output amount: {e}, returning raw amount")
                    formatted_output = str(raw_output)
                    print(f"❌ 0x FINAL OUTPUT (error): {formatted_output}")
            else:
                print(f"❌ 0x: No raw output found")
            
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