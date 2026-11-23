from datetime import date, datetime

import pytest
from sqlalchemy.orm import Session

from src.alergenos.models import MarcaAlergenosInsumo
from src.datos_nutricionales.constants import FuenteDatoNutricional, Nutriente
from src.datos_nutricionales.models import DatoNutricionalInsumo
from src.empleados.models import Empleado, RolEmpleado
from src.insumos.models import Insumo
from src.lotes_produccion.models import LoteProduccion
from src.parametros_normativos import services as parametros_services
from src.productos.constants import TipoProducto
from src.productos.models import Producto
from src.recetas import schemas as recetas_schemas
from src.recetas import services as recetas_services
from src.rotulado_frontal import schemas as frontal_schemas
from src.rotulado_frontal import services as frontal_services
from src.rotulados import schemas, services
from src.unidades_medida.constants import MagnitudUnidad
from src.unidades_medida.models import UnidadMedida

N = Nutriente
COMPOSICIONES = {
    "Harina 000": {N.ENERGIA: 350, N.CARBOHIDRATOS: 73, N.AZUCARES_TOTALES: 1, N.PROTEINAS: 10, N.GRASAS_TOTALES: 1,
                   N.GRASAS_SATURADAS: 0.2, N.FIBRA_ALIMENTARIA: 3, N.SODIO: 2},
    "Azúcar": {N.ENERGIA: 400, N.CARBOHIDRATOS: 100, N.AZUCARES_TOTALES: 100, N.AZUCARES_ANADIDOS: 100},
    "Manteca": {N.ENERGIA: 740, N.PROTEINAS: 0.9, N.GRASAS_TOTALES: 82, N.GRASAS_SATURADAS: 51, N.GRASAS_TRANS: 3,
                N.SODIO: 10},
}
DENOMINACIONES = {"Harina 000": "harina de trigo 000", "Azúcar": "azúcar", "Manteca": "manteca"}


def _empleado(db: Session, legajo: str, dni: str, rol: RolEmpleado) -> Empleado:
    empleado = Empleado(legajo=legajo, dni=dni, nombre="Ana", apellido="Rotulo", activo=True, rol=rol)
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
    unidad = UnidadMedida(nombre="Gramos rotulo", magnitud=MagnitudUnidad.MASA, factor_base=1.0)
    db_session.add(unidad)
    db_session.commit()
    return unidad


@pytest.fixture
def insumos(db_session: Session, gramos, admin) -> dict:
    creados = {
        nombre: Insumo(nombre=nombre, unidad_medida=gramos, cantidad=10000, denominacion_rotulo=DENOMINACIONES[nombre])
        for nombre in COMPOSICIONES
    }
    db_session.add_all(creados.values())
    db_session.commit()
    for nombre, valores in COMPOSICIONES.items():
        for nutriente in Nutriente:
            valor = valores.get(nutriente, 0)
            db_session.add(
                DatoNutricionalInsumo(
                    insumo_id=creados[nombre].id,
                    nutriente=nutriente,
                    valor=valor,
                    valor_fuente=valor,
                    fuente=FuenteDatoNutricional.VALOR_PROPIO,
                    fecha_carga=datetime.now(),
                    cargado_por_id=admin.id,
                )
            )
    db_session.add(
        MarcaAlergenosInsumo(
            insumo_id=creados["Harina 000"].id, alergenos=["trigo"], contiene_gluten=True, fecha_cambio=datetime.now()
        )
    )
    db_session.add(
        MarcaAlergenosInsumo(insumo_id=creados["Manteca"].id, alergenos=["leche"], fecha_cambio=datetime.now())
    )
    db_session.commit()
    return creados


@pytest.fixture
def producto(db_session: Session, gramos) -> Producto:
    producto = Producto(nombre="Galletitas de manteca", tipo=TipoProducto.ALIMENTO, unidad_medida=gramos)
    db_session.add(producto)
    db_session.commit()
    db_session.refresh(producto)
    return producto


@pytest.fixture
def otro_producto(db_session: Session, gramos) -> Producto:
    producto = Producto(nombre="Pan casero", tipo=TipoProducto.ALIMENTO, unidad_medida=gramos)
    db_session.add(producto)
    db_session.commit()
    db_session.refresh(producto)
    return producto


def version_receta(insumos: dict, gramos, cantidades: dict) -> dict:
    return {
        "rendimiento_final_gramos": sum(cantidades.values()),
        "unidad_venta_gramos": 30,
        "medida_casera": "3 galletitas",
        "detalles": [
            {
                "insumo_id": insumos[nombre].id,
                "cantidad_original": cantidad,
                "unidad_medida_id": gramos.id,
                "tipo_uso": "ingrediente",
            }
            for nombre, cantidad in cantidades.items()
        ],
    }


@pytest.fixture
def receta(db_session: Session, producto, insumos, gramos):
    return recetas_services.crear_receta(
        db_session,
        recetas_schemas.RecetaCreate(
            producto_id=producto.id,
            version_inicial=version_receta(insumos, gramos, {"Harina 000": 500, "Azúcar": 300, "Manteca": 200}),
        ),
    )


@pytest.fixture
def parametros(db_session: Session):
    return parametros_services.importar_archivo(db_session)


def evaluar(db: Session, producto: Producto, admin: Empleado, envasado: bool = True, **marcas):
    return frontal_services.evaluar(
        db,
        producto.id,
        frontal_schemas.NuevaEvaluacion(empleado_id=admin.id, envasado_en_ausencia_del_cliente=envasado, **marcas),
    )


def crear_lote(db: Session, producto: Producto, fecha: date = date(2026, 11, 20)) -> LoteProduccion:
    lote = LoteProduccion(producto_id=producto.id, fecha=fecha, cantidad=10)
    db.add(lote)
    db.commit()
    db.refresh(lote)
    return lote


DATOS_COMPLETOS = dict(
    denominacion_venta="Galletitas dulces con manteca",
    contenido_neto=300,
    unidad_contenido_neto="g",
    rnpa_rppa="RNPA 04-123456",
    razon_social="Dulces del Sur S.R.L.",
    domicilio="Av. Siempre Viva 742, Trelew, Chubut",
)


def crear_rotulo(db: Session, producto: Producto, admin: Empleado, **datos):
    return services.crear_rotulo(db, schemas.RotuloCrear(producto_id=producto.id, **datos), admin.id)
