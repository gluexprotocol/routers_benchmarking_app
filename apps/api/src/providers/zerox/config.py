from pathlib import Path
from pydantic import BaseSettings, AnyUrl


class ZeroxSettings(BaseSettings):
    url:        AnyUrl  # will map to ZEROX_URL
    api_key:    str     # will map to ZEROX_API_KEY

    class Config:
        env_file = Path(__file__).parent.parent / ".env"
        env_prefix = "ZEROX_"


settings = ZeroxSettings()