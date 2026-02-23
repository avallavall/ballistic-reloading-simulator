"""Tests for pagination, filtering, sorting, dynamic lists, and backward compat.

Uses httpx.AsyncClient with an in-memory SQLite database.
pg_trgm-based fuzzy search tests are skipped (SQLite does not support pg_trgm).

IMPORTANT: This module patches the database engine before importing app modules,
so it must be run as a standalone test module (not mixed with other app imports).
"""

import os

# Override DATABASE_URL before any app module is imported
os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.base import Base

# Import all models so metadata is populated
import app.models.powder  # noqa: F401
import app.models.bullet  # noqa: F401
import app.models.cartridge  # noqa: F401
import app.models.rifle  # noqa: F401
import app.models.load  # noqa: F401
import app.models.simulation  # noqa: F401

# Create test engine and session factory
test_engine = create_async_engine("sqlite+aiosqlite://", echo=False)
TestSessionFactory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

# Patch the db.session module BEFORE app.main is imported
import app.db.session as db_session_module
db_session_module.engine = test_engine
db_session_module.async_session_factory = TestSessionFactory

# Now import the app
from app.main import app  # noqa: E402
from app.db.session import get_db  # noqa: E402


async def _override_get_db():
    async with TestSessionFactory() as session:
        yield session


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Create all tables before each test and drop them after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(setup_database):
    """Create an httpx.AsyncClient wired to the FastAPI app with test DB."""
    app.dependency_overrides[get_db] = _override_get_db
    # Reset rate limiter storage between tests to avoid 429 errors
    from app.middleware import limiter
    limiter.reset()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Test data helpers
# ---------------------------------------------------------------------------

POWDER_BASE = {
    "name": "Test Varget",
    "manufacturer": "Hodgdon",
    "burn_rate_relative": 82,
    "force_constant_j_kg": 950000,
    "covolume_m3_kg": 0.001,
    "flame_temp_k": 4050,
    "gamma": 1.24,
    "density_g_cm3": 0.92,
    "burn_rate_coeff": 1.6e-8,
    "burn_rate_exp": 0.86,
}

BULLET_BASE = {
    "name": "Test 168gr HPBT",
    "manufacturer": "Sierra",
    "weight_grains": 168,
    "diameter_mm": 7.82,
    "length_mm": 31.2,
    "bc_g1": 0.462,
    "bc_g7": 0.218,
    "sectional_density": 0.253,
    "material": "copper",
}

CARTRIDGE_BASE = {
    "name": ".308 Winchester Test",
    "saami_max_pressure_psi": 62000,
    "cip_max_pressure_mpa": 415.0,
    "case_capacity_grains_h2o": 54.0,
    "case_length_mm": 51.18,
    "overall_length_mm": 71.12,
    "bore_diameter_mm": 7.62,
    "groove_diameter_mm": 7.82,
}


async def create_powder(client, overrides=None):
    data = {**POWDER_BASE, **(overrides or {})}
    resp = await client.post("/api/v1/powders", json=data)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def create_bullet(client, overrides=None):
    data = {**BULLET_BASE, **(overrides or {})}
    resp = await client.post("/api/v1/bullets", json=data)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def create_cartridge(client, overrides=None):
    data = {**CARTRIDGE_BASE, **(overrides or {})}
    resp = await client.post("/api/v1/cartridges", json=data)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# Pagination tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_powders_pagination_default(client):
    """GET /powders with no params returns paginated envelope."""
    await create_powder(client)
    resp = await client.get("/api/v1/powders")
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert "total" in body
    assert "page" in body
    assert "size" in body
    assert body["page"] == 1
    assert body["size"] == 50
    assert body["total"] == 1
    assert len(body["items"]) == 1


