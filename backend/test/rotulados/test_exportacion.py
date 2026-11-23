import json
from datetime import date

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.rotulado_frontal import services as frontal_services
from src.rotulados import schemas, services
from test.rotulados.conftest import DATOS_COMPLETOS, crear_lote, crear_rotulo, evaluar


def _rotulo_con_calculo(db: Session, producto, admin):
    evaluar(db, producto, admin, agrega_azucares=True, agrega_grasas=True)
    calculo = frontal_services.calcular_sellos_producto(db, producto.id, admin.id)
    rotulo = crear_rotulo(db, producto, admin, **DATOS_COMPLETOS)
    lote = crear_lote(db, producto)
    services.asociar_lote(
        db, rotulo.id, schemas.RotuloLoteCrear(nro_lote=lote.nro_lote, fecha_duracion=date(2027, 1, 19)), admin.id
    )
    return rotulo, calculo


def test_solo_un_administrador_exporta(db_session: Session, producto, operario, admin):
    rotulo = crear_rotulo(db_session, producto, admin)

    with pytest.raises(HTTPException) as error:
        services.crear_exportacion(db_session, rotulo.id, operario.id)
    assert error.value.status_code == 403


def test_registra_fecha_version_de_receta_y_parametros(db_session: Session, producto, receta, parametros, admin):
    rotulo, calculo = _rotulo_con_calculo(db_session, producto, admin)

    exportacion = services.crear_exportacion(db_session, rotulo.id, admin.id)

    assert exportacion.fecha_exportacion is not None
    assert exportacion.receta_id == receta.id
    assert exportacion.version_receta == 1
    assert exportacion.calculo_sellos_id == calculo.id
    assert exportacion.parametros_id == parametros.id
    assert exportacion.version_parametros == parametros.version
    assert exportacion.empleado_nombre == "Ana"


def test_el_respaldo_incluye_borrador_y_anexo_de_calculos(db_session: Session, producto, receta, parametros, admin):
    rotulo, calculo = _rotulo_con_calculo(db_session, producto, admin)

    respaldo = services.crear_exportacion(db_session, rotulo.id, admin.id).respaldo_snapshot

    borrador = respaldo["borrador"]
    assert respaldo["leyenda_borrador"].startswith("BORRADOR: debe ser revisado")
    assert borrador["leyenda_borrador"] == respaldo["leyenda_borrador"]
    assert borrador["lista_ingredientes"] == "Ingredientes: harina de trigo 000, azúcar, manteca."
    assert [s["sello"] for s in borrador["cara_principal"]["sellos"]][0] == "exceso_azucares"

    receta_respaldo = respaldo["receta"]
    assert receta_respaldo["version"] == 1
    assert [(r["insumo"], r["cantidad_original"], r["unidad"]) for r in receta_respaldo["renglones"]] == [
        ("Harina 000", 500, "Gramos rotulo"),
        ("Azúcar", 300, "Gramos rotulo"),
        ("Manteca", 200, "Gramos rotulo"),
    ]

    composicion = respaldo["composicion"]
    assert [i["porcentaje"] for i in composicion["ingredientes"]] == [50, 30, 20]
    assert composicion["suma_correcta"] is True

    tabla = respaldo["tabla_nutricional"]
    assert tabla["calculo"]["estado"] == "completa"
    assert [f["insumo"] for f in tabla["fuentes"]] == ["Harina 000", "Azúcar", "Manteca"]
    assert {d["fuente"] for f in tabla["fuentes"] for d in f["datos"]} == {"valor_propio"}
    assert len(tabla["fuentes"][0]["datos"]) == 10

    sellos = respaldo["calculo_sellos"]
    assert sellos["id"] == calculo.id
    assert sellos["parametros"]["version"] == parametros.version
    assert sellos["parametros"]["fecha_vigencia"] == parametros.fecha_vigencia.isoformat()
    assert len(sellos["pasos_calculo"]) > 0


def test_el_respaldo_no_menciona_aprobacion(db_session: Session, producto, receta, parametros, admin):
    rotulo, _ = _rotulo_con_calculo(db_session, producto, admin)

    respaldo = services.crear_exportacion(db_session, rotulo.id, admin.id).respaldo_snapshot

    texto = json.dumps(respaldo, ensure_ascii=False).lower()
    for palabra in ("aprobad", "aprobación", "conformidad", "certificad", "certificación"):
        assert palabra not in texto


def test_cada_exportacion_conserva_sus_datos(db_session: Session, producto, receta, parametros, admin):
    rotulo, _ = _rotulo_con_calculo(db_session, producto, admin)
    primera = services.crear_exportacion(db_session, rotulo.id, admin.id)
    services.actualizar_rotulo(db_session, rotulo.id, schemas.RotuloActualizar(denominacion_venta="Galletitas"), admin.id)

    segunda = services.crear_exportacion(db_session, rotulo.id, admin.id)

    recuperada = services.obtener_exportacion(db_session, rotulo.id, primera.id)
    assert recuperada.respaldo_snapshot["borrador"]["cara_principal"]["denominacion_venta"] == DATOS_COMPLETOS["denominacion_venta"]
    assert segunda.respaldo_snapshot["borrador"]["cara_principal"]["denominacion_venta"] == "Galletitas"
    assert [e.id for e in services.listar_exportaciones(db_session, rotulo.id)] == [segunda.id, primera.id]


def test_sin_receta_exporta_el_borrador_con_sus_faltantes(db_session: Session, producto, admin):
    rotulo = crear_rotulo(db_session, producto, admin)

    exportacion = services.crear_exportacion(db_session, rotulo.id, admin.id)

    respaldo = exportacion.respaldo_snapshot
    assert exportacion.version_receta is None and exportacion.calculo_sellos_id is None
    assert respaldo["receta"] is None and respaldo["composicion"] is None and respaldo["calculo_sellos"] is None
    assert respaldo["tabla_nutricional"]["fuentes"] == []
    assert "Lista de ingredientes" in respaldo["borrador"]["faltantes"]
    assert respaldo["borrador"]["completo"] is False


def test_exportacion_de_otro_rotulo(db_session: Session, producto, otro_producto, admin):
    rotulo = crear_rotulo(db_session, producto, admin)
    otro = crear_rotulo(db_session, otro_producto, admin)
    exportacion = services.crear_exportacion(db_session, otro.id, admin.id)

    with pytest.raises(HTTPException) as error:
        services.obtener_exportacion(db_session, rotulo.id, exportacion.id)
    assert error.value.status_code == 404


def test_router_de_exportaciones(client: TestClient, db_session: Session, producto, receta, admin):
    rotulo = crear_rotulo(db_session, producto, admin, **DATOS_COMPLETOS)

    assert client.post(f"/rotulos/{rotulo.id}/exportaciones").status_code == 401

    creada = client.post(f"/rotulos/{rotulo.id}/exportaciones", headers={"X-User-Id": str(admin.id)})
    assert creada.status_code == 201
    exportacion_id = creada.json()["id"]
    assert creada.json()["respaldo_snapshot"]["receta"]["version"] == 1

    listado = client.get(f"/rotulos/{rotulo.id}/exportaciones").json()
    assert listado[0]["id"] == exportacion_id
    assert listado[0]["empleado_nombre"] == "Ana"
    assert "respaldo_snapshot" not in listado[0]

    detalle = client.get(f"/rotulos/{rotulo.id}/exportaciones/{exportacion_id}")
    assert detalle.status_code == 200
    assert detalle.json()["version_receta"] == 1
    assert client.get(f"/rotulos/{rotulo.id}/exportaciones/999").status_code == 404
