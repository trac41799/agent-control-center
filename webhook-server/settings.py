from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    queue_provider: str = "upstash"
    upstash_redis_url: str = ""
    upstash_redis_token: str = ""
    postgres_url: str = ""

    lark_app_id: str = ""
    lark_app_secret: str = ""
    lark_verify_token: str = ""

    slack_signing_secret: str = ""
    slack_bot_token: str = ""

    discord_public_key: str = ""
    discord_bot_token: str = ""

    telegram_bot_token: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "allow"}

settings = Settings()
