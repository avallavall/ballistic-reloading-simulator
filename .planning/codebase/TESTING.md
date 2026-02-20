# Testing Patterns

**Analysis Date:** 2025-02-20

## Test Framework

**Runner:**
- pytest 7.x (exact version in `backend/requirements.txt`)
- Config: `backend/pytest.ini` or implicit pytest discovery
- Async support: `pytest-asyncio` plugin

**Assertion Library:**
- pytest built-in `assert` statements
- `pytest.approx()` for floating-point tolerance checks (e.g., `assert result == pytest.approx(50_000_000.0, rel=1e-9)`)

**Run Commands:**
```bash
# Run all tests
cd backend && python -m pytest tests/ -v

# Watch mode
Not configured; use IDE or manual re-run

# Coverage
pytest --cov=app tests/
```

## Test File Organization

**Location:**
- Separate from source: `backend/tests/` directory (not co-located with source files)

**Naming:**
- `test_*.py` prefix for all test modules
- Files mirror domain structure: `test_solver.py`, `test_thermodynamics.py`, `test_structural.py`, `test_api_integration.py`

**Structure:**
```
backend/
├── tests/
│   ├── conftest.py                    # Pytest configuration and shared fixtures
│   ├── test_thermodynamics.py         # 13 tests for Noble-Abel, Vieille, form function
│   ├── test_solver.py                 # 21 tests for ODE integration
│   ├── test_structural.py             # 28 tests for stress, expansion, erosion
│   ├── test_harmonics.py              # 17 tests for barrel frequency, OCW
│   ├── test_schema_validation.py      # 30 tests for Pydantic schema limits
│   └── test_api_integration.py        # 18 tests for REST endpoints
└── app/
    ├── core/
    ├── api/
    ├── models/
    └── schemas/
```

## Test Structure

**Suite Organization:**
- Class-based organization for related tests (e.g., `TestNobleAbelPressure`, `TestVieilleBurnRate`)
- Each test method tests one specific behavior/edge case
- Descriptive method names: `test_zero_burn_returns_zero`, `test_full_burn`, `test_denominator_zero_returns_inf`

Example from `backend/tests/test_thermodynamics.py`:
```python
class TestNobleAbelPressure:
    """Tests for noble_abel_pressure(mass_gas, volume, covolume, force, fraction_burned)."""

    def test_zero_burn_returns_zero(self):
        """When fraction_burned=0, no gas is produced so pressure must be zero."""
        result = noble_abel_pressure(
            mass_gas=0.003,
            volume=3e-5,
            covolume=0.001,
            force=950_000,
            fraction_burned=0.0,
        )
        assert result == 0.0
```

**Patterns:**
- **Setup pattern:** Helper functions define reusable parameter sets (e.g., `make_308_params()`, `valid_powder_data()`)
- **Teardown pattern:** Not explicitly used; async fixtures handle cleanup via `yield` (see conftest.py)
- **Assertion pattern:** Direct `assert` statements with descriptive docstrings explaining the test case

Example setup from `backend/tests/test_solver.py`:
```python
def make_308_params():
    """Return a realistic .308 Winchester / 168 gr HPBT / Varget-like parameter set."""
    powder = PowderParams(
        force_j_kg=950_000,
        covolume_m3_kg=0.001,
        burn_rate_coeff=1.6e-8,
        burn_rate_exp=0.86,
        gamma=1.24,
        density_kg_m3=920.0,
        flame_temp_k=4050.0,
        web_thickness_m=0.0004,
        theta=-0.2,
    )
    bullet = BulletParams(...)
    # ... return complete parameter set
```

## Mocking

**Framework:** `unittest.mock` (Python standard library)

**Patterns:**
- Patch specific functions at import location (e.g., `patch("app.core.solver.solve_ivp", ...)`)
- Mock used primarily to inject primer seed (Z_PRIMER=0.01) for ODE bootstrapping
- Wraps real function to replace initial condition then calls original

Example from `backend/tests/test_solver.py`:
```python
def simulate_with_primer(powder, bullet, cartridge, rifle, load, z0=Z_PRIMER):
    """Run simulate() but patch the initial condition to seed a small Z for ignition."""
    from scipy.integrate import solve_ivp as real_solve_ivp

    def patched_solve_ivp(rhs, t_span, y0, **kwargs):
        # Replace the first element (Z) with a small primer seed
        # ODE state vector is [Z, x, v, Q_loss]
        y0_seeded = [z0, y0[1], y0[2], y0[3]]
        return real_solve_ivp(rhs, t_span, y0_seeded, **kwargs)

    with patch("app.core.solver.solve_ivp", side_effect=patched_solve_ivp):
        return simulate(powder, bullet, cartridge, rifle, load)
```

**What to Mock:**
- ODE solver entry point for bootstrapping/seed injection
- Database engine for API tests (see `test_api_integration.py` where asyncpg is replaced with aiosqlite)

**What NOT to Mock:**
- Physical calculation functions (solver, thermodynamics, structural) — test actual behavior
- Database operations in API tests — use in-memory SQLite to test full integration
- Response serialization — verify actual Pydantic model behavior

Example from `backend/tests/test_api_integration.py`:
```python
# Do NOT mock db.execute(); instead override the session factory
app.dependency_overrides[get_db] = _override_get_db
```

## Fixtures and Factories

