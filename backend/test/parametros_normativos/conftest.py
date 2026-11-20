import pytest
from sqlalchemy.orm import Session

from src.empleados.models import Empleado, RolEmpleado
from src.parametros_normativos import services
from src.parametros_normativos.models import ConjuntoParametros


@pytest.fixture
def admin(db_session: Session) -> Empleado:
    empleado = Empleado(
        legajo="EMP-9101", dni="31000001", nombre="Maria", apellido="Test", activo=True, rol=RolEmpleado.ADMIN
    )
    db_session.add(empleado)
    db_session.commit()
    db_session.refresh(empleado)
    return empleado


@pytest.fixture
def vigente(db_session: Session) -> ConjuntoParametros:
    return services.importar_archivo(db_session)
