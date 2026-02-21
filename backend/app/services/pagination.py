"""Reusable async pagination helper for SQLAlchemy queries."""

from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class PaginatedResult:
    """Container for paginated query results."""

    items: list
    total: int
    page: int
    size: int


async def paginate(
    db: AsyncSession,
    query,
    page: int = 1,
    size: int = 50,
) -> PaginatedResult:
    """Wrap a SQLAlchemy query with count + offset/limit pagination.

    Args:
        db: Async database session.
        query: SQLAlchemy select statement to paginate.
        page: 1-based page number (default 1).
        size: Items per page (default 50).

    Returns:
        PaginatedResult with items, total count, page, and size.
    """
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * size
    result = await db.execute(query.offset(offset).limit(size))
    items = list(result.scalars().all())

    return PaginatedResult(items=items, total=total, page=page, size=size)
