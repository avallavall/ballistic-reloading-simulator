"""API integration tests using httpx.AsyncClient with an in-memory SQLite database.

Tests cover: health, powders CRUD, bullets CRUD, cartridges CRUD,
rifles, direct simulation, ladder test, chrono import, and validation.

IMPORTANT: This module patches the database engine before importing app modules,
so it must be run as a standalone test module (not mixed with other app imports).
"""

import io
import os

# Override DATABASE_URL before any app module is imported
os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Now we can import app modules -- they'll pick up the SQLite URL
# But session.py creates engine at import time with the original asyncpg URL.
# So we must patch the engine and session factory directly.

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

POWDER_DATA = {
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

BULLET_DATA = {
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

CARTRIDGE_DATA = {
    "name": ".308 Winchester Test",
    "saami_max_pressure_psi": 62000,
    "cip_max_pressure_mpa": 415.0,
    "case_capacity_grains_h2o": 54.0,
    "case_length_mm": 51.18,
    "overall_length_mm": 71.12,
    "bore_diameter_mm": 7.62,
    "groove_diameter_mm": 7.82,
}


async def _create_powder(client):
    resp = await client.post("/api/v1/powders", json=POWDER_DATA)
    assert resp.status_code == 201
    return resp.json()


async def _create_bullet(client):
    resp = await client.post("/api/v1/bullets", json=BULLET_DATA)
    assert resp.status_code == 201
    return resp.json()


async def _create_cartridge(client):
    resp = await client.post("/api/v1/cartridges", json=CARTRIDGE_DATA)
    assert resp.status_code == 201
    return resp.json()


async def _create_rifle(client, cartridge_id):
    data = {
        "name": "Test Remington 700",
        "barrel_length_mm": 610.0,
        "twist_rate_mm": 305.0,
        "cartridge_id": cartridge_id,
        "chamber_volume_mm3": 4500.0,
    }
    resp = await client.post("/api/v1/rifles", json=data)
    assert resp.status_code == 201
    return resp.json()


async def _create_full_test_data(client):
    """Create powder, bullet, cartridge, and rifle; return their dicts."""
    powder = await _create_powder(client)
    bullet = await _create_bullet(client)
    cartridge = await _create_cartridge(client)
    rifle = await _create_rifle(client, cartridge["id"])
    return powder, bullet, cartridge, rifle


# ---------------------------------------------------------------------------
# Tests: Health
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_health_endpoint(client):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data


# ---------------------------------------------------------------------------
# Tests: Powders CRUD (5 tests)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_powder(client):
    data = await _create_powder(client)
    assert data["name"] == POWDER_DATA["name"]
    assert data["manufacturer"] == POWDER_DATA["manufacturer"]
    assert "id" in data


@pytest.mark.asyncio
async def test_list_powders(client):
    await _create_powder(client)
    resp = await client.get("/api/v1/powders")
    assert resp.status_code == 200
    items = resp.json()
    assert isinstance(items, list)
    assert len(items) >= 1
    assert items[0]["name"] == POWDER_DATA["name"]


@pytest.mark.asyncio
async def test_get_powder_by_id(client):
    created = await _create_powder(client)
    resp = await client.get(f"/api/v1/powders/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


@pytest.mark.asyncio
async def test_update_powder(client):
    created = await _create_powder(client)
    resp = await client.put(
        f"/api/v1/powders/{created['id']}",
        json={"name": "Updated Varget"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Varget"
    assert resp.json()["manufacturer"] == POWDER_DATA["manufacturer"]


@pytest.mark.asyncio
async def test_delete_powder(client):
    created = await _create_powder(client)
    resp = await client.delete(f"/api/v1/powders/{created['id']}")
    assert resp.status_code == 204

    resp2 = await client.get(f"/api/v1/powders/{created['id']}")
    assert resp2.status_code == 404


# ---------------------------------------------------------------------------
# Tests: Bullets CRUD (3 tests)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_bullet(client):
    data = await _create_bullet(client)
    assert data["name"] == BULLET_DATA["name"]
    assert data["weight_grains"] == BULLET_DATA["weight_grains"]
    assert "id" in data


@pytest.mark.asyncio
async def test_list_bullets(client):
    await _create_bullet(client)
    resp = await client.get("/api/v1/bullets")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1


@pytest.mark.asyncio
async def test_get_bullet_by_id(client):
    created = await _create_bullet(client)
    resp = await client.get(f"/api/v1/bullets/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["diameter_mm"] == BULLET_DATA["diameter_mm"]


# ---------------------------------------------------------------------------
# Tests: Cartridges CRUD (2 tests)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_cartridge(client):
    data = await _create_cartridge(client)
    assert data["name"] == CARTRIDGE_DATA["name"]
    assert data["saami_max_pressure_psi"] == CARTRIDGE_DATA["saami_max_pressure_psi"]


@pytest.mark.asyncio
async def test_list_cartridges(client):
    await _create_cartridge(client)
    resp = await client.get("/api/v1/cartridges")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1


# ---------------------------------------------------------------------------
# Tests: Direct Simulation (2 tests)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_direct_simulation(client):
    """POST /simulate/direct returns valid results with structural + harmonics fields."""
    powder, bullet, cartridge, rifle = await _create_full_test_data(client)

    sim_req = {
        "powder_id": powder["id"],
        "bullet_id": bullet["id"],
        "rifle_id": rifle["id"],
        "powder_charge_grains": 44.0,
        "coal_mm": 71.0,
        "seating_depth_mm": 5.0,
    }
    resp = await client.post("/api/v1/simulate/direct", json=sim_req)
    assert resp.status_code == 200
    data = resp.json()

    # Core fields
    assert data["peak_pressure_psi"] > 0
    assert data["muzzle_velocity_fps"] > 0
    assert data["barrel_time_ms"] > 0
    assert isinstance(data["pressure_curve"], list)
    assert len(data["pressure_curve"]) == 200
    assert isinstance(data["velocity_curve"], list)
    assert len(data["velocity_curve"]) == 200
    assert isinstance(data["is_safe"], bool)
    assert isinstance(data["warnings"], list)

    # Structural fields (from task #1)
    assert "hoop_stress_mpa" in data
    assert data["hoop_stress_mpa"] > 0
    assert "case_expansion_mm" in data
    assert data["case_expansion_mm"] > 0
    assert "erosion_per_shot_mm" in data
    assert data["erosion_per_shot_mm"] >= 0

    # Harmonics fields (from task #2)
    assert "barrel_frequency_hz" in data
    assert data["barrel_frequency_hz"] > 0
    assert "optimal_barrel_times" in data
    assert isinstance(data["optimal_barrel_times"], list)
    assert len(data["optimal_barrel_times"]) > 0
    assert "obt_match" in data
    assert isinstance(data["obt_match"], bool)


@pytest.mark.asyncio
async def test_direct_simulation_extended_curves(client):
    """POST /simulate/direct returns the new burn/energy/temperature/recoil curves."""
    powder, bullet, cartridge, rifle = await _create_full_test_data(client)

    sim_req = {
        "powder_id": powder["id"],
        "bullet_id": bullet["id"],
        "rifle_id": rifle["id"],
        "powder_charge_grains": 44.0,
        "coal_mm": 71.0,
        "seating_depth_mm": 5.0,
    }
    resp = await client.post("/api/v1/simulate/direct", json=sim_req)
    assert resp.status_code == 200
    data = resp.json()

    # Verify extended curves are present and have 200 points
    assert len(data["burn_curve"]) == 200
    assert len(data["energy_curve"]) == 200
    assert len(data["temperature_curve"]) == 200
    assert len(data["recoil_curve"]) == 200

    # Verify burn curve keys
    burn_pt = data["burn_curve"][10]
    assert "t_ms" in burn_pt
    assert "z" in burn_pt
    assert "dz_dt" in burn_pt
    assert "psi" in burn_pt

    # Verify energy curve keys
    energy_pt = data["energy_curve"][10]
    assert "t_ms" in energy_pt
    assert "ke_j" in energy_pt
    assert "ke_ft_lbs" in energy_pt
    assert "momentum_ns" in energy_pt

    # Verify temperature curve keys
    temp_pt = data["temperature_curve"][10]
    assert "t_ms" in temp_pt
    assert "t_gas_k" in temp_pt
    assert "q_loss_j" in temp_pt

    # Verify recoil curve keys
    recoil_pt = data["recoil_curve"][10]
    assert "t_ms" in recoil_pt
    assert "impulse_ns" in recoil_pt


@pytest.mark.asyncio
async def test_direct_simulation_curve_format(client):
    """Pressure curve points have t_ms/p_psi, velocity curve has x_mm/v_fps."""
    powder, bullet, cartridge, rifle = await _create_full_test_data(client)

    sim_req = {
        "powder_id": powder["id"],
        "bullet_id": bullet["id"],
        "rifle_id": rifle["id"],
        "powder_charge_grains": 42.0,
        "coal_mm": 71.0,
        "seating_depth_mm": 5.0,
    }
    resp = await client.post("/api/v1/simulate/direct", json=sim_req)
    assert resp.status_code == 200
    data = resp.json()

    p_pt = data["pressure_curve"][10]
    assert "t_ms" in p_pt
    assert "p_psi" in p_pt

    v_pt = data["velocity_curve"][10]
    assert "x_mm" in v_pt
    assert "v_fps" in v_pt


# ---------------------------------------------------------------------------
# Tests: Ladder Test (1 test)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ladder_test(client):
    """POST /simulate/ladder returns results for each charge step."""
    powder, bullet, cartridge, rifle = await _create_full_test_data(client)

    ladder_req = {
        "powder_id": powder["id"],
        "bullet_id": bullet["id"],
        "rifle_id": rifle["id"],
        "coal_mm": 71.0,
        "seating_depth_mm": 5.0,
        "charge_start_grains": 42.0,
        "charge_end_grains": 44.0,
        "charge_step_grains": 0.5,
    }
    resp = await client.post("/api/v1/simulate/ladder", json=ladder_req)
    assert resp.status_code == 200
    data = resp.json()

    assert "results" in data
    assert "charge_weights" in data
    # 42.0, 42.5, 43.0, 43.5, 44.0 = 5 steps
    assert len(data["charge_weights"]) == 5
    assert len(data["results"]) == 5
    # Velocity should increase with charge
    velocities = [r["muzzle_velocity_fps"] for r in data["results"]]
    assert velocities[-1] > velocities[0]


# ---------------------------------------------------------------------------
# Tests: Validation (1 test)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invalid_simulation_negative_charge(client):
    """Negative powder charge should return 422."""
    powder, bullet, cartridge, rifle = await _create_full_test_data(client)

    sim_req = {
        "powder_id": powder["id"],
        "bullet_id": bullet["id"],
        "rifle_id": rifle["id"],
        "powder_charge_grains": -5.0,
        "coal_mm": 71.0,
        "seating_depth_mm": 5.0,
    }
    resp = await client.post("/api/v1/simulate/direct", json=sim_req)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Tests: Chrono Import (2 tests)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chrono_import_simple_csv(client):
    """POST /chrono/import parses a simple CSV of velocities."""
    csv_content = "velocity\n2650\n2645\n2660\n2655\n2648\n"
    files = {"file": ("chrono.csv", io.BytesIO(csv_content.encode()), "text/csv")}
    resp = await client.post("/api/v1/chrono/import", files=files)
    assert resp.status_code == 200
    data = resp.json()
    assert data["shot_count"] == 5
    assert data["average_fps"] > 2640
    assert data["sd_fps"] > 0
    assert data["es_fps"] == 15.0  # 2660 - 2645


@pytest.mark.asyncio
async def test_chrono_import_too_few_shots(client):
    """Chrono import with < 2 readings returns 422."""
    csv_content = "velocity\n2650\n"
    files = {"file": ("chrono.csv", io.BytesIO(csv_content.encode()), "text/csv")}
    resp = await client.post("/api/v1/chrono/import", files=files)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Tests: 404 on missing resources (1 test)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_nonexistent_powder_returns_404(client):
    resp = await client.get("/api/v1/powders/00000000-0000-0000-0000-000000000001")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Tests: Parametric Search (8 tests)
# ---------------------------------------------------------------------------

POWDER_DATA_3CURVE = {
    **POWDER_DATA,
    "name": "Test 3Curve Powder",
    "ba": 1.5,
    "bp": 0.3,
    "br": 0.2,
    "brp": 0.1,
    "z1": 0.30,
    "z2": 0.70,
    "a0": 5.0,
}


SECOND_POWDER_DATA = {
    "name": "Test H4895",
    "manufacturer": "Hodgdon",
    "burn_rate_relative": 78,
    "force_constant_j_kg": 920000,
    "covolume_m3_kg": 0.00095,
    "flame_temp_k": 3900,
    "gamma": 1.23,
    "density_g_cm3": 0.95,
    "burn_rate_coeff": 1.4e-8,
    "burn_rate_exp": 0.84,
}


async def _parametric_request(client, cartridge_id, bullet_id, rifle_id, **overrides):
    """Build and send a parametric search request."""
    req = {
        "rifle_id": rifle_id,
        "bullet_id": bullet_id,
        "cartridge_id": cartridge_id,
        "coal_mm": 71.0,
        "charge_steps": 3,
    }
    req.update(overrides)
    return await client.post("/api/v1/simulate/parametric", json=req)


@pytest.mark.asyncio
async def test_parametric_search_success(client):
    """POST /simulate/parametric returns results with all powders."""
    powder, bullet, cartridge, rifle = await _create_full_test_data(client)

    resp = await _parametric_request(client, cartridge["id"], bullet["id"], rifle["id"])
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_powders_tested"] == 1
    assert data["rifle_name"] == "Test Remington 700"
    assert data["cartridge_name"] == ".308 Winchester Test"
    assert data["saami_max_psi"] == 62000
    assert data["total_time_ms"] > 0
    assert len(data["results"]) == 1


@pytest.mark.asyncio
async def test_parametric_search_invalid_rifle(client):
    """Nonexistent rifle_id returns 404."""
    _, bullet, cartridge, _ = await _create_full_test_data(client)
    resp = await _parametric_request(
        client, cartridge["id"], bullet["id"],
        "00000000-0000-0000-0000-000000000099",
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_parametric_search_invalid_bullet(client):
    """Nonexistent bullet_id returns 404."""
    _, _, cartridge, rifle = await _create_full_test_data(client)
    resp = await _parametric_request(
        client, cartridge["id"],
        "00000000-0000-0000-0000-000000000099",
        rifle["id"],
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_parametric_search_invalid_cartridge(client):
    """Nonexistent cartridge_id returns 404."""
    _, bullet, _, rifle = await _create_full_test_data(client)
    resp = await _parametric_request(
        client, "00000000-0000-0000-0000-000000000099",
        bullet["id"], rifle["id"],
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_parametric_search_results_sorted(client):
    """Viable results are sorted by velocity descending."""
    powder, bullet, cartridge, rifle = await _create_full_test_data(client)
    # Create a second powder
    resp2 = await client.post("/api/v1/powders", json=SECOND_POWDER_DATA)
    assert resp2.status_code == 201

    resp = await _parametric_request(client, cartridge["id"], bullet["id"], rifle["id"])
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_powders_tested"] == 2

    viable = [r for r in data["results"] if r["is_viable"]]
    if len(viable) >= 2:
        velocities = [r["muzzle_velocity_fps"] for r in viable]
        assert velocities == sorted(velocities, reverse=True)


@pytest.mark.asyncio
async def test_parametric_search_efficiency_calculated(client):
    """Viable results have efficiency > 0."""
    powder, bullet, cartridge, rifle = await _create_full_test_data(client)

    resp = await _parametric_request(client, cartridge["id"], bullet["id"], rifle["id"])
    assert resp.status_code == 200
    data = resp.json()

    viable = [r for r in data["results"] if r["is_viable"]]
    assert len(viable) >= 1
    for r in viable:
        assert r["efficiency"] > 0
        assert r["optimal_charge_grains"] is not None
        assert r["optimal_charge_grains"] > 0
        assert r["pressure_percent"] > 0


@pytest.mark.asyncio
async def test_parametric_search_all_results_included(client):
    """Each PowderSearchResult has all_results with charge_steps elements."""
    powder, bullet, cartridge, rifle = await _create_full_test_data(client)

    resp = await _parametric_request(
        client, cartridge["id"], bullet["id"], rifle["id"], charge_steps=4
    )
    assert resp.status_code == 200
    data = resp.json()

    for r in data["results"]:
        assert len(r["all_results"]) == 4
        for cr in r["all_results"]:
            assert "charge_grains" in cr
            assert "peak_pressure_psi" in cr
            assert "muzzle_velocity_fps" in cr
            assert "is_safe" in cr


@pytest.mark.asyncio
async def test_parametric_search_custom_charge_range(client):
    """Custom charge_percent_min/max constrains the charge range."""
    powder, bullet, cartridge, rifle = await _create_full_test_data(client)

    # Full range
    resp_full = await _parametric_request(
        client, cartridge["id"], bullet["id"], rifle["id"],
        charge_percent_min=0.70, charge_percent_max=1.0, charge_steps=3,
    )
    # Narrow range
    resp_narrow = await _parametric_request(
        client, cartridge["id"], bullet["id"], rifle["id"],
        charge_percent_min=0.80, charge_percent_max=0.90, charge_steps=3,
    )
    assert resp_full.status_code == 200
    assert resp_narrow.status_code == 200

    full_data = resp_full.json()["results"][0]["all_results"]
    narrow_data = resp_narrow.json()["results"][0]["all_results"]

    # Narrow range charges should all fall within the full range
    full_min = full_data[0]["charge_grains"]
    full_max = full_data[-1]["charge_grains"]
    narrow_min = narrow_data[0]["charge_grains"]
    narrow_max = narrow_data[-1]["charge_grains"]

    assert narrow_min >= full_min
    assert narrow_max <= full_max


# ---------------------------------------------------------------------------
# Tests: 3-Curve Powder Support (2 tests)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_powder_with_3curve_fields(client):
    """POST /powders with 3-curve fields stores and returns them correctly."""
    resp = await client.post("/api/v1/powders", json=POWDER_DATA_3CURVE)
    assert resp.status_code == 201
    data = resp.json()

    assert data["ba"] == 1.5
    assert data["bp"] == 0.3
    assert data["br"] == 0.2
    assert data["brp"] == 0.1
    assert data["z1"] == 0.30
    assert data["z2"] == 0.70
    assert data["a0"] == 5.0
    assert data["has_3curve"] is True

    # Verify GET returns same fields
    resp2 = await client.get(f"/api/v1/powders/{data['id']}")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["has_3curve"] is True
    assert data2["ba"] == 1.5


# ---------------------------------------------------------------------------
# Tests: Sensitivity Endpoint (4 tests)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_sensitivity_endpoint_success(client):
    """POST /simulate/sensitivity returns center, upper, lower simulations."""
    powder, bullet, cartridge, rifle = await _create_full_test_data(client)

    req = {
        "powder_id": powder["id"],
        "bullet_id": bullet["id"],
        "rifle_id": rifle["id"],
        "powder_charge_grains": 44.0,
        "coal_mm": 71.0,
        "seating_depth_mm": 5.0,
        "charge_delta_grains": 0.5,
    }
    resp = await client.post("/api/v1/simulate/sensitivity", json=req)
    assert resp.status_code == 200
    data = resp.json()

    # Check structure
    assert "center" in data
    assert "upper" in data
    assert "lower" in data
    assert "charge_center_grains" in data
    assert "charge_upper_grains" in data
    assert "charge_lower_grains" in data

    # Check charge values
    assert data["charge_center_grains"] == 44.0
    assert data["charge_upper_grains"] == 44.5
    assert data["charge_lower_grains"] == 43.5

    # Check each has curve data with 200 points
    for key in ["center", "upper", "lower"]:
        assert len(data[key]["pressure_curve"]) == 200
        assert len(data[key]["velocity_curve"]) == 200
        assert data[key]["peak_pressure_psi"] > 0
        assert data[key]["muzzle_velocity_fps"] > 0


@pytest.mark.asyncio
async def test_sensitivity_upper_higher_pressure(client):
    """More charge (upper) should produce higher pressure than center."""
    powder, bullet, cartridge, rifle = await _create_full_test_data(client)

    req = {
        "powder_id": powder["id"],
        "bullet_id": bullet["id"],
        "rifle_id": rifle["id"],
        "powder_charge_grains": 44.0,
        "coal_mm": 71.0,
        "seating_depth_mm": 5.0,
        "charge_delta_grains": 0.5,
    }
    resp = await client.post("/api/v1/simulate/sensitivity", json=req)
    assert resp.status_code == 200
    data = resp.json()

    assert data["upper"]["peak_pressure_psi"] >= data["center"]["peak_pressure_psi"]


@pytest.mark.asyncio
async def test_sensitivity_includes_extended_curves(client):
    """Sensitivity response includes the new burn/energy/temperature/recoil curves."""
    powder, bullet, cartridge, rifle = await _create_full_test_data(client)

    req = {
        "powder_id": powder["id"],
        "bullet_id": bullet["id"],
        "rifle_id": rifle["id"],
        "powder_charge_grains": 44.0,
        "coal_mm": 71.0,
        "seating_depth_mm": 5.0,
        "charge_delta_grains": 0.3,
    }
    resp = await client.post("/api/v1/simulate/sensitivity", json=req)
    assert resp.status_code == 200
    data = resp.json()

    for key in ["center", "upper", "lower"]:
        assert len(data[key]["burn_curve"]) == 200
        assert len(data[key]["energy_curve"]) == 200
        assert len(data[key]["temperature_curve"]) == 200
        assert len(data[key]["recoil_curve"]) == 200


@pytest.mark.asyncio
async def test_sensitivity_missing_powder_404(client):
    """Sensitivity with nonexistent powder returns 404."""
    _, bullet, cartridge, rifle = await _create_full_test_data(client)

    req = {
        "powder_id": "00000000-0000-0000-0000-000000000099",
        "bullet_id": bullet["id"],
        "rifle_id": rifle["id"],
        "powder_charge_grains": 44.0,
        "coal_mm": 71.0,
        "seating_depth_mm": 5.0,
    }
    resp = await client.post("/api/v1/simulate/sensitivity", json=req)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_direct_simulation_with_3curve_powder(client):
    """Direct simulation with a 3-curve powder works end-to-end."""
    # Create 3-curve powder
    powder_resp = await client.post("/api/v1/powders", json=POWDER_DATA_3CURVE)
    assert powder_resp.status_code == 201
    powder = powder_resp.json()

    # Create bullet, cartridge, rifle
    bullet = await _create_bullet(client)
    cartridge = await _create_cartridge(client)
    rifle = await _create_rifle(client, cartridge["id"])

    sim_req = {
        "powder_id": powder["id"],
        "bullet_id": bullet["id"],
        "rifle_id": rifle["id"],
        "powder_charge_grains": 44.0,
        "coal_mm": 71.0,
        "seating_depth_mm": 5.0,
    }
    resp = await client.post("/api/v1/simulate/direct", json=sim_req)
    assert resp.status_code == 200
    data = resp.json()

    # Should produce valid results
    assert data["peak_pressure_psi"] > 0
    assert data["muzzle_velocity_fps"] > 0
    assert data["barrel_time_ms"] > 0
    assert isinstance(data["is_safe"], bool)


# ---------------------------------------------------------------------------
# Tests: Quality Scoring API (5 tests)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_powder_sets_quality_score(client):
    """POST /powders computes quality_score, data_source, quality_level, quality_tooltip."""
    data = await _create_powder(client)
    assert data["quality_score"] > 0
    assert data["data_source"] == "manual"
    assert data["quality_level"] in ("success", "warning", "danger")
    assert "/100" in data["quality_tooltip"]


@pytest.mark.asyncio
async def test_update_powder_recomputes_quality(client):
    """PUT /powders/{id} recomputes quality_score after field changes."""
    created = await _create_powder(client)
    original_score = created["quality_score"]

    # Add a bonus field (web_thickness_mm) to increase completeness
    resp = await client.put(
        f"/api/v1/powders/{created['id']}",
        json={"web_thickness_mm": 0.4},
    )
    assert resp.status_code == 200
    updated = resp.json()
    # Score should change (increase since we filled a bonus field)
    assert updated["quality_score"] != original_score


@pytest.mark.asyncio
async def test_update_grt_powder_changes_source(client):
    """Editing a grt_community powder changes data_source to grt_modified."""
    # Create a powder with data_source=grt_community
    grt_data = {**POWDER_DATA, "name": "GRT Test Powder", "data_source": "grt_community"}
    resp = await client.post("/api/v1/powders", json=grt_data)
    assert resp.status_code == 201
    created = resp.json()
    assert created["data_source"] == "grt_community"

    # Edit any field
    resp2 = await client.put(
        f"/api/v1/powders/{created['id']}",
        json={"name": "GRT Test Modified"},
    )
    assert resp2.status_code == 200
    updated = resp2.json()
    assert updated["data_source"] == "grt_modified"


@pytest.mark.asyncio
async def test_powder_response_has_quality_tooltip(client):
    """GET /powders/{id} response includes quality_tooltip with expected format."""
    created = await _create_powder(client)
    resp = await client.get(f"/api/v1/powders/{created['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["quality_tooltip"], str)
    assert len(data["quality_tooltip"]) > 0
    assert "/100" in data["quality_tooltip"]
    assert "campos" in data["quality_tooltip"]


@pytest.mark.asyncio
async def test_web_thickness_mm_validation_bounds(client):
    """web_thickness_mm must be between 0.1 and 2.0 if provided."""
    # Below minimum (0.05 < 0.1) -> 422
    bad_data = {**POWDER_DATA, "name": "Bad WT Powder", "web_thickness_mm": 0.05}
    resp = await client.post("/api/v1/powders", json=bad_data)
    assert resp.status_code == 422

    # Valid value -> 201
    good_data = {**POWDER_DATA, "name": "Good WT Powder", "web_thickness_mm": 0.4}
    resp2 = await client.post("/api/v1/powders", json=good_data)
    assert resp2.status_code == 201
    assert resp2.json()["web_thickness_mm"] == 0.4
