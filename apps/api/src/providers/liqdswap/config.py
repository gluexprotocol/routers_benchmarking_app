from pathlib import Path
from pydantic import BaseSettings, AnyUrl


class LiqdSettings(BaseSettings):
    url:        AnyUrl  # will map to LIQDSWAP_URL

    class Config:
        env_file = Path(__file__).parent.parent / ".env"
        env_prefix = "LIQDSWAP_"


settings = LiqdSettings()
