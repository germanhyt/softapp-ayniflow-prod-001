import base64
import re
from email.utils import parsedate_to_datetime
from typing import Any

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.core.config import settings
from app.shared.exceptions import AppException

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]


class GmailClient:
    @classmethod
    def is_configured(cls, refresh_token: str | None = None) -> bool:
        token = refresh_token or settings.gmail_refresh_token
        return bool(settings.gmail_client_id and settings.gmail_client_secret and token)

    @classmethod
    def _credentials(cls, refresh_token: str | None = None) -> Credentials:
        token = refresh_token or settings.gmail_refresh_token
        if not settings.gmail_client_id or not settings.gmail_client_secret or not token:
            raise AppException(
                "Gmail no conectado. Usa «Conectar Gmail» en Integraciones o define GMAIL_REFRESH_TOKEN.",
                status_code=503,
            )

        creds = Credentials(
            token=None,
            refresh_token=token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.gmail_client_id,
            client_secret=settings.gmail_client_secret,
            scopes=GMAIL_SCOPES,
        )
        creds.refresh(Request())
        return creds

    @classmethod
    def _service(cls, refresh_token: str | None = None):
        return build("gmail", "v1", credentials=cls._credentials(refresh_token), cache_discovery=False)

    @classmethod
    def get_profile(cls, *, refresh_token: str | None = None) -> dict[str, Any]:
        service = cls._service(refresh_token)
        return service.users().getProfile(userId="me").execute()

    @classmethod
    def list_message_ids(
        cls,
        *,
        query: str,
        max_results: int | None = None,
        refresh_token: str | None = None,
    ) -> list[str]:
        service = cls._service(refresh_token)
        message_ids: list[str] = []
        page_token: str | None = None

        while True:
            request_kwargs: dict[str, Any] = {"userId": "me", "q": query}
            if page_token:
                request_kwargs["pageToken"] = page_token
            if max_results is not None:
                remaining = max_results - len(message_ids)
                if remaining <= 0:
                    break
                request_kwargs["maxResults"] = min(100, remaining)

            response = service.users().messages().list(**request_kwargs).execute()
            for item in response.get("messages", []):
                message_ids.append(item["id"])
                if max_results is not None and len(message_ids) >= max_results:
                    return message_ids

            page_token = response.get("nextPageToken")
            if not page_token:
                break

        return message_ids

    @classmethod
    def get_message(cls, message_id: str, *, refresh_token: str | None = None) -> dict[str, str]:
        service = cls._service(refresh_token)
        message = service.users().messages().get(userId="me", id=message_id, format="full").execute()

        headers = {h["name"].lower(): h["value"] for h in message.get("payload", {}).get("headers", [])}
        subject = headers.get("subject", "")
        raw_date = headers.get("date", "")

        iso_date = ""
        if raw_date:
            try:
                iso_date = parsedate_to_datetime(raw_date).isoformat()
            except (TypeError, ValueError, IndexError):
                iso_date = raw_date

        body = cls._extract_plain_text(message.get("payload", {}))
        return {
            "id": message_id,
            "subject": subject,
            "date": iso_date,
            "text": body,
        }

    @classmethod
    def mark_as_read(cls, message_id: str, *, refresh_token: str | None = None) -> None:
        service = cls._service(refresh_token)
        service.users().messages().modify(
            userId="me",
            id=message_id,
            body={"removeLabelIds": ["UNREAD"]},
        ).execute()

    @classmethod
    def _extract_plain_text(cls, payload: dict[str, Any]) -> str:
        mime_type = payload.get("mimeType", "")
        body_data = payload.get("body", {}).get("data")
        if mime_type == "text/plain" and body_data:
            return cls._decode_body(body_data)
        if mime_type == "text/html" and body_data:
            return cls._html_to_text(cls._decode_body(body_data))

        parts = payload.get("parts", [])
        plain_chunks: list[str] = []
        html_chunks: list[str] = []

        for part in parts:
            part_mime = part.get("mimeType", "")
            if part_mime == "text/plain":
                decoded = cls._decode_body(part.get("body", {}).get("data"))
                if decoded:
                    plain_chunks.append(decoded)
            elif part_mime == "text/html":
                decoded = cls._decode_body(part.get("body", {}).get("data"))
                if decoded:
                    html_chunks.append(decoded)
            elif part.get("parts"):
                nested = cls._extract_plain_text(part)
                if nested:
                    if nested.lstrip().startswith("<"):
                        html_chunks.append(nested)
                    else:
                        plain_chunks.append(nested)

        if plain_chunks:
            return "\n".join(plain_chunks)
        if html_chunks:
            return cls._html_to_text("\n".join(html_chunks))
        if body_data:
            decoded = cls._decode_body(body_data)
            if mime_type == "text/html" or decoded.lstrip().startswith("<"):
                return cls._html_to_text(decoded)
            return decoded
        return ""

    @staticmethod
    def _decode_body(data: str | None) -> str:
        if not data:
            return ""
        try:
            return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
        except Exception:
            return ""

    @staticmethod
    def _html_to_text(html: str) -> str:
        text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
        text = re.sub(r"</(p|div|tr|td|th|li|h[1-6])>", "\n", text, flags=re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = text.replace("&nbsp;", " ")
        text = re.sub(r"&#?\w+;", " ", text)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n\s*\n+", "\n", text)
        return text.strip()
