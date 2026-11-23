from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.documentacion.models import Capacitacion, LibretaSanitaria
from src.elementos_limpieza.models import ElementoLimpieza
from src.empleados.models import Empleado, RolEmpleado
from src.equipos.constants import EstadoEquipo
from src.equipos.models import Equipo, TipoEquipo
from src.sectores.models import Sector
from src.vencimientos import services
from src.vencimientos.schemas import CategoriaVencimiento
from src.vencimientos.vencimientos import EstadoVencimiento

HOY = date.today()


@pytest.fixture
def datos(db_session: Session) -> dict:
    empleado = Empleado(legajo="EMP-9601", dni="36000001", nombre="Laura", apellido="Vence", activo=True, rol=RolEmpleado.OPERARIO)
    sector = Sector(nombre="Depósito vencimientos")
    tipo = TipoEquipo(nombre="horno")
    db_session.add_all([empleado, sector, tipo])
    db_session.commit()
    db_session.add_all(
        [
            LibretaSanitaria(
                empleado_id=empleado.id,
                fecha_vencimiento=HOY - timedelta(days=2),
                numero_carnet="LS-1",
                autoridad_emisora="Municipio",
            ),
            Capacitacion(empleado_id=empleado.id, fecha_vencimiento=HOY + timedelta(days=200), titulo="Manipulación de alimentos"),
            ElementoLimpieza(nombre="Trapo de piso", frecuencia_recambio_dias=30, fecha_ultimo_recambio=HOY - timedelta(days=25)),
            ElementoLimpieza(nombre="Balde", frecuencia_recambio_dias=None),
            Equipo(
                nombre="Horno pastelero",
                activo=True,
                sector_id=sector.id,
                tipo_id=tipo.id,
                estado=EstadoEquipo.BUENO,
                frecuencia_mantenimiento_dias=180,
                fecha_ultimo_mantenimiento=HOY - timedelta(days=10),
            ),
            Equipo(
                nombre="Batidora",
                activo=True,
                sector_id=sector.id,
                tipo_id=tipo.id,
                estado=EstadoEquipo.BUENO,
                frecuencia_mantenimiento_dias=None,
            ),
        ]
    )
    db_session.commit()
    return {"empleado": empleado}


def test_consolida_documentos_elementos_y_equipos(db_session: Session, datos):
    resumen = services.obtener_vencimientos_consolidados(db_session)

    titulos = [i.titulo for i in resumen.items]
    assert titulos == [
        "Libreta Sanitaria",
        "Recambio: Trapo de piso",
        "Calibración: Horno pastelero",
        "Capacitación de Personal",
    ]
    assert (resumen.total, resumen.vencidos, resumen.proximos, resumen.vigentes) == (4, 1, 1, 2)


def test_cada_item_indica_categoria_y_referencia(db_session: Session, datos):
    items = {i.titulo: i for i in services.obtener_vencimientos_consolidados(db_session).items}

    libreta = items["Libreta Sanitaria"]
    assert libreta.categoria == CategoriaVencimiento.PERSONAL
    assert libreta.estado == EstadoVencimiento.VENCIDO
    assert libreta.dias_restantes == -2
    assert libreta.referencia == "Laura Vence (EMP-9601)"
    assert libreta.detalle == "Libreta sanitaria N° LS-1"
    assert items["Capacitación de Personal"].categoria == CategoriaVencimiento.DOCUMENTOS
    trapo = items["Recambio: Trapo de piso"]
    assert (trapo.categoria, trapo.estado, trapo.dias_restantes) == (CategoriaVencimiento.EQUIPOS, EstadoVencimiento.PROXIMO, 5)
    horno = items["Calibración: Horno pastelero"]
    assert horno.categoria == CategoriaVencimiento.CALIBRACION
    assert horno.fecha_vencimiento == HOY + timedelta(days=170)
    assert horno.referencia.startswith("Sector Depósito vencimientos")


def test_filtra_por_categoria_y_estado(db_session: Session, datos):
    calibraciones = services.obtener_vencimientos_consolidados(db_session, categoria=CategoriaVencimiento.CALIBRACION)
    vigentes = services.obtener_vencimientos_consolidados(db_session, estado=EstadoVencimiento.VIGENTE)

    assert [i.titulo for i in calibraciones.items] == ["Calibración: Horno pastelero"]
    assert {i.titulo for i in vigentes.items} == {"Calibración: Horno pastelero", "Capacitación de Personal"}
    assert (vigentes.total, vigentes.vencidos) == (2, 0)


def test_sin_datos_el_resumen_esta_vacio(db_session: Session):
    resumen = services.obtener_vencimientos_consolidados(db_session)

    assert (resumen.total, resumen.items) == (0, [])


def test_router_de_vencimientos(client: TestClient, db_session: Session, datos):
    todos = client.get("/vencimientos/")
    assert todos.status_code == 200
    assert todos.json()["total"] == 4

    vencidos = client.get("/vencimientos/", params={"estado": "vencido", "categoria": "personal"}).json()
    assert len(vencidos["items"]) == 1
    assert vencidos["items"][0]["id"].startswith("doc-")
    assert vencidos["items"][0]["categoria"] == "personal"
    assert vencidos["vencidos"] == 1
    assert client.get("/vencimientos/", params={"categoria": "otra"}).status_code == 422
