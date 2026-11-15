from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class CursorMeta(BaseModel):
    next_cursor: str | None = None
    has_more: bool = False
    limit: int


class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    meta: CursorMeta
