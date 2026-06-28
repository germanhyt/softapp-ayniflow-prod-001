from datetime import date

import urllib.parse

from fastapi import APIRouter, Depends, File, Header, Query, UploadFile
from fastapi.responses import RedirectResponse, Response, StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.shared.datetime_utils import serialize_datetime
from app.modules.auth.domain.models import User
from app.modules.auth.presentation.deps import require_permission
from app.modules.finance.application.gmail_oauth_service import GmailOAuthService
from app.modules.finance.application.gmail_poll_task import get_poll_runtime_state
from app.modules.finance.application.integration_settings_service import IntegrationSettingsService
from app.modules.finance.application.gmail_sync_service import GmailSyncService
from app.modules.finance.application.export_service import FinanceExportService
from app.modules.finance.application.integration_service import IntegrationService
from app.modules.finance.application.notification_service import NotificationService
from app.modules.finance.application.ocr_service import OcrService
from app.modules.finance.presentation.routes import get_finance_service
from app.modules.finance.domain.models import MovementType
from app.modules.finance.infrastructure.external_clients import GoogleSheetsClient
from app.modules.finance.infrastructure.gmail_client import GmailClient
from app.modules.finance.infrastructure.legacy_adapter import LegacyFinanzasNegocioAdapter
from app.modules.finance.infrastructure.repositories import FinanceRepository
from app.modules.finance.presentation.schemas import (
    GmailConnectionResponse,
    GmailOAuthStartResponse,
    GmailPollStatusResponse,
    GmailSyncResultResponse,
    ImportResultResponse,
    IntegrationsStatusResponse,
    IntegrationStatusItem,
    IntegrationSettingResponse,
    IntegrationSettingUpdate,
    LegacyImportRequest,
    MovementTypeSchema,
    NotificationListResponse,
    NotificationResponse,
    OcrExtractResponse,
    WebhookEventResponse,
    WebhookPayload,
)
from app.shared.exceptions import AppException
from app.shared.responses import success_response

integrations_router = APIRouter(prefix="/finance", tags=["finance-integrations"])
reports_router = APIRouter(prefix="/finance/reports", tags=["finance-reports"])
webhook_router = APIRouter(prefix="/finance/webhook", tags=["finance-webhook"])


def _summary_dict(service, **filters) -> dict[str, str]:
    summary = service.get_summary(**filters)
    return {
        "total_income": str(summary.total_income),
        "total_expense": str(summary.total_expense),
        "balance": str(summary.balance),
    }


