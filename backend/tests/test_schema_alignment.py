"""Static and ORM/Alembic schema-drift detection tests."""

from __future__ import annotations

import ast
import re
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = BACKEND_ROOT / "app" / "models"
VERSIONS_DIR = BACKEND_ROOT / "alembic" / "versions"


def _extract_orm_schema() -> tuple[dict[str, set[str]], set[str]]:
    """Extract all SQLAlchemy __tablename__ -> columns and explicit Index names via AST."""
    tables: dict[str, set[str]] = {}
    indexes: set[str] = set()

    for path in sorted(MODELS_DIR.glob("*.py")):
        if path.name == "__init__.py":
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in tree.body:
            if not isinstance(node, ast.ClassDef):
                continue
            tablename: str | None = None
            cols: set[str] = set()
            for stmt in node.body:
                if isinstance(stmt, ast.Assign):
                    for target in stmt.targets:
                        if isinstance(target, ast.Name) and target.id == "__tablename__":
                            if isinstance(stmt.value, ast.Constant) and isinstance(
                                stmt.value.value, str
                            ):
                                tablename = stmt.value.value
                        elif isinstance(target, ast.Name) and target.id == "__table_args__":
                            for call in ast.walk(stmt.value):
                                if (
                                    isinstance(call, ast.Call)
                                    and isinstance(call.func, ast.Name)
                                    and call.func.id == "Index"
                                    and call.args
                                    and isinstance(call.args[0], ast.Constant)
                                    and isinstance(call.args[0].value, str)
                                ):
                                    indexes.add(call.args[0].value)
                elif isinstance(stmt, ast.AnnAssign) and isinstance(stmt.target, ast.Name):
                    if isinstance(stmt.value, ast.Call) and isinstance(stmt.value.func, ast.Name):
                        if stmt.value.func.id == "mapped_column":
                            cols.add(stmt.target.id)
            if tablename:
                tables[tablename] = cols

    return tables, indexes


def _extract_migration_schema() -> tuple[
    dict[str, set[str]],
    set[str],
    list[tuple[str, str | None, str | None]],
]:
    """Extract tables, columns, indexes, and revision links across Alembic versions."""
    tables: dict[str, set[str]] = {}
    indexes: set[str] = set()
    revisions: list[tuple[str, str | None, str | None]] = []

    for path in sorted(VERSIONS_DIR.glob("*.py")):
        source = path.read_text(encoding="utf-8")
        tree = ast.parse(source)
        rev: str | None = None
        down_rev: str | None = None

        for node in tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "revision":
                        if isinstance(node.value, ast.Constant):
                            rev = str(node.value.value)
                    elif isinstance(target, ast.Name) and target.id == "down_revision":
                        if isinstance(node.value, ast.Constant):
                            down_rev = (
                                None if node.value.value is None else str(node.value.value)
                            )
            elif isinstance(node, ast.FunctionDef) and node.name == "upgrade":
                for call in ast.walk(node):
                    if not isinstance(call, ast.Call):
                        continue
                    if not isinstance(call.func, ast.Attribute):
                        continue
                    attr = call.func.attr
                    if attr == "create_table" and call.args:
                        tname = call.args[0]
                        if isinstance(tname, ast.Constant) and isinstance(tname.value, str):
                            cols = tables.setdefault(tname.value, set())
                            for arg in call.args[1:]:
                                if (
                                    isinstance(arg, ast.Call)
                                    and isinstance(arg.func, ast.Attribute)
                                    and arg.func.attr == "Column"
                                    and arg.args
                                    and isinstance(arg.args[0], ast.Constant)
                                    and isinstance(arg.args[0].value, str)
                                ):
                                    cols.add(arg.args[0].value)
                    elif attr == "create_index" and call.args:
                        iname = call.args[0]
                        if isinstance(iname, ast.Constant) and isinstance(iname.value, str):
                            indexes.add(iname.value)
                    elif attr == "execute" and call.args:
                        sql_arg = call.args[0]
                        if isinstance(sql_arg, ast.Constant) and isinstance(sql_arg.value, str):
                            sql = sql_arg.value
                            alter_match = re.match(
                                r"ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)",
                                sql,
                                flags=re.IGNORECASE,
                            )
                            if alter_match:
                                tables.setdefault(alter_match.group(1), set()).add(
                                    alter_match.group(2)
                                )
                            idx_match = re.match(
                                r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+(\w+)",
                                sql,
                                flags=re.IGNORECASE,
                            )
                            if idx_match:
                                indexes.add(idx_match.group(1))

        revisions.append((path.name, rev, down_rev))

    return tables, indexes, revisions


