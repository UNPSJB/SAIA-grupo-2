import pytest
from datetime import datetime
from sqlalchemy.orm import Session
from src.recetas import services, schemas
from src.recetas.constants import TipoUsoInsumo
from src.productos.models import Producto
from src.productos.constants import TipoProducto
from src.insumos.models import Insumo
from src.unidades_medida.models import UnidadMedida
from src.unidades_medida.constants import MagnitudUnidad
from src.datos_nutricionales.models import DatoNutricionalInsumo
from src.datos_nutricionales.constants import Nutriente, FuenteDatoNutricional
from src.empleados.models import Empleado, RolEmpleado
from src.aditivos.models import Aditivo, ClaseFuncionalAditivo

@pytest.fixture
def base_nutricional(db_session: Session):
    um = db_session.query(UnidadMedida).first()
    if not um:
        um = UnidadMedida(nombre="Gramos", magnitud=MagnitudUnidad.MASA, factor_base=1.0)
        db_session.add(um)
        db_session.commit()
        db_session.refresh(um)

    prod = Producto(nombre="Barra Nutritiva", tipo=TipoProducto.ALIMENTO, unidad_medida_id=um.id)
    ins1 = Insumo(nombre="Avena Hojuelas", activo=True, unidad_medida_id=um.id, cantidad=10000.0)
    emp = Empleado(legajo="EMP-8888", dni="88888888", nombre="Ana", apellido="Nutri", rol=RolEmpleado.ADMIN)

    db_session.add_all([prod, ins1, emp])
    db_session.commit()
    db_session.refresh(prod)
    db_session.refresh(ins1)
    db_session.refresh(emp)

    ahora = datetime.now()
    dato1 = DatoNutricionalInsumo(
        insumo_id=ins1.id, nutriente=Nutriente.ENERGIA, valor=389.0, valor_fuente=389.0,
        fuente=FuenteDatoNutricional.VALOR_PROPIO, cargado_por_id=emp.id, fecha_carga=ahora
    )
    dato2 = DatoNutricionalInsumo(
        insumo_id=ins1.id, nutriente=Nutriente.PROTEINAS, valor=17.0, valor_fuente=17.0,
        fuente=FuenteDatoNutricional.VALOR_PROPIO, cargado_por_id=emp.id, fecha_carga=ahora
    )
    db_session.add_all([dato1, dato2])
    db_session.commit()

    return prod, ins1

def test_calcular_informacion_nutricional_receta(db_session: Session, base_nutricional):
    prod, ins1 = base_nutricional

    receta_create = schemas.RecetaCreate(
        producto_id=prod.id,
        version_inicial=schemas.VersionRecetaInicialCreate(
            rendimiento_final_gramos=1000.0,
            unidad_venta_gramos=100.0,
            detalles=[
                schemas.DetalleRecetaCreate(
                    insumo_id=ins1.id,
                    cantidad_gramos=500.0,
                    tipo_uso=TipoUsoInsumo.INGREDIENTE
                )
            ]
        )
    )
    receta = services.crear_receta(db_session, receta_create)

    res = services.calcular_informacion_nutricional_receta(db_session, receta.id)
    assert res.receta_id == receta.id
    assert res.version == 1
    assert len(res.items) == 10

    energia_item = next(i for i in res.items if i.nutriente == "energia")
    assert abs(energia_item.valor_100g_raw - 194.5) < 0.1
    assert "194 kcal" in energia_item.valor_100g_expresado



def test_calcular_composicion_receta_separa_ingredientes_y_aditivos(
    db_session: Session, base_nutricional
):
    prod, ins1 = base_nutricional

    ins2 = Insumo(
        nombre="Conservante",
        activo=True,
        unidad_medida_id=ins1.unidad_medida_id,
        cantidad=1000.0,
        es_aditivo=True,
    )

    clase = ClaseFuncionalAditivo(
        nombre="Conservante de prueba",
        necesita_ins=True,
    )

    db_session.add_all([ins2, clase])
    db_session.commit()
    db_session.refresh(ins2)
    db_session.refresh(clase)

    aditivo = Aditivo(
        nombre_completo="Conservante de prueba",
        clase_funcional_id=clase.id,
        numero_ins="200",
    )
    db_session.add(aditivo)
    db_session.commit()
    db_session.refresh(aditivo)

    receta = services.crear_receta(
        db_session,
        schemas.RecetaCreate(
            producto_id=prod.id,
            version_inicial=schemas.VersionRecetaInicialCreate(
                rendimiento_final_gramos=1000.0,
                unidad_venta_gramos=100.0,
                detalles=[
                    schemas.DetalleRecetaCreate(
                        insumo_id=ins1.id,
                        cantidad_gramos=700.0,
                        tipo_uso=TipoUsoInsumo.INGREDIENTE,
                    ),
                    schemas.DetalleRecetaCreate(
                        insumo_id=ins2.id,
                        cantidad_gramos=300.0,
                        tipo_uso=TipoUsoInsumo.ADITIVO,
                        aditivo_id=aditivo.id,
                    ),
                ],
            ),
        ),
    )

    resultado = services.calcular_composicion_receta(db_session, receta.id)

    assert resultado.receta_id == receta.id
    assert resultado.version == 1
    assert resultado.total_gramos == 1000.0

    assert len(resultado.ingredientes) == 1
    assert len(resultado.aditivos) == 1

    assert resultado.ingredientes[0].nombre_insumo == "Avena Hojuelas"
    assert resultado.ingredientes[0].porcentaje == 70.0

    assert resultado.aditivos[0].nombre_insumo == "Conservante"
    assert resultado.aditivos[0].porcentaje == 30.0

    assert resultado.suma_porcentajes == 100.0
    assert resultado.suma_correcta is True


def test_calcular_composicion_receta_por_version(
    db_session: Session, base_nutricional
):
    prod, ins1 = base_nutricional

    receta = services.crear_receta(
        db_session,
        schemas.RecetaCreate(
            producto_id=prod.id,
            version_inicial=schemas.VersionRecetaInicialCreate(
                rendimiento_final_gramos=1000.0,
                unidad_venta_gramos=100.0,
                detalles=[
                    schemas.DetalleRecetaCreate(
                        insumo_id=ins1.id,
                        cantidad_gramos=1000.0,
                        tipo_uso=TipoUsoInsumo.INGREDIENTE,
                    )
                ],
            ),
        ),
    )

    services.crear_version_receta(
        db_session,
        receta.id,
        schemas.VersionRecetaCreate(
            rendimiento_final_gramos=500.0,
            unidad_venta_gramos=100.0,
            detalles=[
                schemas.DetalleRecetaCreate(
                    insumo_id=ins1.id,
                    cantidad_gramos=500.0,
                    tipo_uso=TipoUsoInsumo.INGREDIENTE,
                )
            ],
        ),
    )

    version_1 = services.calcular_composicion_receta(
        db_session, receta.id, nro_version=1
    )
    version_2 = services.calcular_composicion_receta(
        db_session, receta.id, nro_version=2
    )

    assert version_1.version == 1
    assert version_2.version == 2

    assert version_1.total_gramos == 1000.0
    assert version_2.total_gramos == 500.0

    assert version_1.ingredientes[0].porcentaje == 100.0
    assert version_2.ingredientes[0].porcentaje == 100.0

