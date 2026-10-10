from dataclasses import dataclass
from typing import Protocol

import numpy as np


@dataclass(frozen=True)
class Word:
    text: str
    bbox: tuple[float, float, float, float]  # x1, y1, x2, y2
    score: float


@dataclass(frozen=True)
class Table:
    rows: list[list[str]]


class OcrEngine(Protocol):
    name: str
    version: str

    def recognize(self, image: np.ndarray) -> list[Word]: ...

    def recognize_table(self, image: np.ndarray) -> Table | None: ...
