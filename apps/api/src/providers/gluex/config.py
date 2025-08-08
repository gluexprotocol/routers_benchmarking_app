from pathlib import Path
from pydantic import BaseSettings, AnyUrl


class GluexSettings(BaseSettings):
    api_key:    str     # will map to GLUEX_API_KEY
    url:        AnyUrl  # will map to GLUEX_URL
    unique_pid: str     # will map to GLUEX_UNIQUE_PID

    class Config:
        env_file = Path(__file__).parent.parent / ".env"
        env_prefix = "GLUEX_"


settings = GluexSettings()