def test_migration_chain_is_linear_and_starts_from_0001() -> None:
    _, _, revisions = _extract_migration_schema()
    assert len(revisions) >= 2
    by_rev = {rev: down for _, rev, down in revisions}
    assert "0001_initial" in by_rev
    assert by_rev["0001_initial"] is None
    assert "0002_complete_schema" in by_rev
    assert by_rev["0002_complete_schema"] == "0001_initial"


def test_all_orm_tables_and_columns_exist_in_migrations() -> None:
    orm_tables, orm_indexes = _extract_orm_schema()
    mig_tables, mig_indexes, _ = _extract_migration_schema()

    missing_tables = set(orm_tables) - set(mig_tables)
    assert not missing_tables, f"Tables missing from migrations: {sorted(missing_tables)}"

    for table_name, orm_cols in orm_tables.items():
        mig_cols = mig_tables[table_name]
        missing_cols = orm_cols - mig_cols
        extra_cols = mig_cols - orm_cols
        assert not missing_cols, f"{table_name} missing migration columns: {sorted(missing_cols)}"
        assert not extra_cols, f"{table_name} has unmapped migration columns: {sorted(extra_cols)}"

    # Confirm partial bookmark index and knowledge_chunks pgvector/tsvector indexes exist
    required_indexes = {
        "uq_bookmarks_user_message",
        "ix_knowledge_chunks_tsv",
        "ix_knowledge_chunks_embedding",
        "ix_feedback_target",
        "ix_feedback_user_created",
        "ix_ai_usage_user_created",
    }
    assert required_indexes.issubset(mig_indexes)
    assert required_indexes.issubset(orm_indexes)


def test_migration_0002_downgrade_reverses_only_0002_objects() -> None:
    mig_0002 = VERSIONS_DIR / "0002_complete_schema.py"
    tree = ast.parse(mig_0002.read_text(encoding="utf-8"))

    created_tables: list[str] = []
    created_indexes: list[str] = []
    dropped_tables: list[str] = []
    dropped_indexes: list[str] = []

    for node in tree.body:
        if not isinstance(node, ast.FunctionDef):
            continue
        for call in ast.walk(node):
            if not (isinstance(call, ast.Call) and isinstance(call.func, ast.Attribute) and call.args):
                continue
            first = call.args[0]
            if not (isinstance(first, ast.Constant) and isinstance(first.value, str)):
                continue
            if node.name == "upgrade":
                if call.func.attr == "create_table":
                    created_tables.append(first.value)
                elif call.func.attr == "create_index":
                    created_indexes.append(first.value)
            elif node.name == "downgrade":
                if call.func.attr == "drop_table":
                    dropped_tables.append(first.value)
                elif call.func.attr == "drop_index":
                    dropped_indexes.append(first.value)

    assert set(created_tables) == {
        "practice_sessions",
        "practice_attempts",
        "feedback",
        "executions",
        "ai_usage",
    }
    assert set(dropped_tables) == set(created_tables)
    assert set(dropped_indexes) == set(created_indexes)
    # Child table practice_attempts must be dropped before parent practice_sessions
    assert dropped_tables.index("practice_attempts") < dropped_tables.index("practice_sessions")


def test_sqlalchemy_metadata_alignment_when_installed() -> None:
    """Verify full SQLAlchemy Base.metadata matches expectations when SQLAlchemy is installed."""
    try:
        import app.models  # noqa: F401
        from app.db.session import Base
    except ImportError:
        return

    expected_tables = {
        "users",
        "refresh_tokens",
        "conversations",
        "messages",
        "user_preferences",
        "topic_progress",
        "solved_problems",
        "bookmarks",
        "knowledge_documents",
        "knowledge_chunks",
        "practice_sessions",
        "practice_attempts",
        "feedback",
        "executions",
        "ai_usage",
    }
    assert expected_tables.issubset(set(Base.metadata.tables.keys()))
    kc_cols = set(Base.metadata.tables["knowledge_chunks"].columns.keys())
    assert {"content_tsv", "embedding"}.issubset(kc_cols)
    bm_indexes = {idx.name for idx in Base.metadata.tables["bookmarks"].indexes}
    assert "uq_bookmarks_user_message" in bm_indexes
