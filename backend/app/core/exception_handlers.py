from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.shared.exceptions import AppException

_VALIDATION_FIELD_LABELS = {
    "email": "Email",
    "username": "Usuario",
    "password": "Contraseña",
    "role_slug": "Rol",
    "full_name": "Nombre completo",
}


def _format_validation_errors(errors: list[dict[str, Any]]) -> str:
    messages: list[str] = []
    for err in errors:
        loc = [str(part) for part in err.get("loc", []) if part not in {"body", "query", "path"}]
        field = _VALIDATION_FIELD_LABELS.get(loc[-1], loc[-1] if loc else "Campo")
        raw_msg = str(err.get("msg", "Valor inválido"))
        if "email address" in raw_msg.lower() or "valid email" in raw_msg.lower():
            messages.append(f"{field}: ingresa un correo válido (ej. usuario@empresa.com).")
        elif "at least 8 characters" in raw_msg.lower():
            messages.append(f"{field}: debe tener al menos 8 caracteres.")
        elif "at least 3 characters" in raw_msg.lower():
            messages.append(f"{field}: debe tener al menos 3 caracteres.")
        else:
            messages.append(f"{field}: {raw_msg}")
    return " ".join(messages)


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
    errors = exc.errors()
    message = _format_validation_errors(errors) or "Datos de entrada inválidos"
    return error_response(message, status_code=422, details=errors if settings.debug else None)


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    message = str(exc) if settings.debug else "Error interno del servidor"
    return error_response(message, status_code=500)
