import re
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import httpx
from jose import jwt

from app.core.config import settings
from app.core.logging import logger
from app.shared.exceptions import AppException

GOOGLE_AUTH_SCOPES = ("openid", "email", "profile")
OAUTH_STATE_PURPOSE = "google_auth"


@dataclass
class GoogleUserProfile:
    sub: str
    email: str
    name: str | None
    email_verified: bool


def _client_id() -> str | None:
    return settings.google_auth_client_id or settings.gmail_client_id


def _client_secret() -> str | None:
    return settings.google_auth_client_secret or settings.gmail_client_secret


def has_google_oauth_app() -> bool:
    return bool(_client_id() and _client_secret())


def create_oauth_state() -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    payload = {"purpose": OAUTH_STATE_PURPOSE, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def verify_oauth_state(state: str) -> dict:
    try:
        payload = jwt.decode(state, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except Exception as exc:
        raise AppException("State OAuth inválido o expirado", status_code=400) from exc
    if payload.get("purpose") != OAUTH_STATE_PURPOSE:
        raise AppException("State OAuth inválido", status_code=400)
    return payload


class GoogleOAuthService:
    @staticmethod
    def get_status() -> dict:
        return {
            "configured": has_google_oauth_app(),
            "redirect_uri": settings.google_auth_redirect_uri,
        }

    @staticmethod
    def build_authorization_url() -> str:
        client_id = _client_id()
        if not client_id or not _client_secret():
            raise AppException(
                "Define GOOGLE_AUTH_CLIENT_ID y GOOGLE_AUTH_CLIENT_SECRET (o reutiliza GMAIL_CLIENT_*).",
                status_code=503,
            )

        params = {
            "client_id": client_id,
            "redirect_uri": settings.google_auth_redirect_uri,
            "response_type": "code",
            "scope": " ".join(GOOGLE_AUTH_SCOPES),
            "access_type": "online",
            "prompt": "select_account",
            "state": create_oauth_state(),
        }
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"

    @staticmethod
    def complete_oauth(*, code: str, state: str) -> GoogleUserProfile:
        verify_oauth_state(state)

        client_id = _client_id()
        client_secret = _client_secret()
        if not client_id or not client_secret:
            raise AppException("OAuth Google no configurado en el servidor", status_code=503)

        try:
            response = httpx.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": settings.google_auth_redirect_uri,
                    "grant_type": "authorization_code",
                },
                timeout=20.0,
            )
            response.raise_for_status()
            token_data = response.json()
        except Exception as exc:
            logger.warning("Error intercambiando código OAuth Google Auth: %s", exc)
            raise AppException("No se pudo completar la autorización con Google", status_code=502) from exc

        access_token = token_data.get("access_token")
        if not access_token:
            raise AppException("Google no devolvió access_token", status_code=502)

        return GoogleOAuthService._fetch_user_profile(access_token)

    @staticmethod
    def _fetch_user_profile(access_token: str) -> GoogleUserProfile:
        try:
            response = httpx.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=15.0,
            )
            response.raise_for_status()
            data = response.json()
        except Exception as exc:
            logger.warning("No se pudo leer perfil Google: %s", exc)
            raise AppException("No se pudo leer el perfil de Google", status_code=502) from exc

        sub = data.get("sub")
        email = data.get("email")
        if not sub or not email:
            raise AppException("Google no devolvió identificador o email", status_code=502)

        return GoogleUserProfile(
            sub=str(sub),
            email=str(email).strip().lower(),
            name=(data.get("name") or None),
            email_verified=bool(data.get("email_verified", False)),
        )


def sanitize_username_base(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "", value.strip().lower())
    return cleaned[:80] or "user"
