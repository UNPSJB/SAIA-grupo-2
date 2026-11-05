from datetime import date
from typing import List

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.planes import exceptions as planes_exceptions
from src.planes.models import Plan
from src.productos_limpieza import exceptions as productos_exceptions
from src.productos_limpieza.constants import TipoProductoLimpieza
from src.productos_limpieza.models import ProductoLimpieza
from src.sectores.models import Sector
from src.tareas import exceptions, schemas, services
from src.tareas.constants import FrecuenciaTarea
from src.unidades_medida.models import UnidadMedida


def _crear_sector(db: Session, nombre: str = "sector tarea test") -> Sector:
    """Crea el sector que necesita todo plan."""
    sector = Sector(nombre=nombre)
    db.add(sector)
    db.commit()
    db.refresh(sector)
    return sector


def _crear_plan(db: Session, sector: Sector, titulo: str = "plan tarea test") -> Plan:
    """Crea un plan al cual asociar la tarea."""
    plan = Plan(titulo=titulo, fecha_inicio=date(2026, 1, 1), sector_id=sector.id)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def _crear_producto(
    db: Session,
    nombre: str = "producto tarea test",
    stock: float = 10,
    activo: bool = True,
    tipo: TipoProductoLimpieza = TipoProductoLimpieza.DETERGENTE,
) -> ProductoLimpieza:
    """Crea un producto de limpieza con su unidad de medida para estimar consumo."""
    unidad = UnidadMedida(nombre=f"unidad de {nombre}")
    db.add(unidad)
    db.commit()
    db.refresh(unidad)

    producto = ProductoLimpieza(
        nombre=nombre,
        tipo=tipo,
        stock=stock,
        activo=activo,
        unidad_medida_id=unidad.id,
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


def _datos_tarea(
    planes: List[int],
    titulo: str = "tarea test",
    frecuencia: FrecuenciaTarea = FrecuenciaTarea.DIARIA,
    consumos: List[schemas.ConsumoEstimadoCreate] | None = None,
) -> schemas.TareaCreate:
    """Arma el payload de alta de una tarea."""
    return schemas.TareaCreate(
        titulo=titulo,
        frecuencia=frecuencia,
        planes=planes,
        consumos_estimados=consumos or [],
    )


# PRUEBAS POSITIVAS (CASOS DE ÉXITO - SERVICES)

def test_crear_tarea_exito(db_session: Session):
    """Verifica la creación exitosa de una tarea asociada a un plan."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)

    tarea = services.crear_tarea(db_session, _datos_tarea([plan.id]))
    assert tarea.id is not None
    assert tarea.titulo == "tarea test"
    assert tarea.frecuencia == FrecuenciaTarea.DIARIA
    assert tarea.activo is True
    assert [p.id for p in tarea.planes] == [plan.id]
    assert tarea.consumos_estimados == []


def test_crear_tarea_con_consumo_estimado(db_session: Session):
    """Verifica que se guarde el consumo estimado de un producto de limpieza."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)
    producto = _crear_producto(db_session)

    tarea = services.crear_tarea(
        db_session,
        _datos_tarea(
            [plan.id],
            consumos=[
                schemas.ConsumoEstimadoCreate(producto_limpieza_id=producto.id, cantidad=2.5)
            ],
        ),
    )
    assert len(tarea.consumos_estimados) == 1
    assert tarea.consumos_estimados[0].producto_limpieza_id == producto.id
    assert tarea.consumos_estimados[0].cantidad == 2.5


def test_crear_tarea_con_varios_consumos(db_session: Session):
    """Verifica que una tarea pueda estimar consumo de varios productos distintos."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)
    uno = _crear_producto(db_session, "detergente test")
    otro = _crear_producto(db_session, "desinfectante test", tipo=TipoProductoLimpieza.DESINFECTANTE)

    tarea = services.crear_tarea(
        db_session,
        _datos_tarea(
            [plan.id],
            consumos=[
                schemas.ConsumoEstimadoCreate(producto_limpieza_id=uno.id, cantidad=1),
                schemas.ConsumoEstimadoCreate(producto_limpieza_id=otro.id, cantidad=3),
            ],
        ),
    )
    assert len(tarea.consumos_estimados) == 2


def test_crear_tarea_asociada_a_varios_planes(db_session: Session):
    """Verifica que una tarea pueda pertenecer a mas de un plan."""
    sector = _crear_sector(db_session)
    uno = _crear_plan(db_session, sector, "plan uno test")
    otro = _crear_plan(db_session, sector, "plan dos test")

    tarea = services.crear_tarea(db_session, _datos_tarea([uno.id, otro.id]))
    assert len(tarea.planes) == 2


def test_crear_tarea_deduplica_planes_repetidos(db_session: Session):
    """Verifica que repetir el mismo plan no lo asocie dos veces."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)

    tarea = services.crear_tarea(db_session, _datos_tarea([plan.id, plan.id, plan.id]))
    assert len(tarea.planes) == 1


def test_listar_tareas_vacio_y_con_datos(db_session: Session):
    """Verifica listar tareas sin datos y con varias cargadas."""
    assert services.listar_tareas(db_session) == []

    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)
    services.crear_tarea(db_session, _datos_tarea([plan.id], "tarea 1 test"))
    services.crear_tarea(db_session, _datos_tarea([plan.id], "tarea 2 test"))

    assert len(services.listar_tareas(db_session)) == 2


