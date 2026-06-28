from datetime import date
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import decode_access_token
from app.modules.auth.application.services import collect_permissions
from app.modules.auth.infrastructure.repositories import AuthRepository
from app.modules.finance.application.services import FinanceService
from app.modules.finance.domain.models import MovementType
from app.modules.finance.infrastructure.repositories import FinanceRepository
from app.shared.datetime_utils import now_app
from app.shared.ws_manager import FinanceWsClient, finance_ws_manager

router = APIRouter(prefix="/finance", tags=["finance-ws"])


def _default_preload_filters() -> dict[str, Any]:
    today = now_app().date()
    first_day = today.replace(day=1)
    return {
        "from": first_day.isoformat(),
        "to": today.isoformat(),
        "page": 1,
        "page_size": 20,
    }


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)


def _normalize_filters(raw: dict[str, Any] | None) -> dict[str, Any]:
    base = _default_preload_filters()
    if not raw:
        return base

    page = int(raw.get("page") or base["page"])
    page_size = int(raw.get("page_size") or base["page_size"])
    if page_size not in {20, 50, 100, 200}:
        page_size = 20

    normalized: dict[str, Any] = {
        "from": raw.get("from") or base["from"],
        "to": raw.get("to") or base["to"],
        "page": max(1, page),
        "page_size": page_size,
    }
    if raw.get("movement_type"):
        normalized["movement_type"] = raw["movement_type"]
    if raw.get("search"):
        normalized["search"] = str(raw["search"]).strip()
    return normalized


def _authenticate_ws_token(token: str) -> tuple[int, set[str]] | None:
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (ValueError, KeyError, TypeError):
        return None

    db = SessionLocal()
    try:
        user = AuthRepository(db).get_user_by_id(user_id)
        if user is None or not user.is_active:
            return None
        permissions = collect_permissions(user)
        if "finance:read" not in permissions:
            return None
        return user_id, permissions
    finally:
        db.close()


def _load_transactions_preload(filters: dict[str, Any]) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        service = FinanceService(FinanceRepository(db))
        movement_raw = filters.get("movement_type")
        movement = MovementType(movement_raw) if movement_raw else None
        result = service.list_transactions_paginated(
            from_date=_parse_date(filters.get("from")),
            to_date=_parse_date(filters.get("to")),
            movement_type=movement,
            search=filters.get("search") or None,
            page=int(filters["page"]),
            page_size=int(filters["page_size"]),
        )
        return result.model_dump(mode="json")
    finally:
        db.close()


async def _send_transactions_preload(client: FinanceWsClient, raw_filters: dict[str, Any] | None) -> None:
    filters = _normalize_filters(raw_filters)
    data = _load_transactions_preload(filters)
    await finance_ws_manager.send_json(
        client,
        {
            "type": "transactions.preload",
            "filters": filters,
            "data": data,
        },
    )


@router.websocket("/ws")
async def finance_websocket(websocket: WebSocket, token: str = Query(...)):
    auth = _authenticate_ws_token(token)
    if auth is None:
        await websocket.close(code=4401)
        return

    user_id, permissions = auth
    client: FinanceWsClient | None = None

    try:
        client = await finance_ws_manager.connect(
            websocket,
            user_id=user_id,
            permissions=permissions,
        )
        await finance_ws_manager.send_json(
            client,
            {"type": "connected", "user_id": user_id},
        )
        await _send_transactions_preload(client, _default_preload_filters())

        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type")
            if msg_type == "transactions.subscribe":
                await _send_transactions_preload(client, message.get("filters"))
            elif msg_type == "ping":
                await finance_ws_manager.send_json(client, {"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        if client is not None:
            await finance_ws_manager.disconnect(client)
