from app.modules.finance.application.integration_config_defaults import ENV_CONFIG_DEFAULTS
from app.modules.finance.domain.models import IntegrationSetting
from app.modules.finance.infrastructure.repositories import FinanceRepository
from app.shared.exceptions import AppException

SECRET_CONFIG_KEYS = frozenset({"gemini_api_key"})


def mask_secret_value(value: str | None) -> str | None:
    if not value or not value.strip():
        return value
    stripped = value.strip()
    if len(stripped) <= 4:
        return "••••"
    return f"••••{stripped[-4:]}"


class IntegrationSettingsService:
    def __init__(self, repository: FinanceRepository):
        self.repository = repository

    def list_settings(self) -> list[dict]:
        rows = self.repository.list_integration_settings()
        return [self._serialize(row) for row in rows]

    def is_enabled(self, key: str, *, default: bool = True) -> bool:
        setting = self.repository.get_integration_setting(key)
        if setting is None or setting.kind != "feature":
            return default
        return setting.is_enabled

    def require_enabled(self, key: str, *, message: str) -> None:
        if not self.is_enabled(key):
            raise AppException(message, status_code=403)

    def get_effective_value(self, key: str) -> str:
        setting = self.repository.get_integration_setting(key)
        if setting and setting.config_value and setting.config_value.strip():
            return setting.config_value.strip()

        resolver = ENV_CONFIG_DEFAULTS.get(key)
        if resolver:
            return resolver()

        if setting and setting.env_default:
            return setting.env_default.strip()

        return ""

    def get_effective_int(self, key: str, *, fallback: int) -> int:
        raw = self.get_effective_value(key)
        if not raw:
            return fallback
        try:
            parsed = int(raw)
            return parsed if parsed > 0 else fallback
        except ValueError:
            return fallback

    def update_setting(
        self,
        key: str,
        *,
        is_enabled: bool | None = None,
        config_value: str | None = None,
    ) -> dict:
        setting = self.repository.get_integration_setting(key)
        if setting is None:
            raise AppException(f"Configuración '{key}' no encontrada", status_code=404)

        if setting.kind == "feature" and config_value is not None:
            raise AppException("Este ajuste solo admite activar/desactivar", status_code=400)
        if setting.kind == "config" and is_enabled is not None:
            raise AppException("Este ajuste solo admite valor de configuración", status_code=400)
        if (
            setting.kind == "config"
            and config_value is not None
            and setting.key in SECRET_CONFIG_KEYS
            and config_value.strip().startswith("••••")
        ):
            raise AppException("Indica una API key nueva; no se puede reutilizar el valor enmascarado.", status_code=400)

        updated = self.repository.update_integration_setting(
            setting,
            is_enabled=is_enabled,
            config_value=config_value,
        )
        return self._serialize(updated)

    def _serialize(self, setting: IntegrationSetting) -> dict:
        effective = None
        config_value = setting.config_value
        env_default = setting.env_default
        if setting.kind == "config":
            effective = self.get_effective_value(setting.key)
            if setting.key in SECRET_CONFIG_KEYS:
                config_value = mask_secret_value(config_value)
                env_default = mask_secret_value(env_default)
                effective = mask_secret_value(effective) if effective else effective

        value_type = "secret" if setting.key in SECRET_CONFIG_KEYS else "text"

        return {
            "key": setting.key,
            "label": setting.label,
            "description": setting.description,
            "category": setting.category,
            "kind": setting.kind,
            "is_enabled": setting.is_enabled,
            "config_value": config_value,
            "env_default": env_default,
            "effective_value": effective,
            "value_type": value_type,
        }
