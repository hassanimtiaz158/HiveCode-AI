import logging
from typing import Any, Dict, List
from fastapi import WebSocket

logger = logging.getLogger("app.core.ws_manager")


class ConnectionManager:
    """Manages active WebSocket connections grouped by project_id."""

    def __init__(self):
        # project_id -> list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)
        logger.info(f"[WS] Client connected to project '{project_id}' (total: {len(self.active_connections[project_id])})")

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            if websocket in self.active_connections[project_id]:
                self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]
        logger.info(f"[WS] Client disconnected from project '{project_id}'")

    async def broadcast_to_project(self, project_id: str, message: Dict[str, Any]):
        """Broadcasts a JSON-serializable message to all clients of a project."""
        if project_id not in self.active_connections:
            return

        dead_connections = []
        for connection in self.active_connections[project_id]:
            try:
                await connection.send_json(message)
            except Exception as exc:
                logger.warning(f"[WS] Failed to send to a client of '{project_id}': {exc}")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead, project_id)


ws_manager = ConnectionManager()
