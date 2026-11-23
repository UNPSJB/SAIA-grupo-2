from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.datos_nutricionales.constants import EstadoTablaNutricional, FuenteDatoNutricional, Nutriente
from src.datos_nutricionales.models import DatoNutricionalInsumo
from src.empleados.models import Empleado, RolEmpleado
from src.recetas import exceptions, schemas, services
from src.recetas.constants import EstadoVersionReceta, FormatoDeclaracionAditivos
from src.rotulado_frontal.models import MarcaInsumo
from test.recetas.test_reglas_receta import (
    _crear,
    _nueva_version,
    _receta_base,
    _renglon,
    aditivos,
    insumos,
    producto,
    u,
)

ADMIN = {"X-User-Role": "admin"}
OPERARIO = {"X-User-Role": "operario"}


def _empleado(db: Session) -> Empleado:
    empleado = Empleado(legajo="EMP-9501", dni="35000001", nombre="Eva", apellido="Receta", activo=True, rol=RolEmpleado.ADMIN)
    db.add(empleado)
    db.commit()
    return empleado


def _cargar(db: Session, insumo, valores: dict, empleado) -> None:
    for nutriente in Nutriente:
        valor = valores.get(nutriente, 0)
        db.add(
            DatoNutricionalInsumo(
                insumo_id=insumo.id,
                nutriente=nutriente,
                valor=valor,
                valor_fuente=valor,
                fuente=FuenteDatoNutricional.VALOR_PROPIO,
                fecha_carga=datetime.now(),
                cargado_por_id=empleado.id,
            )
        )
    db.commit()


def test_marcar_vigente_una_version_anterior(db_session: Session, producto, insumos, u):
    receta = _crear(db_session, producto, [_renglon(insumos["harina"], 100, u["g"])])
    _nueva_version(db_session, receta.id, [_renglon(insumos["harina"], 150, u["g"])])

    vigente = services.marcar_version_receta_vigente(db_session, receta.id, 1)

    assert vigente.estado == EstadoVersionReceta.ACTIVO
    assert services.obtener_version_vigente(db_session, receta.id).version == 1
    assert services.leer_version_receta(db_session, receta.id, 2).estado == EstadoVersionReceta.ARCHIVADO


def test_la_receta_guarda_sus_pasos(db_session: Session, producto, insumos, u):
    receta = services.crear_receta(
        db_session,
        schemas.RecetaCreate(
            producto_id=producto.id,
            version_inicial={
                "rendimiento_final_gramos": 100,
                "unidad_venta_gramos": 10,
                "detalles": [_renglon(insumos["harina"], 100, u["g"])],
                "pasos": [
                    {"orden": 1, "nombre_paso": "Amasar", "procedimiento": "Amasar 10 minutos", "es_punto_control": False},
                    {"orden": 2, "nombre_paso": "Hornear", "procedimiento": "Hornear a 180 °C", "temperatura_celsius": 180,
                     "es_punto_control": True},
                ],
            },
        ),
    )

    version = services.obtener_version_vigente(db_session, receta.id)

    assert [(p.nombre_paso, p.es_punto_control) for p in version.pasos] == [("Amasar", False), ("Hornear", True)]


def test_consultas_inexistentes(db_session: Session, producto, insumos, u):
    receta = _crear(db_session, producto, [_renglon(insumos["harina"], 100, u["g"])])

    with pytest.raises(exceptions.RecetaNoEncontrada):
        services.leer_receta(db_session, 999)
    with pytest.raises(exceptions.VersionNoEncontrada):
        services.leer_version_receta(db_session, receta.id, 9)
    with pytest.raises(exceptions.VersionNoEncontrada):
        services.calcular_composicion_receta(db_session, receta.id, 9)


def test_un_aditivo_que_aporta_azucares_sin_energia_deja_la_tabla_incompleta(db_session: Session, producto, insumos, u, aditivos):
    empleado = _empleado(db_session)
    _cargar(db_session, insumos["harina"], {Nutriente.ENERGIA: 350}, empleado)
    receta = _crear(
        db_session,
        producto,
        [_renglon(insumos["harina"], 900, u["g"]), _renglon(insumos["vainilla"], 5, u["g"], aditivos["vainilla"])],
    )
    assert services.calcular_informacion_nutricional_receta(db_session, receta.id).estado == EstadoTablaNutricional.COMPLETA

    db_session.add(MarcaInsumo(insumo_id=insumos["vainilla"].id, agrega_azucares=True, fecha_cambio=datetime.now()))
    db_session.commit()

    tabla = services.calcular_informacion_nutricional_receta(db_session, receta.id)
    assert tabla.estado == EstadoTablaNutricional.INCOMPLETA
    faltante = tabla.faltantes[0]
    assert faltante.insumo_nombre == "Esencia de vainilla"
    assert Nutriente.ENERGIA.value in faltante.datos_faltantes