**Test Data:**
- Helper functions generate valid parameter dictionaries
- Dataclass factories for domain objects (e.g., `make_308_params()` returns `PowderParams`, `BulletParams`, etc.)

Example from `backend/tests/test_schema_validation.py`:
```python
def valid_powder_data():
    return dict(
        name="Varget",
        manufacturer="Hodgdon",
        burn_rate_relative=50.0,
        force_constant_j_kg=950_000,
        covolume_m3_kg=0.001,
        flame_temp_k=3500.0,
        gamma=1.24,
        density_g_cm3=0.92,
        burn_rate_coeff=1.6e-8,
        burn_rate_exp=0.86,
    )
```

**Location:**
- `backend/tests/conftest.py`: Shared pytest fixtures (database setup, async client)
- `backend/tests/test_*.py`: Module-specific helpers (e.g., `make_308_params()`, `valid_powder_data()`)

**Async Fixtures:**
```python
@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Create all tables before each test and drop them after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
```

## Coverage

**Requirements:** No enforced coverage target detected

**View Coverage:**
```bash
pytest --cov=app tests/
```

**Current Status:** 127 total tests passing:
- 13 thermodynamics tests
- 21 solver tests
- 28 structural tests
- 17 harmonics tests
- 30 schema validation tests
- 18 API integration tests

## Test Types

**Unit Tests:**
- **Scope:** Individual functions (thermodynamics, solver, structural, harmonics)
- **Approach:** Direct function calls with known inputs, verify outputs against analytical solutions
- **Example:** `test_zero_burn_returns_zero` verifies that Noble-Abel pressure returns 0.0 when fraction_burned=0
- **Files:** `test_thermodynamics.py`, `test_structural.py`, `test_harmonics.py`

**Integration Tests:**
- **Scope:** Full simulation pipeline (solver integration with thermodynamics + structural + harmonics)
- **Approach:** End-to-end simulation with realistic .308 Winchester parameters, verify pressure/velocity curves
- **Example:** `test_308_win_max_pressure` simulates complete ballistic cycle and verifies peak pressure is safe
- **Files:** `test_solver.py` (marked with docstring "integration tests" for full ODE solve), `test_api_integration.py`

**Schema Validation Tests:**
- **Scope:** Pydantic validators enforce physical limits on input fields
- **Approach:** Create objects with invalid values (outside Field constraints), verify ValidationError is raised
- **Example:** `test_burn_rate_relative_cannot_be_negative` passes `burn_rate_relative=-1` and expects `ValidationError`
- **File:** `test_schema_validation.py` (30 tests covering all Create/Update schemas)

**API Integration Tests:**
- **Scope:** FastAPI endpoints with real database (in-memory SQLite)
- **Approach:** POST/GET/PUT/DELETE requests via `AsyncClient`, verify JSON responses and status codes
- **Example:** `test_create_powder_and_fetch` creates powder via POST, retrieves via GET, verifies fields match
- **Setup:** Database engine patched before app import to use SQLite instead of PostgreSQL
- **File:** `test_api_integration.py` (18 tests covering CRUD, simulate, ladder test, chrono import, validation)

## Common Patterns

**Analytical Verification:**
Tests include hand-calculated expected values with comments showing the formula
```python
def test_full_burn(self):
    """Full burn (psi=1.0) should give a higher pressure than partial burn."""
    P_full = noble_abel_pressure(
        mass_gas=0.003,
        volume=3e-5,
        covolume=0.001,
        force=950_000,
        fraction_burned=1.0,
    )
    # Analytical: 950000*0.003*1.0 / (3e-5 - 0.003*1.0*0.001)
    #           = 2850 / (3e-5 - 3e-6)
    #           = 2850 / 2.7e-5 = 105_555_555.56 Pa
    assert P_full == pytest.approx(2850.0 / 2.7e-5, rel=1e-9)
```

**Async Testing:**
```python
@pytest_asyncio.fixture
async def client(setup_database):
    """Create an httpx.AsyncClient wired to the FastAPI app with test DB."""
    app.dependency_overrides[get_db] = _override_get_db
    limiter.reset()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

# Test usage:
async def test_create_powder(client: AsyncClient):
    response = await client.post("/powders", json=POWDER_DATA)
    assert response.status_code == 201
```

**Error Testing:**
```python
def test_burn_rate_relative_cannot_be_negative(self):
    """burn_rate_relative must be >= 0."""
    with pytest.raises(ValidationError):
        PowderCreate(
            **valid_powder_data(),
            burn_rate_relative=-1,  # Invalid
        )
```

**Rate Limiter Reset:**
API tests reset the rate limiter between tests to prevent 429 errors:
```python
from app.middleware import limiter
limiter.reset()  # Reset before each test
```

## Known Testing Limitations

**Missing E2E Tests:**
- No Playwright/Cypress tests for frontend
- Frontend state management (React Query) not tested directly

**Solver Bootstrapping Workaround:**
- ODE solver requires Z_PRIMER=0.01 to trigger combustion (Z=0 is stable equilibrium)
- All integration tests patch `solve_ivp` to inject primer seed
- This limitation is documented in test class docstring (see `TestSolverBootstrapping` in `test_solver.py`)

**Database Snapshot in Tests:**
- Tests use in-memory SQLite, not PostgreSQL
- Ensures fast test execution but catches different database errors than production

---

*Testing analysis: 2025-02-20*
