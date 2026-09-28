from collections import defaultdict
from typing import Dict, List, Optional, Set

from fastapi import WebSocket


class RoomConnectionManager:
    """Keeps live WebSocket connections grouped by room_id.

    Each room gets its own isolated fan-out group: a broadcast for room A
    only ever iterates room A's connection set, so it is structurally
    impossible for a message meant for one canvas to leak into another.
    """

    def __init__(self) -> None:
        self._rooms: Dict[str, Set[WebSocket]] = defaultdict(set)
        # Per-room, per-socket display info (user_id/username/email), used
        # to answer "who else is in this room" for the room_users message.
        self._user_info: Dict[str, Dict[WebSocket, dict]] = defaultdict(dict)
        # Per-room canvas shapes snapshot for isolated room state
        self._room_shapes: Dict[str, List[dict]] = defaultdict(list)

    def get_room_shapes(self, room_id: str) -> List[dict]:
        """Returns the current canvas shapes for a specific room."""
        return list(self._room_shapes.get(room_id, []))

    def set_room_shapes(self, room_id: str, shapes: List[dict]) -> None:
        """Sets the entire canvas shapes list for a room."""
        self._room_shapes[room_id] = list(shapes)

    def apply_canvas_operation(self, room_id: str, operation: dict) -> None:
        """Applies a real-time canvas operation to the room's isolated state."""
        op_type = operation.get("operation_type")
        shapes = self._room_shapes[room_id]

        if op_type == "CREATE":
            shape = operation.get("object")
            if shape and isinstance(shape, dict):
                # Prevent duplicate ids
                shapes = [s for s in shapes if s.get("id") != shape.get("id")]
                shapes.append(shape)
                self._room_shapes[room_id] = shapes

        elif op_type == "UPDATE":
            shape = operation.get("object")
            if shape and isinstance(shape, dict):
                target_id = shape.get("id")
                updated = False
                for idx, s in enumerate(shapes):
                    if s.get("id") == target_id:
                        shapes[idx] = {**s, **shape}
                        updated = True
                        break
                if not updated:
                    shapes.append(shape)
                self._room_shapes[room_id] = shapes

        elif op_type == "DELETE":
            target_id = operation.get("id")
            if target_id:
                self._room_shapes[room_id] = [s for s in shapes if s.get("id") != target_id]

        elif op_type == "CLEAR":
            self._room_shapes[room_id] = []

        elif op_type == "REORDER":
            reordered_shapes = operation.get("shapes")
            if isinstance(reordered_shapes, list):
                self._room_shapes[room_id] = list(reordered_shapes)

    async def connect(self, room_id: str, websocket: WebSocket, user_info: dict) -> None:
        """Registers an already-accepted socket connection and its display
        info. NOTE: does NOT call websocket.accept() -- the caller
        (ws_routes.py) accepts the socket up front so it can send a proper
        close code/reason on auth or permission failure. Calling accept()
        a second time here raises RuntimeError since Starlette only allows
        one "websocket.accept" ASGI message per connection."""
        self._rooms[room_id].add(websocket)
        self._user_info[room_id][websocket] = user_info

    def set_user_info(self, room_id: str, websocket: WebSocket, info: dict) -> None:
        """Stores/updates this socket's display info for the room."""
        self._user_info[room_id][websocket] = info

    def room_user_info(self, room_id: str, exclude: Optional[WebSocket] = None) -> List[dict]:
        """Returns display info for every socket in the room except `exclude`."""
        return [info for ws, info in self._user_info.get(room_id, {}).items() if ws is not exclude]

    def disconnect(self, room_id: str, websocket: WebSocket) -> None:
        room = self._rooms.get(room_id)
        if room is not None:
            room.discard(websocket)
            if not room:
                del self._rooms[room_id]
        info_map = self._user_info.get(room_id)
        if info_map is not None:
            info_map.pop(websocket, None)
            if not info_map:
                del self._user_info[room_id]

    async def broadcast(
        self,
        room_id: str,
        message: dict,
        exclude: Optional[WebSocket] = None,
    ) -> None:
        """Sends to every connection in this room only. Never touches any
        other room's connection set -- that's the isolation guarantee."""
        dead: Set[WebSocket] = set()
        for ws in self._rooms.get(room_id, set()):
            if ws is exclude:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                # Connection is gone but hasn't been cleaned up yet --
                # drop it after we're done iterating.
                dead.add(ws)
        for ws in dead:
            self.disconnect(room_id, ws)

    def room_size(self, room_id: str) -> int:
        return len(self._rooms.get(room_id, set()))


# One process-wide manager, imported by the ws router. If you ever run
# multiple backend workers/processes, this in-memory manager only sees
# connections on its own process -- you'd need a pub/sub layer (e.g. Redis)
# to fan out across workers.
manager = RoomConnectionManager()