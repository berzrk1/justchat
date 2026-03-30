class User:
    def __init__(self, username: str, id: int, is_guest: bool = False) -> None:
        self.username = username
        self.id = id
        self._is_guest = is_guest

    @property
    def is_guest(self) -> bool:
        return self._is_guest

    def __eq__(self, other):
        return self.username == other.username

    def __hash__(self):
        return hash(str(self))

    def __repr__(self):
        if self.is_guest:
            return f"Guest({self.username})"
        return f"User(id={self.id}, username={self.username})"
