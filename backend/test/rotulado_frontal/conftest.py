import pytest
from sqlalchemy.orm import Session

from src.aditivos.models import Aditivo, ClaseFuncionalAditivo
from src.asociaciones.detalle_receta import detalle_receta
from src.empleados.models import Empleado, RolEmpleado
from src.insumos.models import Insumo
from src.parametros_normativos import services as parametros_services
from src.parametros_normativos.models import ConjuntoParametros
from src.productos.constants import TipoProducto
from src.productos.models import Producto
from src.recetas.constants import EstadoVersionReceta, TipoUsoInsumo
from src.recetas.models import Receta, VersionReceta
from src.unidades_medida.constants import MagnitudUnidad
from src.unidades_medida.models import UnidadMedida


@pytest.fixture
def admin(db_session: Session) -> Empleado:
    empleado = Empleado(
        legajo="EMP-9201", dni="32000001", nombre="Maria", apellido="Test", activo=True, rol=RolEmpleado.ADMIN
    )
    db_session.add(empleado)
    db_session.commit()
    db_session.refresh(empleado)
    return empleado


@pytest.fixture
def vigente(db_session: Session) -> ConjuntoParametros:
    return parametros_services.importar_archivo(db_session)


def _producto(db: Session, nombre: str, tipo: TipoProducto) -> Producto:
    producto = Producto(
        nombre=nombre,
        tipo=tipo,
        unidad_medida=UnidadMedida(nombre=f"Unidad {nombre}", magnitud=MagnitudUnidad.MASA, factor_base=1000.0),
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


@pytest.fixture
def galletitas(db_session: Session) -> Producto:
    return _producto(db_session, "Galletitas de avena", TipoProducto.ALIMENTO)


@pytest.fixture
def jugo(db_session: Session) -> Producto:
    return _producto(db_session, "Jugo de naranja", TipoProducto.BEBIDA)


@pytest.fixture
def insumos(db_session: Session) -> dict:
    gramos = UnidadMedida(nombre="Gramos de prueba", magnitud=MagnitudUnidad.MASA, factor_base=1.0)
    creados = {nombre: Insumo(nombre=nombre, unidad_medida=gramos) for nombre in ("Harina", "Azúcar", "Manteca", "Sucralosa")}
    db_session.add_all(creados.values())
    db_session.commit()
    return creados


@pytest.fixture
def sucralosa(db_session: Session) -> Aditivo:
    clase = ClaseFuncionalAditivo(nombre="edulcorante", necesita_ins=True)
    db_session.add(clase)
    db_session.flush()
    aditivo = Aditivo(nombre_completo="Sucralosa", clase_funcional_id=clase.id, numero_ins="955")
    db_session.add(aditivo)
    db_session.commit()
    return aditivo


def cargar_receta(db: Session, producto: Producto, version: int, renglones, estado=EstadoVersionReceta.ACTIVO) -> None:
    """Carga una version de receta directo en las tablas, mientras el modulo de recetas no tenga servicios."""
    receta = db.query(Receta).filter_by(producto_id=producto.id).first()
    if receta is None:
        receta = Receta(producto_id=producto.id)
        db.add(receta)
        db.flush()
    db.add(
        VersionReceta(
            receta_id=receta.id, version=version, rendimiento_final_gramos=1000, unidad_venta_gramos=50, estado=estado
        )
    )
    db.flush()
    for renglon, (insumo, gramos, aditivo) in enumerate(renglones, start=1):
        db.execute(
            detalle_receta.insert().values(
                receta_id=receta.id,
                nro_version=version,
                renglon=renglon,
                insumo_id=insumo.id,
                cantidad_gramos=gramos,
                tipo_uso=TipoUsoInsumo.ADITIVO if aditivo else TipoUsoInsumo.INGREDIENTE,
                aditivo_id=aditivo.id if aditivo else None,
            )
        )
    db.commit()
