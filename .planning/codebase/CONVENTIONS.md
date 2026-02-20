# Coding Conventions

**Analysis Date:** 2025-02-20

## Naming Patterns

**Files:**
- Python files: `snake_case.py` (e.g., `thermodynamics.py`, `internal_ballistics.py`)
- TypeScript/React files: `camelCase.tsx` for components/pages, `camelCase.ts` for utilities (e.g., `usePowders.ts`, `Button.tsx`, `page.tsx`)
- Test files: `test_*.py` (e.g., `test_solver.py`, `test_schema_validation.py`)

**Functions:**
- Python: `snake_case` (e.g., `noble_abel_pressure`, `vieille_burn_rate`, `form_function`)
- TypeScript: `camelCase` (e.g., `getPowders`, `createPowder`, `updatePowder`)
- React hooks: prefix with `use` in `camelCase` (e.g., `usePowders`, `useSimulation`, `useLadderTest`)

**Variables:**
- Python: `snake_case` (e.g., `mass_gas`, `covolume_m3_kg`, `flame_temp_k`)
- TypeScript: `camelCase` for regular variables (e.g., `queryClient`, `editingId`, `showForm`)
- Constants in Python: `UPPER_SNAKE_CASE` (e.g., `GRAINS_TO_KG`, `PSI_TO_PA`, `Z_PRIMER`)
- Constants in TypeScript: `UPPER_SNAKE_CASE` for module constants (e.g., `API_BASE`, `API_PREFIX`)

**Types:**
- Python: Classes use `PascalCase` (e.g., `PowderParams`, `BulletParams`, `SimResult`)
- TypeScript: Interfaces use `PascalCase` (e.g., `Powder`, `Bullet`, `SimulationResult`, `ApiClientError`)
- Dataclass parameters in Python use descriptive `snake_case` with unit suffixes (e.g., `force_j_kg`, `covolume_m3_kg`, `flame_temp_k`)

## Code Style

**Formatting:**
- Python: 4-space indentation (implicit via file style)
- TypeScript/React: 2-space indentation (implicit via file style)
- Line length: no strict enforcer detected; files follow natural wrapping

**Linting:**
- Python: No ESLint/Pylint config detected; relies on code review
- TypeScript: No `.eslintrc*` file present; relies on IDE enforcement
- Prettier: No `.prettierrc` file detected; implicit Next.js defaults

**Type Safety:**
- TypeScript: Strict mode enabled in `tsconfig.json` (line 6: `"strict": true`)
- Python: Type hints used throughout (e.g., dataclasses with full annotations)
- Pydantic v2: Used for all API schemas with explicit `Field()` validators and `model_config = {"from_attributes": True}`

## Import Organization

**Python Import Order:**
1. Standard library imports (e.g., `import logging`, `import io`, `import uuid`)
2. Third-party imports (e.g., `from fastapi import`, `from sqlalchemy import`, `from pydantic import`)
3. Local app imports (e.g., `from app.core.solver import`, `from app.db.session import`)

Example from `app/api/powders.py`:
```python
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.grt_converter import convert_grt_to_powder
from app.db.session import get_db
from app.models.powder import Powder
from app.schemas.powder import GrtImportResult, PowderCreate, PowderResponse, PowderUpdate
```

**TypeScript Import Order:**
1. React and standard library imports
2. Third-party packages
3. Local imports from `@/` alias paths

Example from `frontend/src/hooks/usePowders.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPowders, getPowder, createPowder, updatePowder, deletePowder, importGrtPowders } from '@/lib/api';
import type { PowderCreate } from '@/lib/types';
```

**Path Aliases:**
- TypeScript: `@/*` → `./src/*` (defined in `tsconfig.json` line 21)
- Used consistently throughout frontend (e.g., `@/components/ui/Card`, `@/lib/api`, `@/hooks/usePowders`)

## Error Handling

**Python:**
- FastAPI `HTTPException` with explicit status codes (e.g., 400, 404, 201)
- Global exception handler in `app/middleware.py` catches unhandled exceptions and returns JSON `{"detail": "Internal server error"}`
- Logging at exception level via `logger.exception()` captures full traceback
- Custom `ApiClientError` in TypeScript wraps HTTP errors with status + detail fields

Example from `app/api/powders.py`:
```python
if not powder:
    raise HTTPException(404, "Powder not found")
```

**TypeScript:**
- Custom `ApiClientError` class extends Error with `.status` and `.detail` properties
- Fetch errors caught and detail extracted from response JSON, fallback to HTTP status message
- 204 No Content responses handled specially (return `undefined`)

Example from `frontend/src/lib/api.ts`:
```typescript
if (!response.ok) {
  let detail = `HTTP ${response.status}`;
  try {
    const errorBody = await response.json();
    detail = errorBody.detail || detail;
  } catch {
    // ignore parse errors
  }
  throw new ApiClientError(response.status, detail);
}
```

## Logging

**Framework:** Python `logging` module

