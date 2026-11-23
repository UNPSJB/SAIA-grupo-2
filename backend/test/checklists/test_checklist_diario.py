from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.checklists import exceptions, schemas, services
from src.empleados.models import Empleado, RolEmpleado
from src.planes.models import Plan
from src.productos_limpieza.constants import TipoProductoLimpieza
from src.productos_limpieza.models import ProductoLimpieza
from src.sectores.models import Sector
from src.tareas.constants import FrecuenciaTarea
from src.tareas.models import Tarea
from src.unidades_medida.constants import MagnitudUnidad
from src.unidades_medida.models import UnidadMedida

HOY = date.today()


@pytest.fixture
def datos(db_session: Session) -> dict:
    operario = Empleado(legajo="EMP-9801", dni="38000001", nombre="Hugo", apellido="Limpio", activo=True, rol=RolEmpleado.OPERARIO)
    responsable = Empleado(legajo="EMP-9802", dni="38000002", nombre="Inés", apellido="Jefa", activo=True, rol=RolEmpleado.ADMIN)
    cocina = Sector(nombre="Cocina checklist")
    deposito = Sector(nombre="Depósito checklist")
    operario.sectores.append(cocina)
    deposito.responsable = responsable
    litros = UnidadMedida(nombre="Litros checklist", magnitud=MagnitudUnidad.VOLUMEN, factor_base=1000)
    lavandina = ProductoLimpieza(nombre="Lavandina", tipo=TipoProductoLimpieza.DESINFECTANTE, stock=5, unidad_medida=litros)
    pisos = Tarea(titulo="Limpiar pisos", frecuencia=FrecuenciaTarea.DIARIA)
    mesadas = Tarea(titulo="Desinfectar mesadas", frecuencia=FrecuenciaTarea.DIARIA)
    estantes = Tarea(titulo="Ordenar estantes", frecuencia=FrecuenciaTarea.DIARIA)
    plan_cocina = Plan(titulo="Plan cocina", fecha_inicio=HOY, sector=cocina, tareas=[pisos, mesadas])
    plan_deposito = Plan(titulo="Plan depósito", fecha_inicio=HOY, sector=deposito, tareas=[estantes])
    plan_viejo = Plan(
        titulo="Plan dado de baja",
        fecha_inicio=HOY - timedelta(days=30),
        sector=cocina,
        activo=False,
        fecha_desactivacion=HOY - timedelta(days=1),
        tareas=[Tarea(titulo="Tarea vieja", frecuencia=FrecuenciaTarea.DIARIA)],
    )
    db_session.add_all([operario, responsable, lavandina, plan_cocina, plan_deposito, plan_viejo])
    db_session.commit()
    return {
        "operario": operario,
        "responsable": responsable,
        "lavandina": lavandina,
        "pisos": pisos,
        "plan_cocina": plan_cocina,
        "plan_deposito": plan_deposito,
    }


def _marcar(db: Session, datos: dict, consumo: float = 0.0, **extra):
    consumos = [schemas.ConsumoRealCreate(producto_limpieza_id=datos["lavandina"].id, cantidad=consumo)] if consumo else []
    return services.marcar_tarea_completada(
        db,
        datos["pisos"].id,
        schemas.ChecklistMarcar(plan_id=datos["plan_cocina"].id, empleado_id=datos["operario"].id, consumos=consumos, **extra),
    )


def test_el_checklist_del_dia_excluye_planes_dados_de_baja(db_session: Session, datos):
    titulos = {item.titulo_tarea for item in services.obtener_checklist_diario(db_session)}

    assert titulos == {"Limpiar pisos", "Desinfectar mesadas", "Ordenar estantes"}


def test_cada_empleado_ve_las_tareas_de_sus_sectores(db_session: Session, datos):
    del_operario = services.obtener_checklist_diario(db_session, datos["operario"])
    del_responsable = services.obtener_checklist_diario(db_session, datos["responsable"])

    assert {i.titulo_tarea for i in del_operario} == {"Limpiar pisos", "Desinfectar mesadas"}
    assert [(i.titulo_tarea, i.sector_nombre) for i in del_responsable] == [("Ordenar estantes", "Depósito checklist")]


def test_marcar_una_tarea_registra_quien_y_descuenta_el_stock(db_session: Session, datos):
    detalle = _marcar(db_session, datos, consumo=1.5, observaciones="Sin novedades")

    assert detalle.realizada is True
    assert detalle.nombre_empleado == "Hugo Limpio (EMP-9801)"
    assert (detalle.plan_titulo, detalle.sector_nombre) == ("Plan cocina", "Cocina checklist")
    assert [(c.nombre_producto, c.cantidad) for c in detalle.consumos_reales] == [("Lavandina", 1.5)]
    db_session.refresh(datos["lavandina"])
    assert datos["lavandina"].stock == 3.5
    estados = {i.titulo_tarea: i.estado for i in services.obtener_checklist_diario(db_session)}
    assert estados["Limpiar pisos"] == "realizada"
    assert estados["Desinfectar mesadas"] == "pendiente"


def test_volver_a_marcar_reemplaza_el_consumo_anterior(db_session: Session, datos):
    _marcar(db_session, datos, consumo=2)

    detalle = _marcar(db_session, datos, consumo=1)

    assert [c.cantidad for c in detalle.consumos_reales] == [1]
    db_session.refresh(datos["lavandina"])
    assert datos["lavandina"].stock == 4


def test_no_se_consume_mas_que_el_stock(db_session: Session, datos):
    with pytest.raises(exceptions.StockInsuficiente):
        _marcar(db_session, datos, consumo=10)

    db_session.refresh(datos["lavandina"])
    assert datos["lavandina"].stock == 5


def test_tarea_o_producto_inexistente(db_session: Session, datos):
    with pytest.raises(exceptions.ChecklistNoEncontrado):
        services.marcar_tarea_completada(db_session, 999, schemas.ChecklistMarcar(empleado_id=datos["operario"].id))
    with pytest.raises(exceptions.ProductoNoEncontrado):
        services.marcar_tarea_completada(
            db_session,
            datos["pisos"].id,
            schemas.ChecklistMarcar(
                empleado_id=datos["operario"].id, consumos=[schemas.ConsumoRealCreate(producto_limpieza_id=999, cantidad=1)]
            ),
        )
    with pytest.raises(exceptions.ChecklistNoEncontrado):
        services.obtener_detalle_tarea_realizada(db_session, datos["pisos"].id, 0)


def test_router_del_checklist(client: TestClient, db_session: Session, datos):
    hoy = client.get("/checklists/hoy", headers={"X-Empleado-Id": str(datos["operario"].id)})
    assert hoy.status_code == 200
    assert len(hoy.json()) == 2

    marcado = client.post(
        f"/checklists/{datos['pisos'].id}/marcar",
        json={"plan_id": datos["plan_cocina"].id, "empleado_id": datos["operario"].id},
    )
    assert marcado.status_code == 200

    detalle = client.get("/checklists/detalle", params={"tarea_id": datos["pisos"].id, "plan_id": datos["plan_cocina"].id})
    assert detalle.status_code == 200
    assert detalle.json()["titulo_tarea"] == "Limpiar pisos"
    assert client.get("/checklists/detalle", params={"tarea_id": 999}).status_code == 404
    assert len(client.get("/checklists/hoy", params={"empleado_id": datos["responsable"].id}).json()) == 1
