"""Minimal FastAPI application for the Recall localhost service."""

from __future__ import annotations

import logging
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Literal
from uuid import UUID

from fastapi import Depends, FastAPI, Query, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from app.api_errors import error_response
from app.api_models import (
    CaptureCreateRequest,
    CaptureListResponse,
    CaptureResponse,
    ErrorEnvelope,
)
from app.checklist import build_checklist_snapshot
from app.config import get_settings
from app.database import (
    MigrationError,
    apply_migrations,
    database_schema_is_current,
)
from app.repository import CaptureRepository


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


app = FastAPI(title="Recall Backend", version="0.3.0", lifespan=lifespan)


def get_repository() -> CaptureRepository:
    settings = get_settings()
    return CaptureRepository(settings.recall_database_path, initialize=False)


@app.exception_handler(RequestValidationError)
async def request_validation_error(
    _: Request,
    error: RequestValidationError,
) -> JSONResponse:
    details = [
        {
            "field": ".".join(str(part) for part in item["loc"]),
            "message": item["msg"],
            "type": item["type"],
        }
        for item in error.errors()
    ]
    return error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        code="validation_error",
        message="Request does not satisfy the API contract.",
        details=details,
    )


@app.exception_handler(Exception)
async def internal_server_error(request: Request, error: Exception) -> JSONResponse:
    logger.error(
        "Unhandled request error for %s %s",
        request.method,
        request.url.path,
        exc_info=(type(error), error, error.__traceback__),
    )
    return error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="internal_error",
        message="An unexpected backend error occurred.",
    )


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


@app.post(
    "/v1/captures",
    response_model=CaptureResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_capture(
    request: CaptureCreateRequest,
    repository: Annotated[CaptureRepository, Depends(get_repository)],
) -> CaptureResponse:
    record = repository.create(request.to_storage_model(), status="processing")
    return CaptureResponse.from_record(record)


@app.get("/v1/captures", response_model=CaptureListResponse)
def list_captures(
    repository: Annotated[CaptureRepository, Depends(get_repository)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CaptureListResponse:
    records = repository.list_captures(limit=limit, offset=offset)
    return CaptureListResponse(
        items=[CaptureResponse.from_record(record) for record in records],
        limit=limit,
        offset=offset,
    )


@app.get(
    "/v1/captures/{capture_id}",
    response_model=CaptureResponse,
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorEnvelope}},
)
def get_capture(
    capture_id: UUID,
    repository: Annotated[CaptureRepository, Depends(get_repository)],
) -> CaptureResponse | JSONResponse:
    record = repository.get(str(capture_id))
    if record is None:
        return error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="capture_not_found",
            message="Capture was not found.",
        )
    return CaptureResponse.from_record(record)


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
