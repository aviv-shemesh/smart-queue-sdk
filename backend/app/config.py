from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongo_url: str
    mongo_test_url: str
    db_name: str = "smartqueue"
    test_db_name: str = "smartqueue_test"
    admin_secret: str
    default_service_time_seconds: int = 300

    class Config:
        env_file = ".env"


settings = Settings()
