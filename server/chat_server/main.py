from contextlib import asynccontextmanager
from fastapi import APIRouter, FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocketDisconnect

from chat_server.api import auth
from chat_server.api.dashboard.routes import dashboard_router
from chat_server.connection.manager import ConnectionManager
from chat_server.database.core import init_db
from chat_server.infrastructure.channel_manager import ChannelManager
from chat_server.infrastructure.connection_registry import ConnectionRegistry
from chat_server.services.authorization_service import AuthenticationService
from chat_server.services.channel_service import ChannelService
from chat_server.services.dashboard_service import DashboardService
from chat_server.services.membership_service import MembershipService
from chat_server.services.message_broker import MessageBroker
from chat_server.services.mute_service import MuteService
from chat_server.settings import settings

import logging
import sys

# Configure logging to work with uvicorn
logging.basicConfig(
    level=logging.DEBUG,
    format="{asctime}  |  {levelname}  |  {filename}::{funcName}  |  {message}",
    style="{",
    datefmt="%d-%m-%Y %H:%M",
    handlers=[logging.StreamHandler(sys.stdout)],
    force=True,  # Override any existing configuration
)

# Get logger for this module
logger = logging.getLogger(__name__)

# API Routes
api_router = APIRouter(prefix="/api/v1", tags=["v1"])
api_router.include_router(auth.router)
api_router.include_router(dashboard_router)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Database...")
    await init_db()

    yield

    logger.info("Program Exit.")


# Create FastAPI app with settings
app = FastAPI(
    title="Chat Server API",
    version="0.1.0",
    debug=settings.is_development,
    lifespan=lifespan,
)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.is_development else settings.ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


if settings.is_development:

    @app.get("/")
    def root():
        """Root endpoint."""
        return {
            "message": "Chat Server API",
            "environment": settings.ENVIRONMENT,
        }


connection_registry = ConnectionRegistry()
channel_manager = ChannelManager()
auth_service = AuthenticationService()
membership_service = MembershipService()
message_broker = MessageBroker(connection_registry)
channel_service = ChannelService(channel_manager, membership_service, message_broker)
dashboard_service = DashboardService(channel_service)

# Store dashboard_serivce in app.state for access in endpoints
app.state.dashboard_service = dashboard_service

manager = ConnectionManager(
    connection_registry,
    auth_service,
    message_broker,
    channel_service,
)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    try:
        await manager.accept_connection(websocket)
    except WebSocketDisconnect:
        logging.info("Connection closed by the server: Invalid HELLO initiaition")
        return

    try:
        while True:
            data = await websocket.receive_text()
            await manager.handle_message(websocket, data)
    except WebSocketDisconnect:
        logging.info("Connection closed by the client.")
        await manager.handle_disconnect(websocket)