def test_router_consultas_de_receta(client: TestClient, db_session: Session, producto, insumos, u, aditivos):
    receta = _receta_base(db_session, producto, insumos, u, aditivos)
    _nueva_version(db_session, receta.id, [_renglon(insumos["harina"], 600, u["g"]), _renglon(insumos["azucar"], 400, u["g"])])

    assert [r["id"] for r in client.get("/recetas/").json()] == [receta.id]
    assert client.get(f"/recetas/{receta.id}").json()["producto_id"] == producto.id
    assert sorted(v["version"] for v in client.get(f"/recetas/{receta.id}/versiones").json()) == [1, 2]
    assert client.get(f"/recetas/{receta.id}/versiones/1").json()["estado"] == "archivado"
    assert client.get(f"/recetas/{receta.id}/versiones/vigente/composicion", headers=OPERARIO).status_code == 403
    assert client.get(f"/recetas/{receta.id}/versiones/vigente/composicion", headers=ADMIN).json()["version"] == 2
    assert client.get(f"/recetas/{receta.id}/versiones/1/composicion", headers=ADMIN).json()["version"] == 1
    assert client.get(f"/recetas/{receta.id}/versiones/vigente/nutricion").json()["version"] == 2
    assert client.get(f"/recetas/{receta.id}/versiones/1/nutricion").json()["version"] == 1
    lista = client.get(f"/recetas/{receta.id}/versiones/2/lista-ingredientes").json()
    assert lista["texto_rotulo"] == "Ingredientes: harina de trigo, Azúcar."
    assert client.get("/recetas/999").status_code == 404
    assert client.get(f"/recetas/{receta.id}/versiones/9").status_code == 404


def test_router_vigencia_y_orden_manual(client: TestClient, db_session: Session, producto, insumos, u):
    receta = _crear(db_session, producto, [_renglon(insumos["harina"], 500, u["g"]), _renglon(insumos["azucar"], 500, u["g"])])
    orden = {"orden_insumo_ids": [insumos["azucar"].id, insumos["harina"].id]}

    assert client.put(f"/recetas/{receta.id}/versiones/1/lista-ingredientes/orden-manual", json=orden, headers=OPERARIO).status_code == 403
    manual = client.put(f"/recetas/{receta.id}/versiones/1/lista-ingredientes/orden-manual", json=orden, headers=ADMIN)
    assert manual.status_code == 200
    assert manual.json()["texto_rotulo"] == "Ingredientes: Azúcar, harina de trigo."
    automatico = client.delete(f"/recetas/{receta.id}/versiones/1/lista-ingredientes/orden-manual", headers=ADMIN)
    assert automatico.json()["texto_rotulo"] == "Ingredientes: harina de trigo, Azúcar."

    _nueva_version(db_session, receta.id, [_renglon(insumos["harina"], 700, u["g"])])
    assert client.put(f"/recetas/{receta.id}/versiones/1/vigencia", headers=OPERARIO).status_code == 403
    vigente = client.put(f"/recetas/{receta.id}/versiones/1/vigencia", headers=ADMIN)
    assert vigente.status_code == 200
    assert client.get(f"/recetas/{receta.id}/versiones/vigente").json()["version"] == 1


def test_router_configuracion_del_formato_de_aditivos(client: TestClient, db_session: Session):
    assert client.get("/recetas/configuracion-produccion").status_code == 200

    datos = {"formato_declaracion_aditivos": FormatoDeclaracionAditivos.FUNCION_INS.value}
    assert client.put("/recetas/configuracion-produccion", json=datos, headers=OPERARIO).status_code == 403
    actualizada = client.put("/recetas/configuracion-produccion", json=datos, headers=ADMIN)

    assert actualizada.status_code == 200
    assert client.get("/recetas/configuracion-produccion").json()["formato_declaracion_aditivos"] == "funcion_ins"
