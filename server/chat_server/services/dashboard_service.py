from chat_server.connection.channel import Channel
from chat_server.connection.user import User
from chat_server.exceptions import ChannelDoesntExist
from chat_server.services.channel_service import ChannelService


class DashboardService:
    """
    Service for dashboard operations.

    Should only be used by REST API endpoints. Not to be used
    in the WebSocket chat application.
    """

    def __init__(self, channelsrvc: ChannelService) -> None:
        self._channelsrvc = channelsrvc

    def get_active_channels(self) -> list[Channel]:
        """
        Get the number of channels with at least 1 user.
        """
        return self._channelsrvc.get_channels_in_use()

    def get_channel_members(self, ch_id: int) -> set[User]:
        ch = self._channelsrvc.get_channel_by_id(ch_id)
        if not ch:
            raise ChannelDoesntExist()
        return self._channelsrvc.get_channel_members(ch)

    def get_active_connections(self) -> int:
        """
        Get the number of active connections (WebSocket).
        """
        return 0
