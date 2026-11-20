import pytest

from src.parametros_normativos import exceptions as parametros_exceptions
from src.parametros_normativos import schemas as parametros_schemas
from src.parametros_normativos import services as parametros_services
from src.parametros_normativos.constants import Agregado
from src.recetas.constants import EstadoVersionReceta
from src.rotulado_frontal import schemas, services
from src.rotulado_frontal.constants import ResultadoAplicabilidad
from test.rotulado_frontal.conftest import cargar_receta


def _marcar(db, admin, *cambios):
    return services.actualizar_marcas_insumos(
        db,
        schemas.ActualizacionMarcasInsumos(
            empleado_id=admin.id, marcas=[schemas.CambioMarcaInsumo(**cambio) for cambio in cambios]
        ),
    )


def test_los_insumos_arrancan_sin_revisar(db_session, vigente, insumos):
    marcas = services.listar_marcas_insumos(db_session)
    assert [m.insumo.nombre for m in marcas] == ["Azúcar", "Harina", "Manteca", "Sucralosa"]
    assert not any(m.revisado for m in marcas)


def test_guardar_marcas_de_insumos(db_session, admin, vigente, insumos):
    marcas = _marcar(
        db_session,
        admin,
        {"insumo_id": insumos["Azúcar"].id, "agrega_azucares": True},
        {"insumo_id": insumos["Harina"].id},
    )
    por_nombre = {m.insumo.nombre: m for m in marcas}
    assert por_nombre["Azúcar"].revisado and por_nombre["Azúcar"].agrega_azucares
    assert por_nombre["Azúcar"].cambiado_por.id == admin.id
    assert por_nombre["Harina"].revisado and not por_nombre["Harina"].agrega_azucares
    assert not por_nombre["Manteca"].revisado

    corregidas = _marcar(db_session, admin, {"insumo_id": insumos["Azúcar"].id, "agrega_azucares": False})
    assert not {m.insumo.nombre: m for m in corregidas}["Azúcar"].agrega_azucares


def test_un_producto_sin_receta_no_tiene_propuesta(db_session, vigente, galletitas):
    propuesta = services.proponer_marcas(db_session, galletitas.id)
    assert propuesta.tiene_receta is False
    assert propuesta.origenes == []


def test_la_propuesta_sale_de_las_marcas_de_insumos_y_de_la_clase_de_aditivo(
    db_session, admin, vigente, galletitas, insumos, sucralosa
):
    _marcar(
        db_session,
        admin,
        {"insumo_id": insumos["Azúcar"].id, "agrega_azucares": True},
        {"insumo_id": insumos["Harina"].id},
    )
    cargar_receta(
        db_session,
        galletitas,
        1,
        [(insumos["Harina"], 600, None), (insumos["Azúcar"], 200, None), (insumos["Manteca"], 150, None), (insumos["Sucralosa"], 1, sucralosa)],
    )

    propuesta = services.proponer_marcas(db_session, galletitas.id)
    assert propuesta.tiene_receta and propuesta.version_receta == 1
    assert propuesta.agrega_azucares and propuesta.contiene_edulcorantes
    assert not propuesta.agrega_grasas
    assert [(o.agregado, o.insumo, o.aditivo) for o in propuesta.origenes] == [
        (Agregado.AZUCARES, "Azúcar", None),
        (Agregado.EDULCORANTES, "Sucralosa", "Sucralosa"),
    ]
    assert propuesta.origenes[1].clase_funcional == "edulcorante"
    assert [i.nombre for i in propuesta.insumos_sin_revisar] == ["Manteca", "Sucralosa"]


def test_la_propuesta_usa_la_ultima_version_activa_de_la_receta(db_session, admin, vigente, galletitas, insumos):
    _marcar(
        db_session,
        admin,
        {"insumo_id": insumos["Azúcar"].id, "agrega_azucares": True},
        {"insumo_id": insumos["Manteca"].id, "agrega_grasas": True},
    )
    cargar_receta(db_session, galletitas, 1, [(insumos["Azúcar"], 100, None)])
    cargar_receta(db_session, galletitas, 2, [(insumos["Manteca"], 100, None)])
    cargar_receta(db_session, galletitas, 3, [(insumos["Azúcar"], 100, None)], estado=EstadoVersionReceta.ARCHIVADO)

    propuesta = services.proponer_marcas(db_session, galletitas.id)
    assert propuesta.version_receta == 2
    assert propuesta.agrega_grasas and not propuesta.agrega_azucares


