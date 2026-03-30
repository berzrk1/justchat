import logging
from fastapi import WebSocket

from chat_server.connection.context import ConnectionContext
from chat_server.connection.user import User


class ConnectionRegistry:
    """
    Registry for active WebSocket Connections.

    Store ConnectionContext objects and provide
    fast lookups by WebSocket or User.
    """

    def __init__(self) -> None:
        # WebSocket -> Context
        self._connections: dict[WebSocket, ConnectionContext] = {}

        # User -> Context
        self._connection_by_user: dict[User, ConnectionContext] = {}

    def add(self, ctx: ConnectionContext) -> None:
        """
        Register a new connection.
        """
        self._connections[ctx.websocket] = ctx
        self._connection_by_user[ctx.user] = ctx

    def remove(self, websocket: WebSocket) -> ConnectionContext | None:
        """
        Remove a connection and returns its context if exists.
        """
        ctx = self._connections.pop(websocket, None)

        if ctx:
            self._connection_by_user.pop(ctx.user, None)
            logging.info(f"Connection removed: {repr(ctx.user)}")

        return ctx

    def get_by_websocket(self, websocket: WebSocket) -> ConnectionContext | None:
        """
        Get ConnectionContext by WebSocket.
        """
        return self._connections.get(websocket)

    def get_by_user(self, user: User) -> ConnectionContext | None:
        """
        Get ConnectionContext by User.
        """
        return self._connection_by_user.get(user)

    def count(self) -> int:
        """
        Get total number of active connections.
        """
        return len(self._connections)
