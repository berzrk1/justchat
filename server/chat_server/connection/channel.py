from pydantic import BaseModel


class Channel(BaseModel):
    id: int
    name: str

    def __eq__(self, other):
        return self.id == other.id

    def __hash__(self):
        return hash(str(self))