@reports_router.get("/excel")
def export_excel(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    movement_type: MovementTypeSchema | None = None,
    search: str | None = None,
    _: User = Depends(require_permission("finance:read")),
    service=Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    movement = MovementType(movement_type.value) if movement_type else None
    transactions = repository.list_transactions(
        from_date=from_date,
        to_date=to_date,
        movement_type=movement,
        search=search,
    )
    summary = _summary_dict(
        service,
        from_date=from_date,
        to_date=to_date,
        movement_type=movement,
        search=search,
    )
    content = FinanceExportService().build_excel(transactions, summary)
    filename = f"reporte-financiero-{from_date or 'all'}-{to_date or 'all'}.xlsx"
    return StreamingResponse(
        iter([content]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@reports_router.get("/pdf")
def export_pdf(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    movement_type: MovementTypeSchema | None = None,
    search: str | None = None,
    _: User = Depends(require_permission("finance:read")),
    service=Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    movement = MovementType(movement_type.value) if movement_type else None
    transactions = repository.list_transactions(
        from_date=from_date,
        to_date=to_date,
        movement_type=movement,
        search=search,
    )
    summary = _summary_dict(
        service,
        from_date=from_date,
        to_date=to_date,
        movement_type=movement,
        search=search,
    )
    content = FinanceExportService().build_pdf(transactions, summary)
    filename = f"reporte-financiero-{from_date or 'all'}-{to_date or 'all'}.pdf"
    return Response(content=content, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@webhook_router.post("")
def receive_webhook(
    payload: WebhookPayload,
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
    db: Session = Depends(get_db),
):
    if settings.webhook_secret and x_webhook_secret != settings.webhook_secret:
        raise AppException("No autorizado", status_code=401)

    repository = FinanceRepository(db)
    IntegrationSettingsService(repository).require_enabled(
        "webhook_inbound",
        message="El webhook entrante está desactivado en configuración.",
    )
    service = IntegrationService(repository)
    result = service.process_webhook(payload.model_dump())
    return success_response(result, message="Transacción registrada vía webhook")


@webhook_router.get("")
def webhook_health():
    return {"status": "ok", "message": "Webhook endpoint activo"}


@integrations_router.get("/integrations/status", response_model=IntegrationsStatusResponse)
def integrations_status(
    _: User = Depends(require_permission("finance:read")),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    refresh_token = repository.get_gmail_refresh_token()
    gmail_oauth = GmailOAuthService(repository)
    gmail_connected = GmailClient.is_configured(refresh_token)
    gmail_info = gmail_oauth.get_connection_info()
    gmail_description = (
        f"Cuenta conectada: {gmail_info['connected_email']}"
        if gmail_connected and gmail_info.get("connected_email")
        else "Conecta Gmail desde Integraciones (OAuth web)"
        if gmail_oauth.has_oauth_app()
        else "Define GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET"
    )

    settings_service = IntegrationSettingsService(repository)
    sheet_id = settings_service.get_effective_value("google_spreadsheet_id")
    webhook_url = settings_service.get_effective_value("webhook_notification_url")

    return IntegrationsStatusResponse(
        webhook_inbound=IntegrationStatusItem(
            configured=bool(settings.webhook_secret and settings.webhook_secret != "change-webhook-secret"),
            label="Webhook entrante",
            description="POST /finance/webhook con header X-Webhook-Secret (WEBHOOK_SECRET)",
        ),
        webhook_notification=IntegrationStatusItem(
            configured=bool(webhook_url),
            label="Alertas n8n",
            description="Envío de alertas de presupuesto a n8n (WEBHOOK_NOTIFICATION)",
        ),
        gemini_ocr=IntegrationStatusItem(
            configured=OcrService.is_configured(settings_service),
            label="OCR vouchers",
            description="Extracción de datos desde imágenes con Gemini (API key en Integraciones o .env)",
        ),
        google_sheets=IntegrationStatusItem(
            configured=GoogleSheetsClient.is_configured(spreadsheet_id=sheet_id),
            label="Google Sheets",
            description="Sincronización de filas desde hoja de cálculo",
        ),
        gmail=IntegrationStatusItem(
            configured=gmail_connected,
            label="Gmail BCP/Yape",
            description=gmail_description,
        ),
    )


@integrations_router.get("/integrations/gmail/connection", response_model=GmailConnectionResponse)
def gmail_connection_status(
    _: User = Depends(require_permission("finance:read")),
    db: Session = Depends(get_db),
):
    return GmailConnectionResponse(**GmailOAuthService(FinanceRepository(db)).get_connection_info())


@integrations_router.get("/integrations/gmail/poll-status", response_model=GmailPollStatusResponse)
def gmail_poll_status(
    _: User = Depends(require_permission("finance:read")),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    settings_service = IntegrationSettingsService(repository)
    refresh_token = repository.get_gmail_refresh_token()
    runtime_state = get_poll_runtime_state()

    return GmailPollStatusResponse(
        loop_running=True,
        realtime_enabled=settings_service.is_enabled("gmail_realtime", default=False),
        connected=GmailClient.is_configured(refresh_token),
        query=settings_service.get_effective_value("gmail_query"),
        interval_seconds=settings_service.get_effective_int(
            "gmail_poll_interval_seconds",
            fallback=settings.gmail_poll_interval_seconds,
        ),
        mark_unread_only=True,
        last_checked_at=runtime_state.get("last_checked_at"),
        last_result=runtime_state.get("last_result"),
        last_error=runtime_state.get("last_error"),
    )


@integrations_router.get("/integrations/gmail/oauth/start", response_model=GmailOAuthStartResponse)
def gmail_oauth_start(
    _: User = Depends(require_permission("finance:write")),
    db: Session = Depends(get_db),
):
    url = GmailOAuthService(FinanceRepository(db)).build_authorization_url()
    return GmailOAuthStartResponse(authorization_url=url)


@integrations_router.get("/integrations/gmail/oauth/callback")
def gmail_oauth_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    frontend_base = settings.cors_origins.split(",")[0].strip()

    if error:
        return RedirectResponse(f"{frontend_base}/finance/integrations?gmail=error&reason={error}")

    if not code or not state:
        raise AppException("Callback OAuth incompleto", status_code=400)

    try:
        email = GmailOAuthService(FinanceRepository(db)).complete_oauth(code=code, state=state)
        params = urllib.parse.urlencode({"gmail": "connected", "email": email})
        return RedirectResponse(f"{frontend_base}/finance/integrations?{params}")
    except AppException as exc:
        params = urllib.parse.urlencode({"gmail": "error", "reason": str(exc)})
        return RedirectResponse(f"{frontend_base}/finance/integrations?{params}")


@integrations_router.delete("/integrations/gmail/connection", status_code=204)
def gmail_disconnect(
    _: User = Depends(require_permission("finance:write")),
    db: Session = Depends(get_db),
):
    GmailOAuthService(FinanceRepository(db)).disconnect()


@integrations_router.get("/integrations/settings/list", response_model=list[IntegrationSettingResponse])
def list_integration_settings(
    _: User = Depends(require_permission("finance:read")),
    db: Session = Depends(get_db),
):
    return IntegrationSettingsService(FinanceRepository(db)).list_settings()


@integrations_router.patch("/integrations/settings/{setting_key}", response_model=IntegrationSettingResponse)
def update_integration_setting(
    setting_key: str,
    payload: IntegrationSettingUpdate,
    _: User = Depends(require_permission("finance:write")),
    db: Session = Depends(get_db),
):
    return IntegrationSettingsService(FinanceRepository(db)).update_setting(
        setting_key,
        is_enabled=payload.is_enabled,
        config_value=payload.config_value,
    )


@integrations_router.post("/integrations/gmail/sync-historical", response_model=GmailSyncResultResponse)
def sync_gmail_historical(
    max_messages: int | None = Query(default=None, ge=1),
    _: User = Depends(require_permission("finance:write")),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    IntegrationSettingsService(repository).require_enabled(
        "gmail_historical",
        message="La importación histórica Gmail está desactivada en configuración.",
    )
    return GmailSyncService(repository).sync_historical(max_messages=max_messages)


@integrations_router.post("/integrations/gmail/poll", response_model=GmailSyncResultResponse)
def poll_gmail_new(
    max_messages: int = Query(default=50, ge=1, le=200),
    mark_read: bool = Query(default=True),
    _: User = Depends(require_permission("finance:write")),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    IntegrationSettingsService(repository).require_enabled(
        "gmail_realtime",
        message="El procesamiento de correos nuevos está desactivado en configuración.",
    )
    return GmailSyncService(repository).poll_new(max_messages=max_messages, mark_read=mark_read)


@integrations_router.post("/integrations/ocr", response_model=OcrExtractResponse)
async def extract_voucher_ocr(
    file: UploadFile = File(...),
    _: User = Depends(require_permission("finance:write")),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    settings_service = IntegrationSettingsService(repository)
    settings_service.require_enabled(
        "gemini_ocr",
        message="El OCR Gemini está desactivado en configuración.",
    )
    content = await file.read()
    if not content:
        raise AppException("No se envió ninguna imagen", status_code=400)
    data = OcrService.extract_voucher(
        content=content,
        mime_type=file.content_type or "image/jpeg",
        settings_service=settings_service,
    )
    return OcrExtractResponse(**data)


@integrations_router.get("/notifications", response_model=NotificationListResponse)
def list_notifications(
    limit: int = Query(default=20, ge=1, le=50),
    unread_only: bool = False,
    _: User = Depends(require_permission("finance:read")),
    db: Session = Depends(get_db),
):
    service = NotificationService(FinanceRepository(db))
    items = service.list_notifications(limit=limit, unread_only=unread_only)
    return NotificationListResponse(
        items=[
            NotificationResponse(
                id=item.id,
                kind=item.kind,
                title=item.title,
                message=item.message,
                operation_number=item.operation_number,
                transaction_id=item.transaction_id,
                is_read=item.is_read,
                created_at=serialize_datetime(item.created_at),
            )
            for item in items
        ],
        unread_count=service.count_unread(),
    )


@integrations_router.patch("/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    _: User = Depends(require_permission("finance:read")),
    db: Session = Depends(get_db),
):
    service = NotificationService(FinanceRepository(db))
    item = service.mark_read(notification_id)
    return NotificationResponse(
        id=item.id,
        kind=item.kind,
        title=item.title,
        message=item.message,
        operation_number=item.operation_number,
        transaction_id=item.transaction_id,
        is_read=item.is_read,
        created_at=serialize_datetime(item.created_at),
    )


@integrations_router.patch("/notifications/read-all")
def mark_all_notifications_read(
    _: User = Depends(require_permission("finance:read")),
    db: Session = Depends(get_db),
):
    service = NotificationService(FinanceRepository(db))
    updated = service.mark_all_read()
    return success_response({"updated": updated}, message="Notificaciones marcadas como leídas")


@integrations_router.post("/integrations/import/legacy", response_model=ImportResultResponse)
def import_legacy_rows(
    payload: LegacyImportRequest,
    _: User = Depends(require_permission("finance:write")),
    db: Session = Depends(get_db),
):
    service = IntegrationService(FinanceRepository(db))
    return service.import_legacy_rows(payload.rows)


@integrations_router.post("/integrations/sheets/sync", response_model=ImportResultResponse)
def sync_google_sheets(
    _: User = Depends(require_permission("finance:write")),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    settings_service = IntegrationSettingsService(repository)
    settings_service.require_enabled(
        "google_sheets",
        message="La sincronización Google Sheets está desactivada en configuración.",
    )
    sheet_id = settings_service.get_effective_value("google_spreadsheet_id")
    sheet_range = settings_service.get_effective_value("google_spreadsheet_range")
    rows = GoogleSheetsClient.fetch_rows(spreadsheet_id=sheet_id, cell_range=sheet_range)
    mapped_rows = LegacyFinanzasNegocioAdapter.from_sheet_rows(rows)
    service = IntegrationService(FinanceRepository(db))
    return service.import_mapped_rows(mapped_rows)


@integrations_router.get("/webhook-events", response_model=list[WebhookEventResponse])
def list_webhook_events(
    limit: int = Query(default=10, ge=1, le=50),
    _: User = Depends(require_permission("finance:read")),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    events = repository.list_webhook_events(limit=limit)
    return [
        WebhookEventResponse(
            id=event.id,
            source=event.source,
            operation_number=event.operation_number,
            status=event.status,
            transaction_id=event.transaction_id,
            created_at=serialize_datetime(event.created_at),
        )
        for event in events
    ]
