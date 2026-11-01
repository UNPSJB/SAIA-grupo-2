import os
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Configuración de variables de entorno para los tests
TEST_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_db.sqlite"))
os.environ["DB_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["DB_URL_TEST"] = f"sqlite:///{TEST_DB_PATH}"

from src.main import app
from src.database import get_db
from src.models import ModeloBase

engine = create_engine(
    f"sqlite:///{TEST_DB_PATH}",
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Crea una base de datos limpia para cada test y habilita las FKs de SQLite."""
    ModeloBase.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    db.execute(text("PRAGMA foreign_keys = ON"))
    try:
        yield db
    finally:
        db.close()
        ModeloBase.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Proporciona un TestClient de FastAPI inyectando la sesión de BD de prueba."""
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
