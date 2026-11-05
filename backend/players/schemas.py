from typing import Any

from ninja import Schema
from pydantic import ConfigDict, Field


class PlayerOut(Schema):
    code: str


class Position(Schema):
    x: int = Field(ge=0)
    y: int = Field(ge=0)


class Stats(Schema):

    model_config = ConfigDict(extra='forbid')

    gpa: float = Field(ge=0, le=10)
    energy: float = Field(ge=0, le=100)
    dignity: float = Field(ge=0, le=100)
    sanity: float = Field(ge=0, le=100)


class SaveData(Schema):
    version: int = Field(default=1, ge=1)
    scene: str = Field(min_length=1, max_length=64)
    position: Position
    stats: Stats
    flags: dict[str, Any] = Field(default_factory=dict)
