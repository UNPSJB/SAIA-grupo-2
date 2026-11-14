import pytest
from sqlalchemy.orm import Session

from src.insumos.models import Insumo
from src.unidades_medida import services as unidades_services
from src.unidades_medida.models import UnidadMedida


@pytest.fixture
def unidades(db_session: Session) -> dict:
    unidades_services.crear_catalogo(db_session)
    return {u.nombre: u for u in db_session.query(UnidadMedida).all()}


@pytest.fixture
def harina(db_session: Session, unidades: dict) -> Insumo:
    insumo = Insumo(nombre="Harina 000", unidad_medida_id=unidades["Kilogramos"].id, cantidad=0.0)
    db_session.add(insumo)
    db_session.commit()
    db_session.refresh(insumo)
    return insumo


@pytest.fixture
def leche(db_session: Session, unidades: dict) -> Insumo:
    insumo = Insumo(nombre="Leche entera", unidad_medida_id=unidades["Litros"].id, cantidad=0.0)
    db_session.add(insumo)
    db_session.commit()
    db_session.refresh(insumo)
    return insumo
