"""Shared sentence-chip bank. Never emit bank in answer order."""


def scramble(bank, answer):
    out = list(bank)
    if len(out) > 1 and out == list(answer):
        return out[1:] + out[:1]
    return out