def test_las_clases_de_aditivo_salen_de_los_parametros_vigentes(db_session, admin, vigente, galletitas, insumos, sucralosa):
    cargar_receta(db_session, galletitas, 1, [(insumos["Sucralosa"], 1, sucralosa)])
    borrador = parametros_services.crear_borrador(db_session, parametros_schemas.NuevoBorrador(empleado_id=admin.id))
    parametros_services.modificar_borrador(db_session, borrador.id, parametros_schemas.BorradorUpdate(clases_aditivo=[]))
    parametros_services.publicar(db_session, borrador.id, parametros_schemas.Publicacion(empleado_id=admin.id))

    assert services.proponer_marcas(db_session, galletitas.id).contiene_edulcorantes is False


def test_la_evaluacion_registra_la_receta_y_si_se_corrigieron_las_marcas(
    db_session, admin, vigente, galletitas, insumos, sucralosa
):
    cargar_receta(db_session, galletitas, 1, [(insumos["Sucralosa"], 1, sucralosa)])
    base = {"empleado_id": admin.id, "envasado_en_ausencia_del_cliente": True}

    igual = services.evaluar(db_session, galletitas.id, schemas.NuevaEvaluacion(**base, contiene_edulcorantes=True))
    assert igual.version_receta == 1
    assert igual.marcas_corregidas is False
    assert igual.resultado == ResultadoAplicabilidad.CORRESPONDE

    corregida = services.evaluar(
        db_session, galletitas.id, schemas.NuevaEvaluacion(**base, contiene_edulcorantes=True, agrega_sodio=True)
    )
    assert corregida.marcas_corregidas is True


def test_sin_receta_la_evaluacion_es_manual(db_session, admin, vigente, galletitas):
    evaluacion = services.evaluar(
        db_session,
        galletitas.id,
        schemas.NuevaEvaluacion(empleado_id=admin.id, envasado_en_ausencia_del_cliente=True, agrega_sodio=True),
    )
    assert evaluacion.version_receta is None
    assert evaluacion.marcas_corregidas is False


def test_con_el_modulo_apagado_no_hay_propuesta_ni_marcas(db_session, admin, vigente, galletitas):
    parametros_services.cambiar_modulo(db_session, parametros_schemas.CambioModulo(activo=False, empleado_id=admin.id))
    with pytest.raises(parametros_exceptions.ModuloDesactivado):
        services.proponer_marcas(db_session, galletitas.id)
    with pytest.raises(parametros_exceptions.ModuloDesactivado):
        services.listar_marcas_insumos(db_session)


def test_endpoints_de_marcas_y_propuesta(client, admin, vigente, galletitas, insumos, db_session):
    respuesta = client.put(
        "/rotulado-frontal/insumos",
        json={"empleado_id": admin.id, "marcas": [{"insumo_id": insumos["Manteca"].id, "agrega_grasas": True}]},
    )
    assert respuesta.status_code == 200
    assert {m["insumo"]["nombre"]: m["agrega_grasas"] for m in respuesta.json()}["Manteca"] is True
    assert client.get("/rotulado-frontal/insumos").status_code == 200

    cargar_receta(db_session, galletitas, 1, [(insumos["Manteca"], 100, None)])
    propuesta = client.get(f"/rotulado-frontal/productos/{galletitas.id}/propuesta").json()
    assert propuesta["agrega_grasas"] is True
    assert propuesta["origenes"] == [{"agregado": "grasas", "insumo": "Manteca", "aditivo": None, "clase_funcional": None}]

    inexistente = client.put("/rotulado-frontal/insumos", json={"empleado_id": admin.id, "marcas": [{"insumo_id": 999}]})
    assert inexistente.status_code == 404
