import json
from types import SimpleNamespace
from unittest.mock import MagicMock

import anthropic
import httpx2
import pytest

from app.ai_providers import claude
from app.ai_providers.errors import AiBadOutputError, AiNotConfiguredError, AiUnavailableError
from app.config import settings
from app.schemas.ai import GenerateCardsRequest


##########################################################
#!                       FIXTURES
##########################################################
@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    mock = MagicMock()
    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")
    monkeypatch.setattr(claude, "_client", lambda: mock)
    return mock


def _request(**fields) -> GenerateCardsRequest:
    return GenerateCardsRequest.model_validate(
        {"sources": [{"type": "text", "text": "apple\nbanana"}], "mode": "qa", **fields}
    )


def _response(output: object, stop_reason: str = "end_turn") -> SimpleNamespace:
    text = output if isinstance(output, str) else json.dumps(output)
    return SimpleNamespace(content=[SimpleNamespace(type="text", text=text)], stop_reason=stop_reason)


def _card(front: str, back: str = "b") -> dict:
    return {"front": front, "back": back}


##########################################################
#!                       OUTPUT
##########################################################
def test_cards_are_cleaned_and_capped(client: MagicMock):
    client.messages.create.return_value = _response(
        {"cards": [_card("  What is A?  ", " A "), _card("   ", "dropped"), _card("B?"), _card("C?")]}
    )

    cards = claude.generate_cards(_request(count=2), [])

    assert [(card.front, card.back) for card in cards] == [("What is A?", "A"), ("B?", "b")]


@pytest.mark.parametrize(
    "output",
    [{"cards": []}, {"cards": [_card(" ", " ")]}],
    ids=["empty-list", "only-empty-cards"],
)
def test_empty_output_returns_no_cards(client: MagicMock, output: dict):
    client.messages.create.return_value = _response(output)
    assert claude.generate_cards(_request(), []) == []


@pytest.mark.parametrize(
    "response",
    [
        _response("not json"),
        _response({"items": []}),
        _response({"cards": [_card("a")]}, stop_reason="max_tokens"),
    ],
    ids=["not-json", "wrong-shape", "truncated"],
)
def test_invalid_output_raises_bad_output(client: MagicMock, response: SimpleNamespace):
    client.messages.create.return_value = response
    with pytest.raises(AiBadOutputError):
        claude.generate_cards(_request(), [])


##########################################################
#!                       PROMPT
##########################################################
def test_prompt_contains_all_inputs(client: MagicMock):
    client.messages.create.return_value = _response({"cards": [_card("New?")]})
    request = _request(
        mode="vocab",
        count=4,
        instructions="Use examples",
        keep_cards=[_card("Kept front", "Kept back")],
        avoid_cards=[_card("Avoided front")],
    )

    claude.generate_cards(request, ["Existing front"])

    kwargs = client.messages.create.call_args.kwargs
    message = kwargs["messages"][0]["content"]
    assert kwargs["model"] == settings.ai_model
    assert "Mode vocab" in kwargs["system"]
    assert kwargs["output_config"]["format"]["type"] == "json_schema"
    assert '<source index="1">\napple\nbanana\n</source>' in message
    assert "<instructions>\nUse examples\n</instructions>" in message
    assert "<front>Kept front</front><back>Kept back</back>" in message
    assert "<front>Avoided front</front>" in message
    assert "<front>Existing front</front>" in message
    assert "<card_count>3</card_count>" in message


##########################################################
#!                       ERRORS
##########################################################
def test_sdk_error_raises_unavailable(client: MagicMock):
    request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    client.messages.create.side_effect = anthropic.APIConnectionError(request=request)
    with pytest.raises(AiUnavailableError):
        claude.generate_cards(_request(), [])


def test_missing_api_key_raises_not_configured(client: MagicMock, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "anthropic_api_key", None)
    with pytest.raises(AiNotConfiguredError):
        claude.generate_cards(_request(), [])
    client.messages.create.assert_not_called()
