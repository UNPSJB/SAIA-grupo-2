
from datetime import date

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.lotes_produccion import exceptions as lotes_exceptions
from src.lotes_produccion.models import LoteProduccion
from src.productos.constants import TipoProducto
from src.productos.models import Producto
from src.productos import services
from src.unidades_medida.models import UnidadMedida


URL = "/productos/estadisticas"


@pytest.fixture
def unidad(db_session: Session) -> UnidadMedida:
    unidad = UnidadMedida(nombre="Kilogramos")
    db_session.add(unidad)
    db_session.commit()
    db_session.refresh(unidad)
    return unidad


def _crear_producto(db: Session, unidad: UnidadMedida, nombre: str) -> Producto:
    producto = Producto(
        nombre=nombre,
        tipo=TipoProducto.ALIMENTO,
        stock=0,
        unidad_medida_id=unidad.id,
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


def _crear_lote(
    db: Session,
    producto: Producto,
    fecha: date,
    cantidad: float,
) -> LoteProduccion:
    lote = LoteProduccion(
        producto_id=producto.id,
        fecha=fecha,
        cantidad=cantidad,
    )
    db.add(lote)
    db.commit()
    db.refresh(lote)
    return lote


# -------------------------
# Tests del servicio
# -------------------------


def test_obtener_estadisticas_calcula_totales_y_evolucion(
    db_session: Session,
    unidad: UnidadMedida,
):
    pan = _crear_producto(db_session, unidad, "Pan")
    medialunas = _crear_producto(db_session, unidad, "Medialunas")

    _crear_lote(db_session, pan, date(2026, 6, 1), 10)
    _crear_lote(db_session, pan, date(2026, 6, 1), 5)
    _crear_lote(db_session, pan, date(2026, 6, 2), 7)
    _crear_lote(db_session, medialunas, date(2026, 6, 1), 3)

    resultado = services.obtener_estadisticas_produccion(db_session)

    assert len(resultado.totales_por_producto) == 2

    # Los totales deben estar ordenados alfabéticamente.
    assert [p.producto for p in resultado.totales_por_producto] == [
        "Medialunas",
        "Pan",
    ]

    totales = {
        p.producto: p.cantidad
        for p in resultado.totales_por_producto
    }

    assert totales["Pan"] == 22
    assert totales["Medialunas"] == 3

    # Los lotes del mismo producto y fecha deben agruparse.
    assert len(resultado.evolucion_por_producto) == 3

    evolucion = [
        (e.fecha, e.producto, e.cantidad)
        for e in resultado.evolucion_por_producto
    ]

    assert evolucion == [
        (date(2026, 6, 1), "Medialunas", 3),
        (date(2026, 6, 1), "Pan", 15),
        (date(2026, 6, 2), "Pan", 7),
    ]


def test_obtener_estadisticas_filtra_por_fechas(
    db_session: Session,
    unidad: UnidadMedida,
):
    producto = _crear_producto(db_session, unidad, "Pan")

    _crear_lote(db_session, producto, date(2026, 5, 31), 10)
    _crear_lote(db_session, producto, date(2026, 6, 1), 20)
    _crear_lote(db_session, producto, date(2026, 6, 5), 30)
    _crear_lote(db_session, producto, date(2026, 6, 10), 40)

    resultado = services.obtener_estadisticas_produccion(
        db_session,
        fecha_desde=date(2026, 6, 1),
        fecha_hasta=date(2026, 6, 5),
    )

    assert len(resultado.totales_por_producto) == 1
    assert resultado.totales_por_producto[0].cantidad == 50

    assert [
        e.fecha for e in resultado.evolucion_por_producto
    ] == [
        date(2026, 6, 1),
        date(2026, 6, 5),
    ]


def test_obtener_estadisticas_sin_produccion(db_session: Session):
    resultado = services.obtener_estadisticas_produccion(db_session)

    assert resultado.totales_por_producto == []
    assert resultado.evolucion_por_producto == []


def test_obtener_estadisticas_rango_fechas_invalido(
    db_session: Session,
):
    with pytest.raises(lotes_exceptions.RangoFechasInvalido):
        services.obtener_estadisticas_produccion(
            db_session,
            fecha_desde=date(2026, 6, 10),
            fecha_hasta=date(2026, 6, 1),
        )


# -------------------------
# Tests del router
# -------------------------


def test_router_estadisticas_produccion_admin(
    client: TestClient,
    db_session: Session,
    unidad: UnidadMedida,
):
    producto = _crear_producto(db_session, unidad, "Pan")

    _crear_lote(db_session, producto, date(2026, 6, 1), 20)
    _crear_lote(db_session, producto, date(2026, 6, 2), 30)

    respuesta = client.get(
        URL,
        params={
            "fecha_desde": "2026-06-01",
            "fecha_hasta": "2026-06-02",
        },
        headers={"X-User-Role": "admin"},
    )

    assert respuesta.status_code == status.HTTP_200_OK

    cuerpo = respuesta.json()

    assert cuerpo["totales_por_producto"][0]["producto"] == "Pan"
    assert cuerpo["totales_por_producto"][0]["cantidad"] == 50

    assert len(cuerpo["evolucion_por_producto"]) == 2


def test_router_estadisticas_sin_rol(
    client: TestClient,
):
    respuesta = client.get(URL)

    assert respuesta.status_code == status.HTTP_403_FORBIDDEN


def test_router_estadisticas_rol_operario(
    client: TestClient,
):
    respuesta = client.get(
        URL,
        headers={"X-User-Role": "operario"},
    )

    assert respuesta.status_code == status.HTTP_403_FORBIDDEN


def test_router_estadisticas_rango_fechas_invalido(
    client: TestClient,
):
    respuesta = client.get(
        URL,
        params={
            "fecha_desde": "2026-06-10",
            "fecha_hasta": "2026-06-01",
        },
        headers={"X-User-Role": "admin"},
    )

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
