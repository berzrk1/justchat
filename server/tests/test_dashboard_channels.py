from httpx import AsyncClient
import pytest

from chat_server.api.models import ChannelMember, ChannelMembers, UserCreate
from chat_server.connection.channel import Channel
from chat_server.connection.user import User
from chat_server.database import crud
from chat_server.exceptions import ChannelDoesntExist

API_URL = "/api/v1/dashboard/channels"


class TestActiveChannels:
    """
    Tests for Active Channels API Endpoint
    """

    @pytest.mark.asyncio
    async def test_active_channel_success(
        self,
        test_client: AsyncClient,
        test_session,
        auth_headers,
        mock_dashboard_service,
    ):
        # The database can't be empty otherwise the auth_headers won't work
        await crud.create_user(
            test_session, UserCreate(username="testuser", password="Password1")
        )
        # Mock Return Values
        mock_dashboard_service.get_active_channels.return_value = [
            Channel(id=1, name="test1"),
            Channel(id=2, name="test2"),
        ]

        response = await test_client.get(f"{API_URL}/active", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 2
        assert len(data["channels"]) == 2
        assert data["channels"][0]["id"] == 1

    @pytest.mark.asyncio
    async def test_active_channel_empty(
        self,
        test_client: AsyncClient,
        test_session,
        auth_headers,
        mock_dashboard_service,
    ):
        # The database can't be empty otherwise the auth_headers won't work
        await crud.create_user(
            test_session, UserCreate(username="testuser", password="Password1")
        )
        # Mock Return Values
        mock_dashboard_service.get_active_channels.return_value = []

        response = await test_client.get(f"{API_URL}/active", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0
        assert len(data["channels"]) == 0

    @pytest.mark.asyncio
    async def test_active_channel_unauthorized(
        self,
        test_client: AsyncClient,
    ):
        """
        401 is expected when no authorization is provided
        """
        response = await test_client.get(f"{API_URL}/active")

        assert response.status_code == 401


class TestChannelMembers:
    """
    Tests for channels members
    """

    @pytest.mark.asyncio
    async def test_channel_members_single_user(
        self,
        test_client: AsyncClient,
        test_session,
        auth_headers,
        mock_dashboard_service,
    ):
        # The database can't be empty otherwise the auth_headers won't work
        await crud.create_user(
            test_session, UserCreate(username="testuser", password="Password1")
        )

        # Mock Return Values
        mock_dashboard_service.get_channel_members.return_value = {
            User("testuser", 1, False)
        }

        response = await test_client.get(f"{API_URL}/members/666", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        assert len(data["users"]) == 1
        assert data["users"][0]["id"] == 1
        assert data["users"][0]["username"] == "testuser"

    @pytest.mark.asyncio
    async def test_channel_members_multiple_users(
        self,
        test_client: AsyncClient,
        test_session,
        auth_headers,
        mock_dashboard_service,
    ):
        # The database can't be empty otherwise the auth_headers won't work
        await crud.create_user(
            test_session, UserCreate(username="testuser", password="Password1")
        )

        # Mock Return Values
        mock_dashboard_service.get_channel_members.return_value = {
            User("testuser1", 1, False),
            User("testuser2", 2, False),
            User("testuser3", 3, False),
        }

        response = await test_client.get(f"{API_URL}/members/666", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 3
        assert len(data["users"]) == 3

    @pytest.mark.asyncio
    async def test_channel_members_empty(
        self,
        test_client: AsyncClient,
        test_session,
        auth_headers,
        mock_dashboard_service,
    ):
        """
        404 is raised because channel doesn't exist when there is no members.
        """
        # The database can't be empty otherwise the auth_headers won't work
        await crud.create_user(
            test_session, UserCreate(username="testuser", password="Password1")
        )

        # Mock Return Values
        mock_dashboard_service.get_channel_members.side_effect = ChannelDoesntExist()

        response = await test_client.get(f"{API_URL}/members/666", headers=auth_headers)

        assert response.status_code == 404
        data = response.json()
        assert data["detail"] == "Channel doesn't exist"

    @pytest.mark.asyncio
    async def test_channel_members_unauthorized(self, test_client: AsyncClient):
        """
        401 is expected when no authorization is provided
        """
        response = await test_client.get(f"{API_URL}/members/666")

        assert response.status_code == 401
