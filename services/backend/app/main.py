"""Minimal FastAPI application for the Recall localhost service."""

from __future__ import annotations

import logging
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, Response, status
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from app.checklist import build_checklist_snapshot
from app.config import get_settings
from app.database import (
    MigrationError,
    apply_migrations,
    database_schema_is_current,
)


logger = logging.getLogger(__name__)
CHECKLIST_HTML = Path(__file__).resolve().parent / "static" / "checklist.html"


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    database: Literal["ok", "error"]
    openai_configured: bool


def check_database(database_path: Path) -> Literal["ok", "error"]:
    """Open the configured SQLite file and execute a connectivity probe."""

    try:
        database_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(database_path, timeout=2) as connection:
            connection.row_factory = sqlite3.Row
            result = connection.execute("SELECT 1").fetchone()
            schema_is_current = database_schema_is_current(connection)
        query_succeeded = result is not None and result[0] == 1
        return "ok" if query_succeeded and schema_is_current else "error"
    except (OSError, sqlite3.Error):
        logger.exception("SQLite health probe failed for %s", database_path)
        return "error"


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    try:
        apply_migrations(settings.recall_database_path)
    except MigrationError:
        logger.exception("SQLite migration failed; health will report degraded")
    yield


app = FastAPI(title="Recall Backend", version="0.2.0", lifespan=lifespan)


@app.get("/dev/checklist", include_in_schema=False, response_class=HTMLResponse)
def checklist_dashboard() -> HTMLResponse:
    return HTMLResponse(
        CHECKLIST_HTML.read_text(encoding="utf-8"),
        headers={"Cache-Control": "no-store"},
    )


@app.get("/dev/checklist.json", include_in_schema=False)
def checklist_data() -> JSONResponse:
    return JSONResponse(
        build_checklist_snapshot(),
        headers={"Cache-Control": "no-store"},
    )


@app.get("/health", response_model=HealthResponse)
def health(response: Response) -> HealthResponse:
    settings = get_settings()
    database = check_database(settings.recall_database_path)
    if database == "error":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return HealthResponse(
            status="degraded",
            database=database,
            openai_configured=settings.openai_configured,
        )

    return HealthResponse(
        status="ok",
        database=database,
        openai_configured=settings.openai_configured,
    )
