from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
import pytest_asyncio
from chat_server.api.models import UserCreate
from chat_server.connection.channel import Channel
from chat_server.connection.manager import ConnectionManager
from chat_server.connection.user import User
from chat_server.database.db import get_db
from chat_server.database.models import Base
from chat_server.main import app
from chat_server.protocol.messages import ChatSend, ChatSendPayload, UserFrom
from chat_server.security.utils import generate_access_token
from chat_server.services.channel_service import ChannelService
from chat_server.services.dashboard_service import DashboardService
from chat_server.services.message_broker import MessageBroker
from chat_server.services.moderation_service import ModerationService
from httpx import ASGITransport, AsyncClient
from sqlalchemy import StaticPool
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    """
    Create a fresh database for each test function.
    """
    engine = create_async_engine(DATABASE_URL, poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_session(test_engine):
    """
    Create a database Session for testing.
    """

    async_session = async_sessionmaker(test_engine, expire_on_commit=False)

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture
def sample_user():
    """
    Valid sample data for a User.
    """
    return {"username": "testuser", "password": "Testuserpassword1"}


@pytest.fixture
def user_create_obj(sample_user):
    """
    Provides a Pydantic UserCreate object for testing.
    """
    return UserCreate(**sample_user)


@pytest.fixture
def sample_chat_send() -> ChatSend:
    sender = UserFrom(username="testuser", is_guest=False)
    payload = ChatSendPayload(
        channel_id=1, sender=sender, content="This is a test message"
    )
    return ChatSend(timestamp=datetime.now(), id=uuid4(), payload=payload)


# Handler test fixtures


@pytest.fixture
def mock_websocket():
    """Mock WebSocket for testing handlers."""
    ws = AsyncMock()
    ws.send_json = AsyncMock()
    ws.close = AsyncMock()
    return ws


@pytest.fixture
def test_user():
    """Domain User object for testing."""
    return User(username="testuser", id=1, is_guest=False)


@pytest.fixture
def test_2_users():
    user1 = User(username="testuser1", id=1, is_guest=True)
    user2 = User(username="testuser2", id=2, is_guest=True)
    return user1, user2


@pytest.fixture
def guest_user():
    """Guest user for permission tests."""
    return User(username="Guest#1234", id=None, is_guest=True)


@pytest.fixture
def target_user():
    """Target user for command tests (kick, mute, etc)."""
    return User(username="victim", id=2, is_guest=False)


@pytest.fixture
def test_channel():
    """Domain Channel object for testing."""
    return Channel(id=1, name="general")


@pytest.fixture
def mock_manager():
    """Mock ConnectionManager with all services for handler tests."""
    manager = MagicMock(spec=ConnectionManager)

    # channel_srvc has mix of sync and async methods
    manager.channel_srvc = MagicMock(spec=ChannelService)
    # Async methods need explicit AsyncMock
    manager.channel_srvc.join_channel = AsyncMock()
    manager.channel_srvc.leave_channel = AsyncMock()
    manager.channel_srvc.send_to_channel = AsyncMock()
    manager.channel_srvc.leave_all_channels = AsyncMock()
    # Sync methods (is_member, get_channel_by_id, create_channel) work with MagicMock

    manager.broker = AsyncMock(spec=MessageBroker)
    manager.moderation = AsyncMock(spec=ModerationService)
    manager.send_error = AsyncMock()
    return manager


@pytest_asyncio.fixture
async def patched_session(test_engine):
    """
    Patches async_session to use the test database.
    Use this fixture in handler tests that need real DB operations.
    """
    async_session_maker = async_sessionmaker(test_engine, expire_on_commit=False)

    with patch("chat_server.database.db.async_session", async_session_maker):
        yield


@pytest_asyncio.fixture
async def test_client(test_engine):
    """
    HTTP client for tesing API endpoints with test database.
    """
    async_session_maker = async_sessionmaker(test_engine, expire_on_commit=False)

    async def override_get_db():
        async with async_session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(test_user):
    """
    Returns headers with valid JWT token for authenticated requests.
    """
    token = generate_access_token(test_user.id, timedelta(minutes=15))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def mock_dashboard_service():
    """
    Mock DashboardService for channel endpoint tests.
    """
    mock_service = MagicMock(spec=DashboardService)
    original = app.state.dashboard_service
    app.state.dashboard_service = mock_service
    yield mock_service
    app.state.dashboard_service = original
