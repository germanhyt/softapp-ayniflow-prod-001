import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.database import Base, engine
from app.core.exception_handlers import (
    app_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.health import build_health_payload
from app.core.logging import configure_logging, logger
from app.core.middleware import RateLimitMiddleware, RequestLoggingMiddleware
from app.modules.auth.application.seed import seed_auth_data
from app.modules.auth.domain.models import Permission, Role, User  # noqa: F401
from app.modules.auth.presentation.routes import roles_router, router as auth_router, users_router
from app.modules.finance.application.catalog_seed import seed_finance_catalogs
from app.modules.finance.application.finance_schema_seed import ensure_finance_schema
from app.modules.finance.application.integration_settings_seed import seed_integration_settings
from app.modules.finance.application.gmail_poll_task import run_gmail_poll_loop
from app.modules.finance.application.seed import seed_finance_data
from app.modules.finance.domain.models import (
    Budget,
    FinanceBank,
    FinanceCategory,
    IntegrationSetting,
    FinanceGmailCredential,
    FinanceNotification,
    FinancePaymentType,
    ProcessedGmailMessage,
    Transaction,
    WebhookEvent,
)  # noqa: F401
from app.modules.finance.presentation.catalog_routes import router as finance_catalog_router
from app.modules.finance.presentation.integration_routes import (
    integrations_router,
    reports_router,
    webhook_router,
)
from app.modules.finance.presentation.routes import router as finance_router
from app.modules.finance.presentation.ws_routes import router as finance_ws_router
from app.shared.exceptions import AppException


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging(settings.log_json)
    Base.metadata.create_all(bind=engine)
    ensure_finance_schema()
    seed_auth_data()
    seed_finance_catalogs()
    seed_integration_settings()
    seed_finance_data()
    for warning in settings.production_warnings():
        logger.warning("Configuración de producción: %s", warning)
    logger.info("Aplicación iniciada")

    gmail_task = asyncio.create_task(run_gmail_poll_loop())
    logger.info("Gmail poll loop iniciado (intervalo base %ss)", settings.gmail_poll_interval_seconds)

    yield

    if gmail_task:
        gmail_task.cancel()
        try:
            await gmail_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)


@app.get("/health")
def healthcheck():
    payload = build_health_payload()
    code = status.HTTP_200_OK if payload["status"] == "ok" else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=code, content=payload)


@app.get("/health/live")
def liveness():
    return {"status": "ok", "service": "ayniflow-api"}


@app.get("/health/ready")
def readiness():
    payload = build_health_payload()
    code = status.HTTP_200_OK if payload["checks"].get("database") == "up" else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=code, content=payload)


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(roles_router)
app.include_router(finance_router)
app.include_router(finance_ws_router)
app.include_router(finance_catalog_router)
app.include_router(reports_router)
app.include_router(webhook_router)
app.include_router(integrations_router)
