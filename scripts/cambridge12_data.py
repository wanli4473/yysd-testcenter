"""Cambridge IELTS 12 test accessors."""

from __future__ import annotations

from scripts.cambridge12_listening import listening_tests
from scripts.cambridge12_reading import reading_tests
from scripts.cambridge12_writing import writing_tests

_L = listening_tests()
_R = reading_tests()
_W = writing_tests()


def listening_test(n: int) -> dict:
    return _L[n]


def reading_test(n: int) -> dict:
    return _R[n]


def writing_test(n: int) -> dict:
    return _W[n]
