from collections.abc import Callable

from app.core.config import settings


def env_gmail_query() -> str:
    return settings.gmail_query_label.strip()


def env_gmail_poll_interval() -> str:
    return str(settings.gmail_poll_interval_seconds)


def env_google_spreadsheet_id() -> str:
    return (settings.google_spreadsheet_id or "").strip()


def env_google_spreadsheet_range() -> str:
    return settings.google_spreadsheet_range.strip()


def env_webhook_notification_url() -> str:
    return (settings.webhook_notification_url or "").strip()


def env_gemini_api_key() -> str:
    return (settings.gemini_api_key or "").strip()


ENV_CONFIG_DEFAULTS: dict[str, Callable[[], str]] = {
    "gmail_query": env_gmail_query,
    "gmail_poll_interval_seconds": env_gmail_poll_interval,
    "google_spreadsheet_id": env_google_spreadsheet_id,
    "google_spreadsheet_range": env_google_spreadsheet_range,
    "webhook_notification_url": env_webhook_notification_url,
    "gemini_api_key": env_gemini_api_key,
}