def test_listar_tareas_filtra_por_plan(db_session: Session):
    """Verifica que el filtro por plan devuelva solo las tareas de ese plan."""
    sector = _crear_sector(db_session)
    uno = _crear_plan(db_session, sector, "plan uno test")
    otro = _crear_plan(db_session, sector, "plan dos test")
    tarea_uno = services.crear_tarea(db_session, _datos_tarea([uno.id], "tarea del uno test"))
    services.crear_tarea(db_session, _datos_tarea([otro.id], "tarea del dos test"))

    lista = services.listar_tareas(db_session, plan_id=uno.id)
    assert [t.id for t in lista] == [tarea_uno.id]


def test_leer_tarea_exito(db_session: Session):
    """Verifica leer una tarea por ID."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)
    creada = services.crear_tarea(db_session, _datos_tarea([plan.id], "tarea a leer test"))

    leida = services.leer_tarea(db_session, creada.id)
    assert leida.id == creada.id
    assert leida.titulo == "tarea a leer test"


def test_obtener_impacto_tarea(db_session: Session):
    """Verifica que el impacto devuelva los titulos de los planes afectados."""
    sector = _crear_sector(db_session)
    uno = _crear_plan(db_session, sector, "plan uno test")
    otro = _crear_plan(db_session, sector, "plan dos test")
    tarea = services.crear_tarea(db_session, _datos_tarea([uno.id, otro.id]))

    impacto = services.obtener_impacto_tarea(db_session, tarea.id)
    assert sorted(impacto) == ["plan dos test", "plan uno test"]


def test_modificar_tarea_exito(db_session: Session):
    """Verifica modificar el titulo y la frecuencia de una tarea."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)
    creada = services.crear_tarea(db_session, _datos_tarea([plan.id], "titulo viejo test"))

    modificada = services.modificar_tarea(
        db_session,
        creada.id,
        schemas.TareaUpdate(
            titulo="titulo nuevo test",
            frecuencia=FrecuenciaTarea.SEMANAL,
            activo=True,
            planes=[plan.id],
        ),
    )
    assert modificada.titulo == "titulo nuevo test"
    assert modificada.frecuencia == FrecuenciaTarea.SEMANAL
    assert modificada.activo is True


