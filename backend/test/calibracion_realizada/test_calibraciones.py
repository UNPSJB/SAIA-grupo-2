from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.calibracion_realizada import exceptions, schemas, services
from src.equipos.constants import EstadoEquipo
from src.equipos.models import Equipo, TipoEquipo
from src.sectores.models import Sector

CERTIFICADO = "data:application/pdf;base64,JVBERi0xLjQK"
HOY = date.today()


@pytest.fixture
def equipo(db_session: Session) -> Equipo:
    sector = Sector(nombre="Cocina calibraciones")
    tipo = TipoEquipo(nombre="balanza")
    db_session.add_all([sector, tipo])
    db_session.commit()
    equipo = Equipo(
        nombre="Balanza de precisión",
        activo=True,
        sector_id=sector.id,
        tipo_id=tipo.id,
        estado=EstadoEquipo.BUENO,
        frecuencia_mantenimiento_dias=90,
        fecha_ultimo_mantenimiento=HOY - timedelta(days=30),
    )
    db_session.add(equipo)
    db_session.commit()
    db_session.refresh(equipo)
    return equipo


def _calibracion(equipo_id: int, fecha: date = HOY, certificado: str = CERTIFICADO):
    return schemas.CalibracionRealizadaCreate(fecha=fecha, equipo_id=equipo_id, certificacion_url=certificado)


def test_registrar_actualiza_el_ultimo_mantenimiento(db_session: Session, equipo):
    calibracion = services.crear_calibracion_realizada(db_session, _calibracion(equipo.id))

    assert calibracion.equipo_id == equipo.id
    db_session.refresh(equipo)
    assert equipo.fecha_ultimo_mantenimiento == HOY


def test_una_calibracion_anterior_no_pisa_el_ultimo_mantenimiento(db_session: Session, equipo):
    services.crear_calibracion_realizada(db_session, _calibracion(equipo.id, HOY - timedelta(days=60)))

    db_session.refresh(equipo)
    assert equipo.fecha_ultimo_mantenimiento == HOY - timedelta(days=30)


def test_no_se_registra_con_fecha_futura(db_session: Session, equipo):
    with pytest.raises(exceptions.FechaMayorAHoy):
        services.crear_calibracion_realizada(db_session, _calibracion(equipo.id, HOY + timedelta(days=1)))


def test_equipo_inexistente(db_session: Session):
    with pytest.raises(exceptions.EquipoNoEncontrado):
        services.crear_calibracion_realizada(db_session, _calibracion(999))
    with pytest.raises(exceptions.EquipoNoEncontrado):
        services.obtener_calibraciones_de_equipo(db_session, 999)


def test_el_certificado_debe_ser_imagen_o_pdf(db_session: Session, equipo):
    with pytest.raises(exceptions.CertificacionFormatoInvalido):
        services.crear_calibracion_realizada(db_session, _calibracion(equipo.id, certificado="https://ejemplo.com/cert.pdf"))


def test_el_certificado_no_puede_superar_el_tamano_maximo(db_session: Session, equipo, monkeypatch):
    monkeypatch.setattr(services, "CARACTERES_MAXIMOS", 40)

    with pytest.raises(exceptions.CertificacionDemasiadoGrande):
        services.crear_calibracion_realizada(db_session, _calibracion(equipo.id, certificado=CERTIFICADO + "A" * 20))


def test_no_se_repite_la_calibracion_del_mismo_dia(db_session: Session, equipo):
    services.crear_calibracion_realizada(db_session, _calibracion(equipo.id))

    with pytest.raises(exceptions.CalibracionDuplicada):
        services.crear_calibracion_realizada(db_session, _calibracion(equipo.id))


def test_listar_y_consultar_por_equipo(db_session: Session, equipo):
    services.crear_calibracion_realizada(db_session, _calibracion(equipo.id, HOY - timedelta(days=10)))
    services.crear_calibracion_realizada(db_session, _calibracion(equipo.id))

    assert len(services.listar_calibraciones_realizadas(db_session)) == 2
    assert {c.fecha for c in services.obtener_calibraciones_de_equipo(db_session, equipo.id)} == {HOY, HOY - timedelta(days=10)}


def test_router_de_calibraciones(client: TestClient, db_session: Session, equipo):
    datos = {"fecha": HOY.isoformat(), "equipo_id": equipo.id, "certificacion_url": CERTIFICADO}

    creada = client.post("/calibraciones_realizadas/", json=datos)

    assert creada.status_code == 200
    assert creada.json()["equipo"]["id"] == equipo.id
    assert client.post("/calibraciones_realizadas/", json=datos).status_code == 400
    assert len(client.get("/calibraciones_realizadas/").json()) == 1
    assert len(client.get(f"/calibraciones_realizadas/{equipo.id}").json()) == 1
    assert client.get("/calibraciones_realizadas/999").status_code == 404
