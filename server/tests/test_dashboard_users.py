import pytest
from httpx import AsyncClient, head

from chat_server.api.models import UserCreate
from chat_server.database import crud

API_URL = "/api/v1/dashboard"


class TestListUsers:
    """
    Tests for GET /dashboard/users/
    """

    @pytest.mark.asyncio
    async def test_list_users_success(
        self, test_client: AsyncClient, test_session, auth_headers
    ):
        await crud.create_user(
            test_session, UserCreate(username="user1", password="Password1")
        )
        await crud.create_user(
            test_session, UserCreate(username="user2", password="Password2")
        )

        response = await test_client.get(f"{API_URL}/users/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total_users"] == 2
        assert data["users"][0]["username"] == "user1"
        assert data["users"][1]["username"] == "user2"

    @pytest.mark.asyncio
    async def test_list_users_pagination(
        self, test_client: AsyncClient, test_session, auth_headers
    ):
        """
        Test if pagination works
        """
        for i in range(6):
            await crud.create_user(
                test_session, UserCreate(username=f"user{i}", password=f"Password{i}")
            )

        response = await test_client.get(
            f"{API_URL}/users/?page=2&page_size=2", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_users"] == 6
        assert len(data["users"]) == 2
        assert data["users"][0]["username"] == "user2"

    @pytest.mark.asyncio
    async def test_list_users_unauthorized(self, test_client: AsyncClient):
        """
        401 is expected when no authorization is provided
        """
        response = await test_client.get(f"{API_URL}/users/")

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_users_username_search(
        self, test_client: AsyncClient, test_session, auth_headers
    ):
        """
        Test if the search by username query works
        """
        await crud.create_user(
            test_session, UserCreate(username="user1", password="Password1")
        )
        await crud.create_user(
            test_session, UserCreate(username="test", password="Password2")
        )

        response = await test_client.get(
            f"{API_URL}/users/?search=user", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["users"]) == 1
        assert data["users"][0]["username"] == "user1"


class TestGetUser:
    """
    Tests for GET /dashboard/users/{user_id}
    """

    @pytest.mark.asyncio
    async def test_get_user_success(
        self, test_client: AsyncClient, test_session, auth_headers
    ):
        """
        Get user details
        """
        user = await crud.create_user(
            test_session, UserCreate(username="testuser", password="Password1")
        )

        assert user

        response = await test_client.get(
            f"{API_URL}/users/{user.id}", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == user.id
        assert data["username"] == "testuser"

    @pytest.mark.asyncio
    async def test_get_user_not_found(
        self, test_client: AsyncClient, test_session, auth_headers
    ):
        """
        404 is returned for non-existent user.
        """

        # The database can't be empty otherwise the auth_headers won't work
        user = await crud.create_user(
            test_session, UserCreate(username="testuser", password="Password1")
        )

        response = await test_client.get(f"{API_URL}/users/99999", headers=auth_headers)

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_user_unauthorized(self, test_client: AsyncClient):
        """
        401 is expected when no authorization is provided
        """
        response = await test_client.get(
            f"{API_URL}/users/666",
        )

        assert response.status_code == 401


class TestUpdateUser:
    """
    Tests for PATCH /dashboard/users/{user_id}
    """

    @pytest.mark.asyncio
    async def test_update_username_success(
        self, test_client: AsyncClient, test_session, auth_headers
    ):
        """
        Can change the username
        """

        user = await crud.create_user(
            test_session, UserCreate(username="testuser", password="Password1")
        )

        assert user

        response = await test_client.patch(
            f"{API_URL}/users/{user.id}",
            headers=auth_headers,
            json={"username": "newname"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "newname"

    @pytest.mark.asyncio
    async def test_update_password_success(
        self, test_client: AsyncClient, test_session, auth_headers
    ):
        """
        Can change the password and login with the new password
        """

        user = await crud.create_user(
            test_session, UserCreate(username="testuser", password="Password1")
        )

        assert user

        response = await test_client.patch(
            f"{API_URL}/users/{user.id}",
            headers=auth_headers,
            json={"password": "TestPassword123"},
        )

        assert response.status_code == 200

        # Can login with the new password
        login_response = await test_client.post(
            "/api/v1/auth/login",
            data={
                "username": "testuser",
                "password": "TestPassword123",
            },
        )

        assert login_response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_user_not_found(
        self, test_client: AsyncClient, test_session, auth_headers
    ):
        """
        Return 404 for non-existent user
        """

        # Required at least 1 user in the database
        await crud.create_user(
            test_session, UserCreate(username="testuser", password="Password1")
        )
        response = await test_client.patch(
            f"{API_URL}/users/666",
            headers=auth_headers,
            json={"username": "newname"},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_duplicate_username(
        self, test_client: AsyncClient, test_session, auth_headers
    ):
        """
        Return 409 when username already exists
        """

        user1 = await crud.create_user(
            test_session, UserCreate(username="user1", password="Password1")
        )
        user2 = await crud.create_user(
            test_session, UserCreate(username="user2", password="Password2")
        )

        assert user1
        assert user2

        response = await test_client.patch(
            f"{API_URL}/users/{user2.id}",
            headers=auth_headers,
            json={"username": user1.username},
        )

        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_update_empty_body(
        self, test_client: AsyncClient, test_session, auth_headers
    ):
        """
        User detail should remain unchanged
        """

        user = await crud.create_user(
            test_session, UserCreate(username="testuser", password="Password1")
        )

        assert user

        response = await test_client.patch(
            f"{API_URL}/users/{user.id}", headers=auth_headers, json={}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"

    @pytest.mark.asyncio
    async def test_update_user_unauthorized(self, test_client: AsyncClient):
        """
        401 is expected when no authorization is provided
        """
        response = await test_client.patch(
            f"{API_URL}/users/666",
            json={"username": "testuser"},
        )

        assert response.status_code == 401


class TestDeleteUser:
    """
    Tests for DELETE /dashboard/users/{user_id}
    """

    @pytest.mark.asyncio
    async def test_delete_user_success(
        self, test_client: AsyncClient, test_session, auth_headers
    ):
        """
        Delete user and return 204.
        """

        user = await crud.create_user(
            test_session, UserCreate(username="testuser", password="Password1")
        )

        assert user

        response = await test_client.delete(
            f"{API_URL}/users/{user.id}", headers=auth_headers
        )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_update_user_unauthorized(self, test_client: AsyncClient):
        """
        401 is expected when no authorization is provided
        """
        response = await test_client.delete(
            f"{API_URL}/users/666",
        )

        assert response.status_code == 401


class TestGetUserMessages:
    """
    Tests for GET /dashboard/users/{user_id}/messages
    """

    @pytest.mark.asyncio
    async def test_get_messages_user_not_found(
        self, test_client: AsyncClient, test_session, auth_headers
    ):
        """
        Should return 404 when user doesn't exist
        """
        # Required at least 1 user in the database
        await crud.create_user(
            test_session, UserCreate(username="testuser", password="Password1")
        )
        response = await test_client.get(
            f"{API_URL}/users/666/messages",
            headers=auth_headers,
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_messages_empty(
        self, test_client: AsyncClient, test_session, auth_headers
    ):
        """
        Should return empty list for user with no messages.
        """
        # Required at least 1 user in the database
        user = await crud.create_user(
            test_session, UserCreate(username="testuser", password="Password1")
        )

        assert user

        response = await test_client.get(
            f"{API_URL}/users/{user.id}/messages",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0
        assert data["messages"] == []

    # TODO: Test for successful retrieval of messages sent
