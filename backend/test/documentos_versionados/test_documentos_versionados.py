from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.asociaciones.version_documento import EstadoVersionDocumento
from src.documentos_versionados import exceptions, schemas, services
from src.documentos_versionados.constants import TipoDocumentoVersionado
from src.empleados.models import Empleado, RolEmpleado

PDF = "data:application/pdf;base64,JVBERi0xLjQK"
ADMIN = {"X-User-Role": "admin"}
OPERARIO = {"X-User-Role": "operario"}


@pytest.fixture
def admin(db_session: Session) -> Empleado:
    empleado = Empleado(legajo="EMP-9701", dni="37000001", nombre="Rita", apellido="Docs", activo=True, rol=RolEmpleado.ADMIN)
    db_session.add(empleado)
    db_session.commit()
    return empleado


def _crear(db: Session, nombre: str = "Manual BPM", autor=None):
    return services.crear_documento_versionado(
        db,
        schemas.DocumentoVersionadoCreate(
            nombre=nombre,
            tipo=TipoDocumentoVersionado.MANUAL_BPM,
            version_documento_url=PDF,
            archivo_nombre="manual.pdf",
            subido_por_id=autor.id if autor else None,
        ),
    )


def _nueva_version(db: Session, documento_id: int, fecha: date = None):
    return services.subir_nueva_version_documento(
        db,
        schemas.VersionDocumentoCreate(
            documentos_versionados_id=documento_id, version_documento_url=PDF, archivo_nombre="v.pdf", fecha_vigencia=fecha
        ),
    )


def test_crear_deja_la_version_uno_vigente(db_session: Session, admin):
    documento = _crear(db_session, autor=admin)

    vigente = documento.version_vigente
    assert (vigente.version, vigente.estado) == (1, EstadoVersionDocumento.ACTIVO)
    assert vigente.fecha_vigencia == date.today()
    assert vigente.subido_por.legajo == "EMP-9701"


def test_no_se_repite_el_nombre(db_session: Session):
    _crear(db_session)

    with pytest.raises(exceptions.DocumentoVersionadoDuplicado):
        _crear(db_session)


def test_el_archivo_debe_ser_imagen_o_pdf(db_session: Session):
    with pytest.raises(exceptions.VersionDocumentoFormatoInvalido):
        services.crear_documento_versionado(
            db_session,
            schemas.DocumentoVersionadoCreate(
                nombre="Ficha", tipo=TipoDocumentoVersionado.FICHA_TECNICA, version_documento_url="texto plano"
            ),
        )


def test_una_nueva_version_archiva_la_anterior(db_session: Session):
    documento = _crear(db_session)

    nueva = _nueva_version(db_session, documento.id)

    assert (nueva.version, nueva.estado) == (2, EstadoVersionDocumento.ACTIVO)
    historial = services.historial_de_versiones_documento_versionado(db_session, documento.id)
    assert [(v.version, v.estado) for v in historial] == [
        (2, EstadoVersionDocumento.ACTIVO),
        (1, EstadoVersionDocumento.ARCHIVADO),
    ]


def test_nueva_version_de_documento_inexistente(db_session: Session):
    with pytest.raises(exceptions.DocumentoVersionadoNoEncontrado):
        _nueva_version(db_session, 999)
    with pytest.raises(exceptions.IdDocumentoVersionadoRequerido):
        services.subir_nueva_version_documento(db_session, schemas.VersionDocumentoCreate(version_documento_url=PDF))


def test_marcar_vigente_una_version_anterior(db_session: Session, admin):
    documento = _crear(db_session)
    _nueva_version(db_session, documento.id)

    vigente = services.marcar_version_vigente(db_session, documento.id, 1, modificado_por_id=admin.id)

    assert (vigente.version, vigente.estado) == (1, EstadoVersionDocumento.ACTIVO)
    assert vigente.modificado_por.legajo == "EMP-9701"
    estados = {v.version: v.estado for v in services.historial_de_versiones_documento_versionado(db_session, documento.id)}
    assert estados == {1: EstadoVersionDocumento.ACTIVO, 2: EstadoVersionDocumento.ARCHIVADO}


def test_marcar_vigente_inexistente(db_session: Session):
    documento = _crear(db_session)

    with pytest.raises(exceptions.VersionDocumentoNoEncontrada):
        services.marcar_version_vigente(db_session, documento.id, 7)
    with pytest.raises(exceptions.DocumentoVersionadoNoEncontrado):
        services.marcar_version_vigente(db_session, 999, 1)
    with pytest.raises(exceptions.DocumentoVersionadoNoEncontrado):
        services.historial_de_versiones_documento_versionado(db_session, 999)


def test_el_historial_ordena_por_fecha_de_vigencia(db_session: Session):
    documento = _crear(db_session)
    _nueva_version(db_session, documento.id, date.today() - timedelta(days=30))

    historial = services.historial_de_versiones_documento_versionado(db_session, documento.id)

    assert [v.version for v in historial] == [1, 2]


def test_listados(db_session: Session):
    con_version = _crear(db_session, "Procedimiento de limpieza")

    todos = services.listar_documentos_versionados(db_session)
    vigentes = services.listar_documentos_versionados_vigentes(db_session)

    assert [d.id for d in todos] == [con_version.id]
    assert [d.version_vigente.version for d in vigentes] == [1]


def test_router_de_documentos_versionados(client: TestClient, db_session: Session, admin):
    creado = client.post(
        "/documentos-versionados/",
        json={"nombre": "Manual BPM", "tipo": "manual_bpm", "version_documento_url": PDF, "archivo_nombre": "m.pdf"},
    )
    assert creado.status_code == 200
    documento_id = creado.json()["id"]

    nueva = client.post(f"/documentos-versionados/{documento_id}", json={"version_documento_url": PDF})
    assert nueva.status_code == 200
    assert nueva.json()["version"] == 2

    assert client.get(f"/documentos/{documento_id}/versiones", headers=OPERARIO).status_code == 403
    assert len(client.get(f"/documentos/{documento_id}/versiones", headers=ADMIN).json()) == 2

    assert client.put(f"/documentos/{documento_id}/versiones/1/vigencia", headers=OPERARIO).status_code == 403
    vigencia = client.put(
        f"/documentos/{documento_id}/versiones/1/vigencia", headers={**ADMIN, "X-User-Id": str(admin.id)}
    )
    assert vigencia.status_code == 200
    assert vigencia.json()["modificado_por_id"] == admin.id

    assert client.get("/documentos/vigentes").status_code == 403
    vigentes = client.get("/documentos/vigentes", headers=OPERARIO).json()
    assert vigentes[0]["version_vigente"]["version"] == 1
    assert len(client.get("/documentos-versionados/").json()) == 1
