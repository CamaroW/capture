from __future__ import annotations

from pathlib import Path

from app.database import apply_migrations, database_connection


def test_initial_migration_is_idempotent_and_complete(tmp_path: Path) -> None:
    database_path = tmp_path / "recall.db"

    assert apply_migrations(database_path) == 1
    assert apply_migrations(database_path) == 1

    with database_connection(database_path) as connection:
        tables = {
            row["name"]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(captures)")
        }
        applied = connection.execute(
            "SELECT version, name FROM schema_migrations"
        ).fetchall()

    assert {"captures", "schema_migrations"}.issubset(tables)
    assert {
        "client_capture_id",
        "context_truncated",
        "caveats_json",
        "embedding_json",
        "enrichment_version",
    }.issubset(columns)
    assert [(row["version"], row["name"]) for row in applied] == [
        (1, "initial_captures")
    ]