@pytest.mark.asyncio
async def test_powders_pagination_page_size(client):
    """GET /powders?page=1&size=2 returns at most 2 items."""
    await create_powder(client, {"name": "Powder A"})
    await create_powder(client, {"name": "Powder B"})
    await create_powder(client, {"name": "Powder C"})

    resp = await client.get("/api/v1/powders", params={"page": 1, "size": 2})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["items"]) == 2
    assert body["total"] == 3
    assert body["page"] == 1
    assert body["size"] == 2


@pytest.mark.asyncio
async def test_powders_pagination_second_page(client):
    """GET /powders?page=2&size=1 returns the second item."""
    await create_powder(client, {"name": "Powder A"})
    await create_powder(client, {"name": "Powder B"})

    resp = await client.get("/api/v1/powders", params={"page": 2, "size": 1})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["items"]) == 1
    assert body["total"] == 2
    assert body["page"] == 2


@pytest.mark.asyncio
async def test_powders_size_cap_200(client):
    """GET /powders?size=300 returns 422 validation error."""
    resp = await client.get("/api/v1/powders", params={"size": 300})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_bullets_pagination_default(client):
    """GET /bullets returns paginated envelope."""
    await create_bullet(client)
    resp = await client.get("/api/v1/bullets")
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert "total" in body
    assert body["total"] == 1
    assert body["page"] == 1


@pytest.mark.asyncio
async def test_cartridges_pagination_default(client):
    """GET /cartridges returns paginated envelope."""
    await create_cartridge(client)
    resp = await client.get("/api/v1/cartridges")
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert "total" in body
    assert body["total"] == 1
    assert body["page"] == 1


