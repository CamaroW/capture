from __future__ import annotations

import json
from collections.abc import Iterator
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.api_models import CaptureCreateRequest, CaptureResponse
from app.config import REPOSITORY_ROOT, get_settings
from app.main import app, get_repository
from app.models import NewCapture
from app.repository import CaptureRepository


@pytest.fixture
def api_client(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> Iterator[tuple[TestClient, Path]]:
    database_path = tmp_path / "recall.db"
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("RECALL_DATABASE_PATH", str(database_path))
    get_settings.cache_clear()
    with TestClient(app) as client:
        yield client, database_path
    get_settings.cache_clear()


def fixture_request() -> dict[str, object]:
    path = REPOSITORY_ROOT / "contracts" / "examples" / "capture-request.json"
    return json.loads(path.read_text(encoding="utf-8"))


def test_api_models_match_checked_in_contract_fields() -> None:
    request_schema = json.loads(
        (REPOSITORY_ROOT / "contracts" / "capture.schema.json").read_text(
            encoding="utf-8"
        )
    )
    ready_response = json.loads(
        (
            REPOSITORY_ROOT
            / "contracts"
            / "examples"
            / "capture-ready-response.json"
        ).read_text(encoding="utf-8")
    )

    request_fields = CaptureCreateRequest.model_fields
    assert set(request_fields) == set(request_schema["properties"])
    required_fields = {
        name for name, field in request_fields.items() if field.is_required()
    }
    assert required_fields == set(request_schema["required"])
    assert set(CaptureResponse.model_fields) == set(ready_response)


def assert_validation_error(response) -> None:
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["details"]
    UUID(body["error"]["request_id"])


def test_valid_web_capture_returns_202_and_can_be_read(
    api_client: tuple[TestClient, Path],
) -> None:
    client, _ = api_client
    payload = fixture_request()

    created_response = client.post("/v1/captures", json=payload)

    assert created_response.status_code == 202
    created = created_response.json()
    UUID(created["id"])
    assert created["status"] == "processing"
    assert created["selected_text"] == payload["selected_text"]
    assert created["user_note"] == payload["user_note"]
    assert created["captured_at"] == payload["captured_at"]
    assert created["ai_title"] is None
    assert created["tags"] == []
    assert "embedding" not in created
    assert "embedding_json" not in created

    loaded_response = client.get(f"/v1/captures/{created['id']}")

    assert loaded_response.status_code == 200
    assert loaded_response.json() == created


def test_clipboard_capture_without_url_succeeds(
    api_client: tuple[TestClient, Path],
) -> None:
    client, _ = api_client
    payload = {
        "source_type": "clipboard",
        "source_app": "Terminal",
        "selected_text": "命令输出 mixed with English",
        "user_note": "Keep the exact output.",
        "captured_at": "2026-07-18T12:00:00-07:00",
    }

    response = client.post("/v1/captures", json=payload)

    assert response.status_code == 202
    assert response.json()["source_url"] is None
    assert response.json()["source_title"] is None


@pytest.mark.parametrize("user_note", ["", "长备注" * 20_000])
def test_empty_and_long_user_notes_round_trip(
    api_client: tuple[TestClient, Path],
    user_note: str,
) -> None:
    client, _ = api_client
    payload = {
        "source_type": "clipboard",
        "selected_text": "source",
        "user_note": user_note,
        "captured_at": "2026-07-18T19:00:00Z",
    }

    created = client.post("/v1/captures", json=payload)
    loaded = client.get(f"/v1/captures/{created.json()['id']}")

    assert created.status_code == 202
    assert loaded.status_code == 200
    assert loaded.json()["user_note"] == user_note


@pytest.mark.parametrize(
    "content",
    [
        {"selected_text": "", "source_title": "Page title"},
        {"selected_text": "", "surrounding_context": "Page context"},
    ],
)
def test_empty_selection_succeeds_with_title_or_context(
    api_client: tuple[TestClient, Path],
    content: dict[str, str],
) -> None:
    client, _ = api_client
    payload = {
        "source_type": "web",
        "captured_at": "2026-07-18T19:00:00Z",
        **content,
    }

    response = client.post("/v1/captures", json=payload)

    assert response.status_code == 202
    assert response.json()["selected_text"] == ""


def test_empty_or_whitespace_only_content_fails(
    api_client: tuple[TestClient, Path],
) -> None:
    client, _ = api_client
    payload = {
        "source_type": "web",
        "selected_text": "  ",
        "source_title": "\t",
        "surrounding_context": None,
        "captured_at": "2026-07-18T19:00:00Z",
    }

    assert_validation_error(client.post("/v1/captures", json=payload))


def test_unknown_request_field_fails(api_client: tuple[TestClient, Path]) -> None:
    client, _ = api_client
    payload = fixture_request()
    payload["invented_field"] = "not allowed"

    assert_validation_error(client.post("/v1/captures", json=payload))


@pytest.mark.parametrize(
    "field,value",
    [
        ("selected_text", "x" * 12_001),
        ("surrounding_context", "x" * 20_001),
    ],
)
def test_overlong_content_fails_visibly(
    api_client: tuple[TestClient, Path],
    field: str,
    value: str,
) -> None:
    client, _ = api_client
    payload = fixture_request()
    payload[field] = value

    assert_validation_error(client.post("/v1/captures", json=payload))


@pytest.mark.parametrize(
    "field,value",
    [
        ("client_capture_id", "not-a-uuid"),
        ("source_url", "not a uri"),
        ("captured_at", "2026-07-18T19:00:00"),
        ("captured_at", "0"),
    ],
)
def test_invalid_formatted_fields_fail(
    api_client: tuple[TestClient, Path],
    field: str,
    value: str,
) -> None:
    client, _ = api_client
    payload = fixture_request()
    payload[field] = value

    assert_validation_error(client.post("/v1/captures", json=payload))


def test_list_is_newest_first_and_paginated(
    api_client: tuple[TestClient, Path],
) -> None:
    client, database_path = api_client
    times = iter(
        [
            datetime(2026, 7, 18, 19, 0, tzinfo=timezone.utc),
            datetime(2026, 7, 18, 19, 1, tzinfo=timezone.utc),
            datetime(2026, 7, 18, 19, 2, tzinfo=timezone.utc),
        ]
    )
    repository = CaptureRepository(
        database_path,
        clock=lambda: next(times),
        initialize=False,
    )
    for text in ["oldest", "middle", "newest"]:
        repository.create(
            NewCapture(
                captured_at="2026-07-18T12:00:00-07:00",
                source_type="clipboard",
                selected_text=text,
            ),
            status="processing",
        )

    first_page = client.get("/v1/captures?limit=2&offset=0")
    second_page = client.get("/v1/captures?limit=2&offset=2")

    assert first_page.status_code == 200
    assert [item["selected_text"] for item in first_page.json()["items"]] == [
        "newest",
        "middle",
    ]
    assert first_page.json()["limit"] == 2
    assert first_page.json()["offset"] == 0
    assert [item["selected_text"] for item in second_page.json()["items"]] == [
        "oldest"
    ]


@pytest.mark.parametrize(
    "query",
    ["limit=0", "limit=101", "limit=word", "offset=-1", "offset=word"],
)
def test_pagination_limits_are_enforced(
    api_client: tuple[TestClient, Path],
    query: str,
) -> None:
    client, _ = api_client

    assert_validation_error(client.get(f"/v1/captures?{query}"))


def test_unknown_uuid_returns_documented_404_envelope(
    api_client: tuple[TestClient, Path],
) -> None:
    client, _ = api_client

    response = client.get(f"/v1/captures/{uuid4()}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "capture_not_found"
    assert response.json()["error"]["message"] == "Capture was not found."
    assert response.json()["error"]["details"] is None
    UUID(response.json()["error"]["request_id"])


def test_malformed_capture_id_returns_validation_envelope(
    api_client: tuple[TestClient, Path],
) -> None:
    client, _ = api_client

    assert_validation_error(client.get("/v1/captures/not-a-uuid"))


def test_unexpected_api_failure_uses_internal_error_envelope(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("RECALL_DATABASE_PATH", str(tmp_path / "recall.db"))
    get_settings.cache_clear()

    def fail_repository() -> CaptureRepository:
        raise RuntimeError("simulated repository failure")

    app.dependency_overrides[get_repository] = fail_repository
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.get("/v1/captures")
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "internal_error"
    assert response.json()["error"]["details"] is None
    UUID(response.json()["error"]["request_id"])
