from chat_server.connection.channel import Channel
from chat_server.connection.user import User
from chat_server.database.repositories.mute import MuteRepository


class MuteService:
    """
    Service to manage mutes of users.
    """

    def __init__(self, mod_repo: MuteRepository) -> None:
        self._repo = mod_repo

    async def mute_user(
        self,
        target: User,
        issuer: User,
        channel: Channel,
        duration: int = 60,
        reason: str = "",
    ):
        await self._repo.mute(target.id, issuer.id, channel.id, duration, reason)

    async def unmute_user(self, target: User, channel: Channel):
        await self._repo.unmute(target.id, channel.id)

    async def is_muted(self, target: User, channel: Channel) -> bool:
        return True if await self._repo.is_muted(target.id, channel.id) else False