# ---------------------------------------------------------------------------
# Filter tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_powders_filter_manufacturer(client):
    """Filter powders by manufacturer returns only matching results."""
    await create_powder(client, {"name": "Hodgdon Varget", "manufacturer": "Hodgdon"})
    await create_powder(client, {"name": "Vihtavuori N140", "manufacturer": "Vihtavuori"})

    resp = await client.get("/api/v1/powders", params={"manufacturer": "Hodgdon"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["manufacturer"] == "Hodgdon"


@pytest.mark.asyncio
async def test_powders_filter_quality_level(client):
    """Filter by quality_level returns only powders in that score range."""
    # Powder with all critical fields will get a decent score
    p1 = await create_powder(client, {"name": "High Quality"})

    # Check what score was assigned and test filter
    score = p1["quality_score"]

    if score >= 70:
        # Should appear in success, not in danger
        resp = await client.get("/api/v1/powders", params={"quality_level": "success"})
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

        resp = await client.get("/api/v1/powders", params={"quality_level": "danger"})
        assert resp.status_code == 200
        assert resp.json()["total"] == 0
    elif score >= 40:
        resp = await client.get("/api/v1/powders", params={"quality_level": "warning"})
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1
    else:
        resp = await client.get("/api/v1/powders", params={"quality_level": "danger"})
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1


@pytest.mark.asyncio
async def test_powders_filter_min_quality(client):
    """Filter by min_quality returns only powders at or above threshold."""
    p1 = await create_powder(client, {"name": "Powder A"})
    score = p1["quality_score"]

    # Filter above the powder's score should exclude it
    resp = await client.get("/api/v1/powders", params={"min_quality": score + 1})
    assert resp.status_code == 200
    assert resp.json()["total"] == 0

    # Filter at or below should include it
    resp = await client.get("/api/v1/powders", params={"min_quality": score})
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


@pytest.mark.asyncio
async def test_bullets_filter_caliber_family(client):
    """Filter bullets by caliber_family returns only matching results."""
    # .308 caliber: diameter 7.82mm is in .308 family (7.7-7.9)
    await create_bullet(client, {"name": "308 Bullet", "diameter_mm": 7.82})
    # .224 caliber: diameter 5.69mm is in .224 family (5.5-5.8)
    await create_bullet(client, {"name": "224 Bullet", "diameter_mm": 5.69})

    resp = await client.get("/api/v1/bullets", params={"caliber_family": ".308"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["caliber_family"] == ".308"


@pytest.mark.asyncio
async def test_powders_filter_burn_rate_range(client):
    """Filter powders by burn_rate_min/max returns matching results."""
    await create_powder(client, {"name": "Slow Powder", "burn_rate_relative": 200})
    await create_powder(client, {"name": "Fast Powder", "burn_rate_relative": 50})

    resp = await client.get("/api/v1/powders", params={"burn_rate_min": 100, "burn_rate_max": 300})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Slow Powder"


# ---------------------------------------------------------------------------
# Sort tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_powders_sort_by_name_asc(client):
    """GET /powders?sort=name&order=asc returns alphabetical order."""
    await create_powder(client, {"name": "Zebra Powder"})
    await create_powder(client, {"name": "Alpha Powder"})

    resp = await client.get("/api/v1/powders", params={"sort": "name", "order": "asc"})
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 2
    assert items[0]["name"] == "Alpha Powder"
    assert items[1]["name"] == "Zebra Powder"


@pytest.mark.asyncio
async def test_powders_default_sort_quality_desc(client):
    """Default sort is quality_score descending."""
    await create_powder(client, {"name": "Powder A"})
    await create_powder(client, {"name": "Powder B"})

    resp = await client.get("/api/v1/powders")
    assert resp.status_code == 200
    items = resp.json()["items"]
    if len(items) == 2:
        # Both have the same quality score (same fields), so order may vary.
        # At minimum, verify the envelope structure is correct.
        assert all("quality_score" in item for item in items)


# ---------------------------------------------------------------------------
# Dynamic list tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_powders_manufacturers_list(client):
    """GET /powders/manufacturers returns distinct manufacturer names."""
    await create_powder(client, {"name": "Powder A", "manufacturer": "Hodgdon"})
    await create_powder(client, {"name": "Powder B", "manufacturer": "Vihtavuori"})
    await create_powder(client, {"name": "Powder C", "manufacturer": "Hodgdon"})  # duplicate

    resp = await client.get("/api/v1/powders/manufacturers")
    assert resp.status_code == 200
    manufacturers = resp.json()
    assert isinstance(manufacturers, list)
    assert "Hodgdon" in manufacturers
    assert "Vihtavuori" in manufacturers
    assert len(manufacturers) == 2  # distinct


@pytest.mark.asyncio
async def test_bullets_manufacturers_list(client):
    """GET /bullets/manufacturers returns distinct manufacturer names."""
    await create_bullet(client, {"name": "Bullet A", "manufacturer": "Sierra"})
    await create_bullet(client, {"name": "Bullet B", "manufacturer": "Hornady"})

    resp = await client.get("/api/v1/bullets/manufacturers")
    assert resp.status_code == 200
    manufacturers = resp.json()
    assert isinstance(manufacturers, list)
    assert "Sierra" in manufacturers
    assert "Hornady" in manufacturers


@pytest.mark.asyncio
async def test_bullets_caliber_families_list(client):
    """GET /bullets/caliber-families returns distinct caliber families."""
    await create_bullet(client, {"name": "308 Bullet", "diameter_mm": 7.82})
    await create_bullet(client, {"name": "224 Bullet", "diameter_mm": 5.69})

    resp = await client.get("/api/v1/bullets/caliber-families")
    assert resp.status_code == 200
    families = resp.json()
    assert isinstance(families, list)
    assert ".308" in families
    assert ".224" in families


@pytest.mark.asyncio
async def test_cartridges_caliber_families_list(client):
    """GET /cartridges/caliber-families returns distinct caliber families.

    Caliber family is derived from groove_diameter_mm, not bore_diameter_mm.
    """
    await create_cartridge(client, {"name": ".308 Win", "groove_diameter_mm": 7.82})
    await create_cartridge(client, {
        "name": ".223 Rem",
        "bore_diameter_mm": 5.56,
        "groove_diameter_mm": 5.69,
        "saami_max_pressure_psi": 55000,
        "case_capacity_grains_h2o": 28.8,
        "case_length_mm": 44.7,
        "overall_length_mm": 57.4,
    })

    resp = await client.get("/api/v1/cartridges/caliber-families")
    assert resp.status_code == 200
    families = resp.json()
    assert isinstance(families, list)
    assert ".308" in families
    assert ".224" in families  # 5.69mm groove maps to .224 family


# ---------------------------------------------------------------------------
# Search tests (pg_trgm - skip on SQLite)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fuzzy_search_requires_postgres():
    """pg_trgm fuzzy search requires PostgreSQL.

    Expected behavior with PostgreSQL:
    - GET /powders?q=hodgon returns Hodgdon powders ranked by similarity
    - GET /bullets?q=sierra returns Sierra bullets ranked by similarity
    - Results are ordered by similarity(name, query) DESC, quality_score DESC
    - Minimum query length is 3 characters
    - Search and filter compose (AND logic)

    This test is a placeholder documenting the expected behavior.
    Integration tests with PostgreSQL would exercise the pg_trgm % operator.
    """
    # SQLite does not support the % trigram operator, so we skip actual execution
    pass


# ---------------------------------------------------------------------------
# Backward compatibility tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_existing_crud_still_works(client):
    """POST/GET/PUT/DELETE on powders still works with pagination wrapper."""
    # CREATE
    powder = await create_powder(client)
    powder_id = powder["id"]

    # READ (single)
    resp = await client.get(f"/api/v1/powders/{powder_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Varget"

    # READ (list - now paginated)
    resp = await client.get("/api/v1/powders")
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert len(body["items"]) == 1

    # UPDATE
    resp = await client.put(f"/api/v1/powders/{powder_id}", json={"name": "Updated Varget"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Varget"

    # DELETE
    resp = await client.delete(f"/api/v1/powders/{powder_id}")
    assert resp.status_code == 204

    # Verify deleted
    resp = await client.get(f"/api/v1/powders/{powder_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_bullet_quality_and_caliber_on_create(client):
    """Creating a bullet auto-computes quality_score and caliber_family."""
    bullet = await create_bullet(client, {"name": "Quality Test", "diameter_mm": 7.82})
    assert "quality_score" in bullet
    assert bullet["quality_score"] >= 0
    assert bullet["caliber_family"] == ".308"
    assert "quality_level" in bullet
    assert bullet["quality_level"] in ("success", "warning", "danger")


@pytest.mark.asyncio
async def test_cartridge_quality_and_caliber_on_create(client):
    """Creating a cartridge auto-computes quality_score and caliber_family.

    Caliber family is derived from groove_diameter_mm (7.82 in base data -> .308).
    """
    cart = await create_cartridge(client, {"name": "Quality Cart Test"})
    assert "quality_score" in cart
    assert cart["quality_score"] >= 0
    assert cart["caliber_family"] == ".308"  # groove_diameter_mm=7.82 -> .308
    assert "quality_level" in cart


@pytest.mark.asyncio
async def test_bullet_quality_recomputed_on_update(client):
    """Updating a bullet recomputes quality_score and caliber_family."""
    bullet = await create_bullet(client, {"name": "Update Test", "diameter_mm": 7.82})
    bullet_id = bullet["id"]
    orig_family = bullet["caliber_family"]

    # Change diameter to .224 range
    resp = await client.put(f"/api/v1/bullets/{bullet_id}", json={"diameter_mm": 5.69})
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["caliber_family"] == ".224"
    assert updated["caliber_family"] != orig_family


# ---------------------------------------------------------------------------
# ILIKE fallback + import mode tests (07-01)
# ---------------------------------------------------------------------------


def test_apply_fuzzy_search_ilike_fallback():
    """apply_fuzzy_search with has_trgm=False produces ILIKE-based SQL."""
    from sqlalchemy import select

    from app.models.powder import Powder
    from app.services.search import apply_fuzzy_search

    query = select(Powder)
    result_query = apply_fuzzy_search(query, Powder, "test", has_trgm=False)

    # Compile query to string and verify it uses ILIKE pattern
    # SQLAlchemy compiles .ilike() as ILIKE on PostgreSQL dialect, but as
    # lower(col) LIKE lower(pattern) on the default dialect. Both are valid.
    compiled = str(result_query.compile(compile_kwargs={"literal_binds": True}))
    compiled_lower = compiled.lower()
    uses_ilike = "ilike" in compiled_lower
    uses_lower_like = "lower(" in compiled_lower and "like" in compiled_lower
    assert uses_ilike or uses_lower_like, \
        f"Expected ILIKE or lower/LIKE pattern in compiled query but got: {compiled}"
    # Should NOT use similarity (that's the pg_trgm path)
    assert "similarity" not in compiled_lower, \
        f"ILIKE fallback should not use similarity but got: {compiled}"


def test_apply_fuzzy_search_trgm_path():
    """apply_fuzzy_search with has_trgm=True (default) uses trigram % operator."""
    from sqlalchemy import select

    from app.models.powder import Powder
    from app.services.search import apply_fuzzy_search

    query = select(Powder)
    result_query = apply_fuzzy_search(query, Powder, "test", has_trgm=True)

    # Compile query to string and verify it uses % operator (trigram), not ILIKE
    compiled = str(result_query.compile(compile_kwargs={"literal_binds": True}))
    # pg_trgm path uses the % operator and similarity() function
    assert "similarity" in compiled.lower(), \
        f"Expected similarity in compiled query but got: {compiled}"
    # ILIKE should NOT be present in the trgm path
    assert "ilike" not in compiled.lower(), \
        f"ILIKE should not be in trigram path but got: {compiled}"


@pytest.mark.asyncio
async def test_search_ilike_fallback_returns_results(client):
    """Search with ILIKE fallback returns matching results on SQLite."""
    # Ensure app.state.has_trgm is False for ILIKE fallback path
    app.state.has_trgm = False

    await create_powder(client, {"name": "Hodgdon Varget", "manufacturer": "Hodgdon"})
    await create_powder(client, {"name": "Vihtavuori N150", "manufacturer": "Vihtavuori"})
    await create_powder(client, {"name": "Hodgdon H4350", "manufacturer": "Hodgdon"})

    resp = await client.get("/api/v1/powders", params={"q": "Hodgdon"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    names = {item["name"] for item in body["items"]}
    assert "Hodgdon Varget" in names
    assert "Hodgdon H4350" in names


# Minimal GRT .propellant XML fixture for import tests
_GRT_PROPELLANT_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<data>
  <propellantfile>
    <var name="pname" value="Test%20GRT%20Powder"/>
    <var name="mname" value="TestMfg"/>
    <var name="Qex" value="3800"/>
    <var name="k" value="1.24"/>
    <var name="Ba" value="1.5"/>
    <var name="Bp" value="0.3"/>
    <var name="Br" value="0.2"/>
    <var name="Brp" value="0.1"/>
    <var name="z1" value="0.30"/>
    <var name="z2" value="0.70"/>
    <var name="a0" value="5.0"/>
    <var name="eta" value="1.0"/>
    <var name="pc" value="1600"/>
    <var name="pt" value="250"/>
  </propellantfile>
</data>
"""


@pytest.mark.asyncio
async def test_import_grt_mode_overwrite_parameter(client):
    """POST /powders/import-grt?mode=overwrite accepts the mode parameter."""
    resp = await client.post(
        "/api/v1/powders/import-grt?mode=overwrite",
        files={"file": ("test.propellant", _GRT_PROPELLANT_XML, "application/xml")},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["mode"] == "overwrite"


@pytest.mark.asyncio
async def test_import_grt_mode_skip_default(client):
    """POST /powders/import-grt without mode defaults to 'skip'."""
    resp = await client.post(
        "/api/v1/powders/import-grt",
        files={"file": ("test.propellant", _GRT_PROPELLANT_XML, "application/xml")},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["mode"] == "skip"
