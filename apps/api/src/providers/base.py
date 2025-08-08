from abc import ABC, abstractmethod
from typing import List


class BaseProvider(ABC):
    """
    Abstract base class for all DEX aggregator providers
    """

    def __init__(self, api_key: str = None):
        self.api_key = api_key

    @abstractmethod
    def get_quote(self, chain: str, from_token: str, to_token: str, from_amount: int, user_address: str):
        """
        Fetches a quote from the provider.

        Args:
            chain (str): The blockchain to trade on
            from_token (str): The address of the token to sell
            to_token (str): The address of the token to buy
            from_amount (int): The amount of the `from_token` to sell, in its smallest unit
            user_address (str): The address of the user initiating the trade

        Returns:
            A dictionary containing the provider's response, or None if an error occurs
        """
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """
        Returns the name of the provider
        """
        pass

    @property
    @abstractmethod
    def supported_chains(self) -> List[str]:
        """
        Returns a list of chain IDs that this provider supports

        Returns:
            List[str]: Chain IDs (eg: ["1", "137", "42161"])
        """
        pass

    def supports_chain(self, chain_id: str) -> bool:
        """
        Check if the provider supports a given chain

        Args:
            chain_id (str): The chain ID to check

        Returns:
            bool: True if the chain is supported, False otherwise
        """
        return chain_id in self.supported_chains
