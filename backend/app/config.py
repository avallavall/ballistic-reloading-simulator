from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://balistica:balistica_dev_2024@db:5432/balistica"
    environment: str = "development"

    model_config = {"env_file": ".env"}


settings = Settings()
