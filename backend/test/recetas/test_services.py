import pytest
from sqlalchemy.orm import Session
from src.recetas import services, schemas, exceptions
from src.recetas.constants import EstadoVersionReceta, TipoUsoInsumo
from src.productos.models import Producto
from src.productos.constants import TipoProducto
from src.insumos.models import Insumo
from src.unidades_medida.models import UnidadMedida
from src.unidades_medida.constants import MagnitudUnidad

@pytest.fixture
def unidad_medida_test(db_session: Session):
    um = db_session.query(UnidadMedida).first()
    if not um:
        um = UnidadMedida(nombre="Gramos", magnitud=MagnitudUnidad.MASA, factor_base=1.0)
        db_session.add(um)
        db_session.commit()
        db_session.refresh(um)
    return um

@pytest.fixture
def producto_test(db_session: Session, unidad_medida_test: UnidadMedida):
    prod = Producto(
        nombre="Queso Tybo Especial",
        tipo=TipoProducto.ALIMENTO,
        unidad_medida_id=unidad_medida_test.id
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)
    return prod

@pytest.fixture
def insumo_test(db_session: Session, unidad_medida_test: UnidadMedida):
    ins = Insumo(
        nombre="Leche Entera",
        activo=True,
        unidad_medida_id=unidad_medida_test.id,
        cantidad=1000.0
    )
    db_session.add(ins)
    db_session.commit()
    db_session.refresh(ins)
    return ins

def test_crear_receta_exitoso(db_session: Session, producto_test: Producto, insumo_test: Insumo):
    receta_create = schemas.RecetaCreate(
        producto_id=producto_test.id,
        version_inicial=schemas.VersionRecetaInicialCreate(
            rendimiento_final_gramos=1000.0,
            unidad_venta_gramos=250.0,
            medida_casera="1 trozo (250g)",
            motivo_cambio="Versión inicial aprobada por Calidad",
            detalles=[
                schemas.DetalleRecetaCreate(
                    insumo_id=insumo_test.id,
                    cantidad_gramos=1000.0,
                    tipo_uso=TipoUsoInsumo.INGREDIENTE
                )
            ],
            pasos=[
                schemas.PasoRecetaCreate(
                    orden=1,
                    nombre_paso="Pasteurización",
                    procedimiento="Pasteurizar a 72°C por 15 segundos",
                    temperatura_celsius=72.0,
                    es_punto_control=True
                )
            ]
        )
    )

    receta = services.crear_receta(db_session, receta_create)
    assert receta.id is not None
    assert receta.producto_id == producto_test.id

    version_vigente = services.obtener_version_vigente(db_session, receta.id)
    assert version_vigente.version == 1
    assert version_vigente.estado == EstadoVersionReceta.ACTIVO
    assert version_vigente.rendimiento_final_gramos == 1000.0
    assert len(version_vigente.pasos) == 1
    assert version_vigente.pasos[0].nombre_paso == "Pasteurización"

def test_crear_nueva_version_archiva_anterior(db_session: Session, producto_test: Producto, insumo_test: Insumo):
    receta_create = schemas.RecetaCreate(
        producto_id=producto_test.id,
        version_inicial=schemas.VersionRecetaInicialCreate(
            rendimiento_final_gramos=1000.0,
            unidad_venta_gramos=250.0,
            detalles=[
                schemas.DetalleRecetaCreate(
                    insumo_id=insumo_test.id,
                    cantidad_gramos=1000.0,
                    tipo_uso=TipoUsoInsumo.INGREDIENTE
                )
            ]
        )
    )
    receta = services.crear_receta(db_session, receta_create)

    v2_create = schemas.VersionRecetaCreate(
        rendimiento_final_gramos=1200.0,
        unidad_venta_gramos=300.0,
        motivo_cambio="Mejora en rendimiento de masa",
        detalles=[
            schemas.DetalleRecetaCreate(
                insumo_id=insumo_test.id,
                cantidad_gramos=1200.0,
                tipo_uso=TipoUsoInsumo.INGREDIENTE
            )
        ]
    )
    v2 = services.crear_version_receta(db_session, receta.id, v2_create)
    assert v2.version == 2
    assert v2.estado == EstadoVersionReceta.ACTIVO

    vigente = services.obtener_version_vigente(db_session, receta.id)
    assert vigente.version == 2

    v1 = services.leer_version_receta(db_session, receta.id, 1)
    assert v1.estado == EstadoVersionReceta.ARCHIVADO

def test_validaciones_receta_invalida(db_session: Session, producto_test: Producto):
    with pytest.raises(exceptions.RendimientoFinalInvalido):
        services.crear_receta(
            db_session,
            schemas.RecetaCreate(
                producto_id=producto_test.id,
                version_inicial=schemas.VersionRecetaInicialCreate(
                    rendimiento_final_gramos=0.0,
                    unidad_venta_gramos=100.0,
                    detalles=[]
                )
            )
        )
