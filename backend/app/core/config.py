from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AyniFlow API"
    app_version: str = "0.1.0"
    app_timezone: str = "America/Lima"
    debug: bool = True
    cors_origins: str = "http://localhost:5173"

    database_url: str = "mysql+pymysql://germanhyt:germanhyt@localhost:3306/germanhyt"

    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    admin_email: str = "admin@ayniflow.local"
    admin_username: str = "admin"
    admin_password: str = "Admin123!"
    admin_full_name: str = "Administrador"

    webhook_secret: str = "change-webhook-secret"
    webhook_notification_url: str | None = Field(default=None, validation_alias="WEBHOOK_NOTIFICATION")
    gemini_api_key: str | None = Field(default=None, validation_alias="GEMINI_API_KEY")

    google_service_account_email: str | None = None
    google_private_key: str | None = None
    google_spreadsheet_id: str | None = None
    google_spreadsheet_range: str = "Transacciones!A:J"

    gmail_client_id: str | None = Field(default=None, validation_alias="GMAIL_CLIENT_ID")
    gmail_client_secret: str | None = Field(default=None, validation_alias="GMAIL_CLIENT_SECRET")
    gmail_refresh_token: str | None = Field(default=None, validation_alias="GMAIL_REFRESH_TOKEN")
    gmail_redirect_uri: str = Field(
        default="http://localhost:8000/finance/integrations/gmail/oauth/callback",
        validation_alias="GMAIL_REDIRECT_URI",
    )
    gmail_query_label: str = Field(default="label:PAGOS/BCP/YAPE", validation_alias="GMAIL_QUERY")
    gmail_poll_enabled: bool = False
    gmail_poll_interval_seconds: int = 60

    rate_limit_enabled: bool = True
    log_json: bool = True

    def production_warnings(self) -> list[str]:
        if self.debug:
            return []

        warnings: list[str] = []
        if self.jwt_secret_key in {"change-me-in-production", "ci-secret-key"}:
            warnings.append("JWT_SECRET_KEY usa un valor por defecto")
        if self.webhook_secret in {"change-webhook-secret", "ci-webhook-secret"}:
            warnings.append("WEBHOOK_SECRET usa un valor por defecto")
        if self.admin_password in {"Admin123!", "ChangeThisAdminPassword!"}:
            warnings.append("ADMIN_PASSWORD sigue siendo una contraseña inicial")
        return warnings


settings = Settings()
