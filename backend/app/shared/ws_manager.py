import asyncio
import json
from dataclasses import dataclass, field
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from app.core.logging import logger


@dataclass
class FinanceWsClient:
    websocket: WebSocket
    user_id: int
    permissions: set[str] = field(default_factory=set)


class FinanceWsManager:
    def __init__(self) -> None:
        self._clients: list[FinanceWsClient] = []
        self._lock = asyncio.Lock()

    async def connect(
        self,
        websocket: WebSocket,
        *,
        user_id: int,
        permissions: set[str],
    ) -> FinanceWsClient:
        await websocket.accept()
        client = FinanceWsClient(
            websocket=websocket,
            user_id=user_id,
            permissions=permissions,
        )
        async with self._lock:
            self._clients.append(client)
        logger.info("WebSocket conectado user_id=%s (activos=%s)", user_id, len(self._clients))
        return client

    async def disconnect(self, client: FinanceWsClient) -> None:
        async with self._lock:
            if client in self._clients:
                self._clients.remove(client)
        logger.info(
            "WebSocket desconectado user_id=%s (activos=%s)",
            client.user_id,
            len(self._clients),
        )

    async def send_json(self, client: FinanceWsClient, payload: dict[str, Any]) -> None:
        try:
            await client.websocket.send_text(json.dumps(payload, default=str))
        except (WebSocketDisconnect, RuntimeError) as exc:
            logger.debug("No se pudo enviar WS a user_id=%s: %s", client.user_id, exc)
            await self.disconnect(client)

    async def broadcast_finance(self, payload: dict[str, Any]) -> None:
        async with self._lock:
            targets = [c for c in self._clients if "finance:read" in c.permissions]

        for client in targets:
            await self.send_json(client, payload)

    def schedule_finance_event(self, payload: dict[str, Any]) -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        loop.create_task(self.broadcast_finance(payload))


finance_ws_manager = FinanceWsManager()
