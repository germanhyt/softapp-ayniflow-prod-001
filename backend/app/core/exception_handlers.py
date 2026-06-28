from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.shared.exceptions import AppException


def error_response(
    message: str,
    *,
    status_code: int = 400,
    details: Any = None,
) -> JSONResponse:
    body: dict[str, Any] = {"success": False, "message": message}
    if details is not None and settings.debug:
        body["details"] = details
    return JSONResponse(status_code=status_code, content=body)


def success_response(data: Any = None, message: str = "ok") -> dict[str, Any]:
    return {"success": True, "message": message, "data": data}


async def app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
    return error_response(exc.message, status_code=exc.status_code)


async def http_exception_handler(_: Request, exc) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "Solicitud inválida"
    return error_response(detail, status_code=exc.status_code)


async def validation_exception_handler(_: Request, exc) -> JSONResponse:
    return error_response("Datos de entrada inválidos", status_code=422, details=exc.errors())


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    message = str(exc) if settings.debug else "Error interno del servidor"
    return error_response(message, status_code=500)