def test_modificar_tarea_reemplaza_los_consumos(db_session: Session):
    """Verifica que al modificar se reemplacen los consumos estimados anteriores."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)
    viejo = _crear_producto(db_session, "producto viejo test")
    nuevo = _crear_producto(db_session, "producto nuevo test")
    creada = services.crear_tarea(
        db_session,
        _datos_tarea(
            [plan.id],
            consumos=[schemas.ConsumoEstimadoCreate(producto_limpieza_id=viejo.id, cantidad=1)],
        ),
    )

    modificada = services.modificar_tarea(
        db_session,
        creada.id,
        schemas.TareaUpdate(
            titulo="tarea test",
            frecuencia=FrecuenciaTarea.DIARIA,
            activo=True,
            planes=[plan.id],
            consumos_estimados=[
                schemas.ConsumoEstimadoCreate(producto_limpieza_id=nuevo.id, cantidad=7)
            ],
        ),
    )
    assert len(modificada.consumos_estimados) == 1
    assert modificada.consumos_estimados[0].producto_limpieza_id == nuevo.id
    assert modificada.consumos_estimados[0].cantidad == 7


def test_modificar_tarea_cambia_los_planes(db_session: Session):
    """Verifica que se puedan reasignar los planes de una tarea activa."""
    sector = _crear_sector(db_session)
    uno = _crear_plan(db_session, sector, "plan uno test")
    otro = _crear_plan(db_session, sector, "plan dos test")
    creada = services.crear_tarea(db_session, _datos_tarea([uno.id]))

    modificada = services.modificar_tarea(
        db_session,
        creada.id,
        schemas.TareaUpdate(
            titulo="tarea test",
            frecuencia=FrecuenciaTarea.DIARIA,
            activo=True,
            planes=[otro.id],
        ),
    )
    assert [p.id for p in modificada.planes] == [otro.id]


def test_modificar_tarea_baja_logica_desasocia_los_planes(db_session: Session):
    """Verifica que dar de baja una tarea la saque de todos los planes."""
    sector = _crear_sector(db_session)
    uno = _crear_plan(db_session, sector, "plan uno test")
    otro = _crear_plan(db_session, sector, "plan dos test")
    creada = services.crear_tarea(db_session, _datos_tarea([uno.id, otro.id]))

    dada_de_baja = services.modificar_tarea(
        db_session,
        creada.id,
        schemas.TareaUpdate(
            titulo="tarea test",
            frecuencia=FrecuenciaTarea.DIARIA,
            activo=False,
            planes=[uno.id, otro.id],
        ),
    )
    assert dada_de_baja.activo is False
    assert dada_de_baja.planes == []


def test_eliminar_tarea_inactiva_exito(db_session: Session):
    """Verifica que una tarea dada de baja logica se pueda eliminar fisicamente."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)
    creada = services.crear_tarea(db_session, _datos_tarea([plan.id]))
    services.modificar_tarea(
        db_session,
        creada.id,
        schemas.TareaUpdate(
            titulo="tarea test",
            frecuencia=FrecuenciaTarea.DIARIA,
            activo=False,
            planes=[plan.id],
        ),
    )

    resultado = services.eliminar_tarea(db_session, creada.id)
    assert resultado.id == creada.id
    assert resultado.msg == "borrado"

    with pytest.raises(exceptions.TareaNoEncontrada):
        services.leer_tarea(db_session, creada.id)


# PRUEBAS NEGATIVAS (CASOS DE FALLA - SERVICES)

def test_crear_tarea_sin_planes(db_session: Session):
    """Verifica que crear una tarea sin planes lance SinPlanes."""
    with pytest.raises(exceptions.SinPlanes):
        services.crear_tarea(db_session, _datos_tarea([]))


def test_crear_tarea_plan_inexistente(db_session: Session):
    """Verifica que crear una tarea con un plan inexistente lance PlanNoEncontrado."""
    with pytest.raises(planes_exceptions.PlanNoEncontrado):
        services.crear_tarea(db_session, _datos_tarea([9999]))


def test_crear_tarea_producto_inexistente(db_session: Session):
    """Verifica que un consumo de un producto inexistente lance ProductoNoEncontrado."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)

    with pytest.raises(productos_exceptions.ProductoNoEncontrado):
        services.crear_tarea(
            db_session,
            _datos_tarea(
                [plan.id],
                consumos=[
                    schemas.ConsumoEstimadoCreate(producto_limpieza_id=9999, cantidad=1)
                ],
            ),
        )


def test_crear_tarea_producto_repetido(db_session: Session):
    """Verifica que cargar dos veces el mismo producto lance ProductoRepetido."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)
    producto = _crear_producto(db_session)

    with pytest.raises(exceptions.ProductoRepetido):
        services.crear_tarea(
            db_session,
            _datos_tarea(
                [plan.id],
                consumos=[
                    schemas.ConsumoEstimadoCreate(producto_limpieza_id=producto.id, cantidad=1),
                    schemas.ConsumoEstimadoCreate(producto_limpieza_id=producto.id, cantidad=2),
                ],
            ),
        )