**Patterns:**
- Module-level logger: `logger = logging.getLogger(__name__)`
- Info level for API operations (e.g., GRT import: `logger.info("GRT import: %d created, %d skipped, %d errors", ...)`)
- Exception level for error tracking: `logger.exception()` in global handler
- No logging in TypeScript/frontend (relies on browser console for debugging)

Example from `app/api/powders.py`:
```python
logger = logging.getLogger(__name__)
# ...
logger.info("GRT import: %d created, %d skipped, %d errors",
            len(created), len(skipped), len(parse_errors))
```

## Comments

**When to Comment:**
- Module docstrings for public modules (e.g., solver module has detailed docstring explaining ODE system)
- Function docstrings for complex functions (e.g., `noble_abel_pressure` includes parameter descriptions and return type)
- Known limitations documented inline (e.g., test file `test_solver.py` documents Z_PRIMER bootstrap limitation in class docstring)
- Algorithm explanations in thermodynamics and structural calculations

**JSDoc/TSDoc:**
- TypeScript interfaces have no formal docstrings but are well-named and grouped with comments
- Example from `lib/types.ts`: Section separators with comment headers like `// ============================================================ // Powder (Polvora) // ============================================================`

**Python Docstrings:**
- Function docstrings use triple-quote style with Args/Returns sections
- Example from `app/core/thermodynamics.py`:
```python
def noble_abel_pressure(
    mass_gas: float,
    volume: float,
    covolume: float,
    force: float,
    fraction_burned: float,
) -> float:
    """Calculate gas pressure using the Noble-Abel equation of state.

    P = f * omega * psi / (V_free - omega * psi * eta)

    Args:
        mass_gas: Total propellant charge mass omega (kg).
        volume: Free volume available V_free (m^3).
        covolume: Gas covolume eta (m^3/kg).
        force: Propellant force/impetus f (J/kg).
        fraction_burned: Fraction of propellant burned psi (0 to 1).

    Returns:
        Pressure in Pa.
    """
```

## Function Design

**Size:** Functions are focused and concise (most solver functions under 30 lines)

**Parameters:**
- Python: Dataclasses used for grouped parameters (e.g., `PowderParams`, `CartridgeParams`) instead of many individual args
- TypeScript: Objects with typed properties (e.g., API functions accept specific types like `PowderCreate`, not loose objects)

**Return Values:**
- Python: Return single calculated value (scalar or numpy array) or dataclass (e.g., `SimResult` with all output fields)
- TypeScript: Return Promises for async operations (e.g., `Promise<Powder>`)
- Status code standard: 201 for POST creates, 204 for DELETE (no content), 200 for GET/PUT

Example from `app/api/powders.py`:
```python
@router.post("", response_model=PowderResponse, status_code=201)
async def create_powder(data: PowderCreate, db: AsyncSession = Depends(get_db)):
    powder = Powder(**data.model_dump())
    db.add(powder)
    await db.commit()
    await db.refresh(powder)
    return powder
```

## Module Design

**Exports:**
- Python: Router modules (`powders.py`, `bullets.py`, etc.) define `router: APIRouter` and other submodules import from app.core
- TypeScript: Hook files export named functions (e.g., `export function usePowders()`) and API files export async functions
- Frontend: Components export default (e.g., `export default Button`) or named (e.g., `export function usePowders()`)

**Barrel Files:**
- Python: `app/api/router.py` aggregates all sub-routers with `include_router()` pattern
- TypeScript: No explicit barrel files detected; imports are direct from modules
- Model registration: All models imported in `app/main.py` with `import app.models.*` to register with SQLAlchemy metadata

Example from `app/api/router.py`:
```python
api_router = APIRouter(prefix="/api/v1")

api_router.include_router(powders_router)
api_router.include_router(bullets_router)
# ... other routers
```

## Pydantic v2 Conventions

**Field Validation:**
- Use `Field(gt=0, le=X)` for range constraints (greater-than, less-than-or-equal)
- Use `Field(min_length=1, max_length=100)` for string length
- Use `Field(description="...")` to document field purpose in schema

Example from `app/schemas/powder.py`:
```python
force_constant_j_kg: float = Field(gt=0, le=2_000_000, description="Force constant (J/kg), typically 800k-1.2M")
covolume_m3_kg: float = Field(gt=0, le=0.01, description="Covolume (m3/kg), typically ~0.001")
```

**ORM Compatibility:**
- All Response schemas include `model_config = {"from_attributes": True}` to enable direct ORM object conversion

## Async Patterns

**Python:**
- All database operations use `AsyncSession` from SQLAlchemy async
- API endpoints are `async def` with `Depends(get_db)` dependency injection
- Tests use `pytest-asyncio` with `@pytest_asyncio.fixture` for async fixtures

**TypeScript:**
- API client functions are `async` and return `Promise<T>`
- React Query mutations/queries handle async operations transparently
- No explicit async/await in components; mutations and queries manage promise lifecycle

---

*Convention analysis: 2025-02-20*
