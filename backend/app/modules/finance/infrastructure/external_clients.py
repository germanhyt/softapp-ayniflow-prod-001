import json
from typing import Any

from google.oauth2 import service_account
from googleapiclient.discovery import build

from app.core.config import settings
from app.shared.exceptions import AppException


class GoogleSheetsClient:
    SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

    @classmethod
    def is_configured(cls, *, spreadsheet_id: str | None = None) -> bool:
        sheet_id = (spreadsheet_id or settings.google_spreadsheet_id or "").strip()
        return bool(
            settings.google_service_account_email
            and settings.google_private_key
            and sheet_id
        )

    @classmethod
    def fetch_rows(cls, *, spreadsheet_id: str | None = None, cell_range: str | None = None) -> list[list[Any]]:
        sheet_id = (spreadsheet_id or settings.google_spreadsheet_id or "").strip()
        sheet_range = (cell_range or settings.google_spreadsheet_range).strip()
        if not cls.is_configured(spreadsheet_id=sheet_id):
            raise AppException(
                "Google Sheets no está configurado. Define GOOGLE_SERVICE_ACCOUNT_EMAIL, "
                "GOOGLE_PRIVATE_KEY y GOOGLE_SPREADSHEET_ID.",
                status_code=503,
            )

        private_key = settings.google_private_key.replace("\\n", "\n")
        credentials = service_account.Credentials.from_service_account_info(
            {
                "type": "service_account",
                "project_id": "germanhyt",
                "private_key_id": "local",
                "private_key": private_key,
                "client_email": settings.google_service_account_email,
                "client_id": "0",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            },
            scopes=cls.SCOPES,
        )

        service = build("sheets", "v4", credentials=credentials, cache_discovery=False)
        result = (
            service.spreadsheets()
            .values()
            .get(
                spreadsheetId=sheet_id,
                range=sheet_range,
            )
            .execute()
        )
        return result.get("values", [])
