"""Fuzzy search helpers using pg_trgm and caliber family derivation."""

from sqlalchemy import func, or_


# Caliber family ranges: family name -> (min_diameter_mm, max_diameter_mm)
CALIBER_FAMILIES: dict[str, tuple[float, float]] = {
    ".224": (5.5, 5.8),
    ".243": (6.1, 6.3),
    ".264": (6.5, 6.8),
    ".284": (7.0, 7.3),
    ".308": (7.7, 7.9),
    ".338": (8.5, 8.7),
    ".375": (9.5, 9.6),
    ".408": (10.3, 10.4),
    ".416": (10.5, 10.7),
    ".458": (11.5, 11.7),
    ".510": (12.9, 13.1),
}

# Sorted list of caliber family keys for API validation
CALIBER_FAMILY_LIST: list[str] = sorted(CALIBER_FAMILIES.keys())


def derive_caliber_family(diameter_mm: float) -> str | None:
    """Derive caliber family from bullet/bore diameter in mm.

    Args:
        diameter_mm: Bullet diameter or bore diameter in mm.

    Returns:
        Caliber family string (e.g. '.308') or None if no match.
    """
    for family, (min_d, max_d) in CALIBER_FAMILIES.items():
        if min_d <= diameter_mm <= max_d:
            return family
    return None


def apply_fuzzy_search(
    query,
    model,
    search_term: str,
    fields: list[str] | None = None,
):
    """Apply pg_trgm fuzzy search on specified columns.

    Filters rows where any of the specified fields is similar to the search term
    (using the % trigram operator), then orders by similarity descending with
    quality_score as tiebreaker.

    Args:
        query: SQLAlchemy select statement to modify.
        model: ORM model class (must have quality_score column).
        search_term: User-provided search string.
        fields: List of column names to search. Defaults to ["name", "manufacturer"].
            Columns that don't exist on the model are silently skipped.

    Returns:
        Modified query with WHERE and ORDER BY clauses.
    """
    if fields is None:
        fields = ["name", "manufacturer"]

    # Only include columns that actually exist on the model
    search_columns = [getattr(model, f) for f in fields if hasattr(model, f)]

    if not search_columns:
        return query

    conditions = [col.op("%")(search_term) for col in search_columns]
    query = query.where(or_(*conditions))

    # Order by similarity on the first search column (typically name)
    query = query.order_by(
        func.similarity(search_columns[0], search_term).desc(),
        model.quality_score.desc(),
    )
    return query
