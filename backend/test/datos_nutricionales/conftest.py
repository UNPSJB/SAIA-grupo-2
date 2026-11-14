import pytest
from sqlalchemy.orm import Session

from src.alimentos_referencia.models import AlimentoReferencia
from src.empleados.models import Empleado, RolEmpleado
from src.insumos.models import Insumo
from src.unidades_medida.constants import MagnitudUnidad
from src.unidades_medida.models import UnidadMedida


def _empleado(db: Session, legajo: str, dni: str, nombre: str) -> Empleado:
    empleado = Empleado(legajo=legajo, dni=dni, nombre=nombre, apellido="Test", activo=True, rol=RolEmpleado.ADMIN)
    db.add(empleado)
    db.commit()
    db.refresh(empleado)
    return empleado


@pytest.fixture
def admin(db_session: Session) -> Empleado:
    return _empleado(db_session, "EMP-9001", "30000001", "Maria")


@pytest.fixture
def otro_admin(db_session: Session) -> Empleado:
    return _empleado(db_session, "EMP-9002", "30000002", "Lucia")


@pytest.fixture
def insumo(db_session: Session) -> Insumo:
    insumo = Insumo(
        nombre="Harina 000",
        unidad_medida=UnidadMedida(nombre="Kilogramos", magnitud=MagnitudUnidad.MASA, factor_base=1000.0),
    )
    db_session.add(insumo)
    db_session.commit()
    db_session.refresh(insumo)
    return insumo


@pytest.fixture
def harina_sara(db_session: Session) -> AlimentoReferencia:
    alimento = AlimentoReferencia(
        codigo="A010",
        nombre="Harina de Trigo",
        nombre_busqueda="harina de trigo",
        magnitud=MagnitudUnidad.MASA,
        energia=349.97,
        carbohidratos=73.0,
        proteinas=10.3,
        grasas_totales=1.0,
        grasas_saturadas=0.16,
        fibra_alimentaria=3.3,
        sodio=2.0,
    )
    db_session.add(alimento)
    db_session.commit()
    return alimento
