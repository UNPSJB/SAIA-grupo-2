import pytest
from sqlalchemy.orm import Session

from src.empleados.models import Empleado, RolEmpleado
from src.insumos.models import Insumo
from src.productos.constants import TipoProducto
from src.productos.models import Producto
from src.recetas import schemas as recetas_schemas
from src.recetas import services as recetas_services
from src.unidades_medida.constants import MagnitudUnidad
from src.unidades_medida.models import UnidadMedida


def _empleado(db: Session, legajo: str, dni: str, rol: RolEmpleado) -> Empleado:
    empleado = Empleado(legajo=legajo, dni=dni, nombre="Ana", apellido="Prueba", activo=True, rol=rol)
    db.add(empleado)
    db.commit()
    db.refresh(empleado)
    return empleado


@pytest.fixture
def admin(db_session: Session) -> Empleado:
    return _empleado(db_session, "EMP-9301", "33000001", RolEmpleado.ADMIN)


@pytest.fixture
def operario(db_session: Session) -> Empleado:
    return _empleado(db_session, "EMP-9302", "33000002", RolEmpleado.OPERARIO)


@pytest.fixture
def gramos(db_session: Session) -> UnidadMedida:
    unidad = db_session.query(UnidadMedida).filter_by(magnitud=MagnitudUnidad.MASA, factor_base=1.0).first()
    if unidad is None:
        unidad = UnidadMedida(nombre="Gramos", magnitud=MagnitudUnidad.MASA, factor_base=1.0)
        db_session.add(unidad)
        db_session.commit()
    return unidad


@pytest.fixture
def insumos(db_session: Session, gramos) -> dict:
    creados = {
        nombre: Insumo(nombre=nombre, unidad_medida=gramos, cantidad=10000)
        for nombre in ("Harina 000", "Manteca", "Huevo Entero", "Azúcar", "Sal")
    }
    db_session.add_all(creados.values())
    db_session.commit()
    return creados


@pytest.fixture
def medialunas(db_session: Session, gramos) -> Producto:
    producto = Producto(nombre="Medialunas", tipo=TipoProducto.ALIMENTO, unidad_medida=gramos)
    db_session.add(producto)
    db_session.commit()
    db_session.refresh(producto)
    return producto


def crear_receta(db: Session, producto: Producto, renglones) -> None:
    """Crea la receta del producto con el servicio de recetas, todos los renglones como ingredientes."""
    recetas_services.crear_receta(
        db,
        recetas_schemas.RecetaCreate(
            producto_id=producto.id,
            version_inicial={
                "rendimiento_final_gramos": 1000,
                "unidad_venta_gramos": 50,
                "detalles": [
                    {"insumo_id": insumo.id, "cantidad_gramos": gramos, "tipo_uso": "ingrediente"}
                    for insumo, gramos in renglones
                ],
            },
        ),
    )
