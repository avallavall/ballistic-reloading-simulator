"""Chronograph data import endpoint.

Parses CSV uploads from Labradar or MagnetoSpeed chronographs
and returns statistical summary (average, SD, ES).
"""

import csv
import io
import math

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

router = APIRouter(prefix="/chrono", tags=["chronograph"])


class ChronoImportResponse(BaseModel):
    shot_count: int
    velocities_fps: list[float]
    average_fps: float
    sd_fps: float
    es_fps: float
    min_fps: float
    max_fps: float


def _parse_velocities(text: str) -> list[float]:
    """Extract velocity values from CSV text.

    Supports common formats:
    - Single column of numbers (one velocity per line)
    - Labradar format: multi-column CSV with a 'Velocity' or 'V1' header
    - MagnetoSpeed format: multi-column with 'Velocity' header
    """
    velocities: list[float] = []
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)

    if not rows:
        return velocities

    # Try to find a velocity column by header
    header = [col.strip().lower() for col in rows[0]]
    vel_col = None
    for i, h in enumerate(header):
        if h in ("velocity", "v1", "vel", "speed", "fps", "velocity(fps)", "v1(fps)"):
            vel_col = i
            break

    if vel_col is not None:
        # Header-based parsing
        for row in rows[1:]:
            if vel_col < len(row):
                val = row[vel_col].strip()
                if val:
                    try:
                        velocities.append(float(val))
                    except ValueError:
                        continue
    else:
        # Try single-column or first-column numeric parsing
        for row in rows:
            if not row:
                continue
            val = row[0].strip()
            # Skip comment lines and obvious headers
            if val.startswith("#") or val.startswith("//"):
                continue
            try:
                v = float(val)
                if 100.0 < v < 5000.0:  # reasonable velocity range in FPS
                    velocities.append(v)
            except ValueError:
                continue

    return velocities


@router.post("/import", response_model=ChronoImportResponse)
async def import_chrono_data(file: UploadFile = File(...)):
    """Import chronograph CSV data and return velocity statistics.

    Accepts CSV files from Labradar, MagnetoSpeed, or simple
    single-column velocity lists (values in FPS).
    """
    if file.content_type and file.content_type not in (
        "text/csv", "text/plain", "application/octet-stream",
        "application/vnd.ms-excel",
    ):
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")

    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    velocities = _parse_velocities(text)

    if len(velocities) < 2:
        raise HTTPException(
            422, "Could not extract at least 2 velocity readings from the file"
        )

    avg = sum(velocities) / len(velocities)
    variance = sum((v - avg) ** 2 for v in velocities) / (len(velocities) - 1)
    sd = math.sqrt(variance)
    min_v = min(velocities)
    max_v = max(velocities)
    es = max_v - min_v

    return ChronoImportResponse(
        shot_count=len(velocities),
        velocities_fps=velocities,
        average_fps=round(avg, 1),
        sd_fps=round(sd, 1),
        es_fps=round(es, 1),
        min_fps=round(min_v, 1),
        max_fps=round(max_v, 1),
    )