def test_crear_tarea_producto_inactivo(db_session: Session):
    """Verifica que un producto dado de baja no se pueda estimar en una tarea."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)
    producto = _crear_producto(db_session, "producto inactivo test", activo=False)

    with pytest.raises(HTTPException) as info:
        services.crear_tarea(
            db_session,
            _datos_tarea(
                [plan.id],
                consumos=[
                    schemas.ConsumoEstimadoCreate(producto_limpieza_id=producto.id, cantidad=1)
                ],
            ),
        )
    assert info.value.status_code == 400
    assert "inactivo" in info.value.detail


def test_crear_tarea_producto_sin_stock(db_session: Session):
    """Verifica que un producto sin stock lance SinStock."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)
    producto = _crear_producto(db_session, "producto sin stock test", stock=0)

    with pytest.raises(exceptions.SinStock):
        services.crear_tarea(
            db_session,
            _datos_tarea(
                [plan.id],
                consumos=[
                    schemas.ConsumoEstimadoCreate(producto_limpieza_id=producto.id, cantidad=1)
                ],
            ),
        )


def test_leer_tarea_inexistente(db_session: Session):
    """Verifica que leer una tarea por ID inexistente lance TareaNoEncontrada."""
    with pytest.raises(exceptions.TareaNoEncontrada):
        services.leer_tarea(db_session, 9999)


def test_obtener_impacto_tarea_inexistente(db_session: Session):
    """Verifica que pedir el impacto de una tarea inexistente lance TareaNoEncontrada."""
    with pytest.raises(exceptions.TareaNoEncontrada):
        services.obtener_impacto_tarea(db_session, 9999)


def test_modificar_tarea_inexistente(db_session: Session):
    """Verifica que modificar una tarea inexistente lance TareaNoEncontrada."""
    with pytest.raises(exceptions.TareaNoEncontrada):
        services.modificar_tarea(
            db_session,
            9999,
            schemas.TareaUpdate(
                titulo="tarea test",
                frecuencia=FrecuenciaTarea.DIARIA,
                activo=True,
                planes=[1],
            ),
        )


def test_modificar_tarea_activa_sin_planes(db_session: Session):
    """Verifica que dejar una tarea activa sin ningun plan lance SinPlanes."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)
    creada = services.crear_tarea(db_session, _datos_tarea([plan.id]))

    with pytest.raises(exceptions.SinPlanes):
        services.modificar_tarea(
            db_session,
            creada.id,
            schemas.TareaUpdate(
                titulo="tarea test",
                frecuencia=FrecuenciaTarea.DIARIA,
                activo=True,
                planes=[],
            ),
        )


def test_modificar_tarea_producto_repetido(db_session: Session):
    """Verifica que modificar con el mismo producto dos veces lance ProductoRepetido."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)
    producto = _crear_producto(db_session)
    creada = services.crear_tarea(db_session, _datos_tarea([plan.id]))

    with pytest.raises(exceptions.ProductoRepetido):
        services.modificar_tarea(
            db_session,
            creada.id,
            schemas.TareaUpdate(
                titulo="tarea test",
                frecuencia=FrecuenciaTarea.DIARIA,
                activo=True,
                planes=[plan.id],
                consumos_estimados=[
                    schemas.ConsumoEstimadoCreate(producto_limpieza_id=producto.id, cantidad=1),
                    schemas.ConsumoEstimadoCreate(producto_limpieza_id=producto.id, cantidad=2),
                ],
            ),
        )


def test_eliminar_tarea_activa_falla(db_session: Session):
    """Verifica que una tarea activa no se pueda eliminar fisicamente."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector)
    creada = services.crear_tarea(db_session, _datos_tarea([plan.id]))

    with pytest.raises(HTTPException) as info:
        services.eliminar_tarea(db_session, creada.id)
    assert info.value.status_code == 400
    assert "baja lógica" in info.value.detail


def test_eliminar_tarea_inactiva_con_planes_falla(db_session: Session):
    """Verifica que una tarea inactiva que siga asociada a un plan no se pueda eliminar."""
    sector = _crear_sector(db_session)
    plan = _crear_plan(db_session, sector, "plan que retiene test")
    creada = services.crear_tarea(db_session, _datos_tarea([plan.id]))
    creada.activo = False
    db_session.commit()

    with pytest.raises(HTTPException) as info:
        services.eliminar_tarea(db_session, creada.id)
    assert info.value.status_code == 400
    assert "plan que retiene test" in info.value.detail


def test_eliminar_tarea_inexistente(db_session: Session):
    """Verifica que eliminar una tarea inexistente lance TareaNoEncontrada."""
    with pytest.raises(exceptions.TareaNoEncontrada):
        services.eliminar_tarea(db_session, 9999)
