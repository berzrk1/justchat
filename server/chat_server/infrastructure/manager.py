import logging
from fastapi import WebSocket
from fastapi.websockets import WebSocketDisconnect
from pydantic import ValidationError

from chat_server.connection.context import ConnectionContext
from chat_server.infrastructure.connection_registry import ConnectionRegistry
from chat_server.protocol import messages
from chat_server.protocol.basemessage import BaseMessage
from chat_server.protocol.enums import MessageType
from chat_server.services.authorization_service import (
    AuthenticationError,
    AuthenticationService,
)
from chat_server.services.channel_service import ChannelService

SERVER_ONLY_MESSAGES = {
    MessageType.REACT_ADD,
    MessageType.REACT_REMOVE,
}


class ConnectionManager:
    """
    Manages WebSocket connections.
    """

    def __init__(
        self,
        connection_registry: ConnectionRegistry,
        auth_service: AuthenticationService,
        channel_service: ChannelService,
    ) -> None:
        self.connections = connection_registry
        self.auth = auth_service
        self.channel_srvc = channel_service

    async def accept_connection(self, websocket: WebSocket) -> None:
        """
        Accept and register a new WebSocket connection.

        For the connection to be accepted it needs to send
        a proper message (HELLO) to the server.

        If invalid HELLO message raise a WebSocketDisconnect
        """

        await websocket.accept()

        try:
            hello_msg = await websocket.receive_text()
            hello = messages.Hello.model_validate_json(hello_msg)
            user = await self.auth.authenticate(hello.payload.token)
        except ValidationError as e:
            logging.warning(f"Invalid HELLO message {e}")
            await self.send_error(websocket, "Invalid HELLO message")
            await websocket.close(reason="Invalid HELLO message")
            raise WebSocketDisconnect
        except AuthenticationError as e:
            logging.warning(f"Authentication failed: {e}")
            await websocket.close(reason=str(e))
            raise WebSocketDisconnect

        payload = messages.HelloPayload(user=messages.UserFrom.model_validate(user))
        msg = messages.Hello(payload=payload)

        # TODO: ConnectionManager should not interact with the broker directly,
        # at least not in this way
        await self.channel_srvc._broker.send_to_websocket(websocket, msg)

        ctx = ConnectionContext(websocket=websocket, user=user)
        self.connections.add(ctx)

        logging.info(f"Connection accepted for {repr(ctx.user)}")

    async def handle_disconnect(self, websocket: WebSocket) -> None:
        """
        Clean up for disconnect.
        """
        ctx = self.connections.remove(websocket)

        if ctx is None:
            logging.warning("Disconnect called for unknown connection")
            return

        await self.channel_srvc.leave_all_channels(ctx.user)

        logging.info(f"Connection closed by {repr(ctx.user)}")

    async def send_error(self, websocket: WebSocket, detail: str) -> None:
        """
        Send error message to client.
        """
        payload = messages.ErrorMessagePayload(detail=detail)
        err = messages.ErrorMessage(payload=payload)
        await websocket.send_text(err.model_dump_json())

    async def handle_message(self, websocket: WebSocket, data: str) -> None:
        """
        Handle all the messages/data received from the client.
        """
        from chat_server.handler import router

        try:
            logging.debug(f"Received: {data}")
            msg = BaseMessage.from_json(data)

            if msg is None:
                logging.warning(f"Client sent a malformed data: {data}")
                await self.send_error(websocket, "Invalid message format")
                return

            if msg.type in SERVER_ONLY_MESSAGES:
                await self.send_error(websocket, "Server-only message type")
                return

            ctx = self.connections.get_by_websocket(websocket)

            if ctx is None:
                logging.warning("Received message from connection without a Context")
                return

            await router.dispatch(ctx, msg, self)
        except ValidationError:
            logging.warning(f"Client sent a malformed data: {data}")
            await self.send_error(websocket, "Invalid message format")
