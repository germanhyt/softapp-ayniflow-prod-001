import urllib.parse
from datetime import datetime, timedelta, timezone

import httpx
from jose import jwt

from app.core.config import settings
from app.core.logging import logger
from app.modules.finance.infrastructure.gmail_client import GMAIL_SCOPES, GmailClient
from app.modules.finance.infrastructure.repositories import FinanceRepository
from app.shared.exceptions import AppException

OAUTH_STATE_PURPOSE = "gmail_oauth"


def create_oauth_state() -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    payload = {"purpose": OAUTH_STATE_PURPOSE, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def verify_oauth_state(state: str) -> None:
    try:
        payload = jwt.decode(state, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except Exception as exc:
        raise AppException("State OAuth inválido o expirado", status_code=400) from exc
    if payload.get("purpose") != OAUTH_STATE_PURPOSE:
        raise AppException("State OAuth inválido", status_code=400)


class GmailOAuthService:
    def __init__(self, repository: FinanceRepository):
        self.repository = repository

    @staticmethod
    def has_oauth_app() -> bool:
        return bool(settings.gmail_client_id and settings.gmail_client_secret)

    def is_connected(self) -> bool:
        return bool(self.repository.get_gmail_refresh_token())

    def get_connection_info(self) -> dict:
        credential = self.repository.get_gmail_credential()
        refresh_token = self.repository.get_gmail_refresh_token()
        return {
            "oauth_app_configured": self.has_oauth_app(),
            "connected": bool(refresh_token),
            "connected_email": credential.connected_email if credential else None,
            "redirect_uri": settings.gmail_redirect_uri,
            "query": settings.gmail_query_label,
        }

    def build_authorization_url(self) -> str:
        if not self.has_oauth_app():
            raise AppException(
                "Define GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET en el backend.",
                status_code=503,
            )

        params = {
            "client_id": settings.gmail_client_id,
            "redirect_uri": settings.gmail_redirect_uri,
            "response_type": "code",
            "scope": " ".join(GMAIL_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": create_oauth_state(),
        }
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"

    def complete_oauth(self, *, code: str, state: str) -> str:
        verify_oauth_state(state)

        if not self.has_oauth_app():
            raise AppException("OAuth Gmail no configurado en el servidor", status_code=503)

        try:
            response = httpx.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.gmail_client_id,
                    "client_secret": settings.gmail_client_secret,
                    "redirect_uri": settings.gmail_redirect_uri,
                    "grant_type": "authorization_code",
                },
                timeout=20.0,
            )
            response.raise_for_status()
            token_data = response.json()
        except Exception as exc:
            logger.warning("Error intercambiando código OAuth Gmail: %s", exc)
            raise AppException("No se pudo completar la autorización con Google", status_code=502) from exc

        refresh_token = token_data.get("refresh_token")
        if not refresh_token:
            raise AppException(
                "Google no devolvió refresh_token. Revoca el acceso previo en "
                "https://myaccount.google.com/permissions y vuelve a conectar con prompt=consent.",
                status_code=400,
            )

        connected_email = self._fetch_profile_email(refresh_token)
        self.repository.save_gmail_credential(refresh_token, connected_email)
        return connected_email or "Gmail conectado"

    def _fetch_profile_email(self, refresh_token: str) -> str | None:
        try:
            profile = GmailClient.get_profile(refresh_token=refresh_token)
            return profile.get("emailAddress")
        except Exception as exc:
            logger.warning("No se pudo leer perfil Gmail tras OAuth: %s", exc)
            return None

    def disconnect(self) -> None:
        self.repository.delete_gmail_credential()
