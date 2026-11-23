from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.parametros_normativos.schemas import CambioModulo
from src.parametros_normativos import services as parametros_services
from src.recetas import schemas as recetas_schemas
from src.recetas import services as recetas_services
from src.rotulado_frontal import services as frontal_services
from src.rotulados import schemas, services
from test.rotulados.conftest import DATOS_COMPLETOS, crear_lote, crear_rotulo, evaluar, version_receta

TEXTO_LISTA = "Ingredientes: harina de trigo 000, azúcar, manteca."


def _codigo(error: pytest.ExceptionInfo) -> int:
    return error.value.status_code


def _historial(db: Session, rotulo_id: int) -> list:
    return [
        schemas.HistorialCambioRotuloRespuesta.model_validate(cambio)
        for cambio in services.listar_historial(db, rotulo_id)
    ]


def test_crear_completa_los_datos_que_el_sistema_ya_tiene(db_session: Session, producto, receta, admin):
    rotulo = crear_rotulo(db_session, producto, admin, denominacion_venta="Galletitas")

    assert rotulo.denominacion_venta == "Galletitas"
    assert rotulo.lista_ingredientes == TEXTO_LISTA
    assert rotulo.ingredientes_snapshot["texto_rotulo"] == TEXTO_LISTA
    assert rotulo.nutricion_snapshot["estado"] == "completa"
    assert rotulo.receta_id == receta.id and rotulo.receta_version == 1
    assert rotulo.sellos_snapshot is None


def test_sin_receta_el_borrador_se_crea_sin_datos_automaticos(db_session: Session, producto, admin):
    rotulo = crear_rotulo(db_session, producto, admin)

    assert rotulo.lista_ingredientes is None
    assert rotulo.nutricion_snapshot is None
    assert rotulo.receta_version is None


def test_un_producto_tiene_un_solo_borrador(db_session: Session, producto, admin):
    crear_rotulo(db_session, producto, admin)

    with pytest.raises(HTTPException) as error:
        crear_rotulo(db_session, producto, admin)
    assert _codigo(error) == 409


def test_solo_un_administrador_gestiona_rotulos(db_session: Session, producto, operario):
    with pytest.raises(HTTPException) as error:
        crear_rotulo(db_session, producto, operario)
    assert _codigo(error) == 403


def test_producto_inexistente(db_session: Session, admin):
    with pytest.raises(HTTPException) as error:
        services.crear_rotulo(db_session, schemas.RotuloCrear(producto_id=999), admin.id)
    assert _codigo(error) == 404


def test_editar_deja_constancia_con_quien_y_valor_anterior(db_session: Session, producto, receta, admin):
    rotulo = crear_rotulo(db_session, producto, admin, denominacion_venta="Galletitas")

    services.actualizar_rotulo(
        db_session,
        rotulo.id,
        schemas.RotuloActualizar(
            denominacion_venta="Galletitas dulces",
            lista_ingredientes="Ingredientes: harina de trigo, azúcar, manteca (leche).",
            rnpa_rppa=None,
        ),
        admin.id,
    )

    cambios = {c.campo: c for c in _historial(db_session, rotulo.id)}
    assert set(cambios) == {"denominacion_venta", "lista_ingredientes"}
    assert cambios["lista_ingredientes"].valor_original == TEXTO_LISTA
    assert cambios["denominacion_venta"].valor_nuevo == "Galletitas dulces"
    assert cambios["denominacion_venta"].empleado_nombre == "Ana"
    assert cambios["denominacion_venta"].empleado_apellido == "Rotulo"


def test_actualizar_datos_automaticos_toma_la_receta_vigente(db_session: Session, producto, receta, insumos, gramos, admin):
    rotulo = crear_rotulo(db_session, producto, admin)
    recetas_services.crear_version_receta(
        db_session,
        receta.id,
        recetas_schemas.VersionRecetaCreate(**version_receta(insumos, gramos, {"Azúcar": 500, "Harina 000": 400})),
    )

    actualizado = services.actualizar_snapshots(db_session, rotulo.id, admin.id)

    assert actualizado.receta_version == 2
    assert actualizado.lista_ingredientes == "Ingredientes: azúcar, harina de trigo 000."
    campos = {c.campo for c in _historial(db_session, rotulo.id)}
    assert {"receta_version", "lista_ingredientes", "ingredientes_snapshot", "nutricion_snapshot"} <= campos


def test_los_sellos_salen_del_ultimo_calculo(db_session: Session, producto, receta, parametros, admin):
    evaluar(db_session, producto, admin, agrega_azucares=True, agrega_grasas=True)
    calculo = frontal_services.calcular_sellos_producto(db_session, producto.id, admin.id)

    rotulo = crear_rotulo(db_session, producto, admin)

    assert rotulo.calculo_sellos_id == calculo.id
    assert rotulo.sellos_snapshot == [s.sello.value for s in calculo.sellos_obtenidos]
    assert "exceso_azucares" in rotulo.sellos_snapshot


def test_si_no_corresponden_advertencias_no_lleva_sellos(db_session: Session, producto, receta, parametros, admin):
    evaluar(db_session, producto, admin, envasado=False)

    rotulo = crear_rotulo(db_session, producto, admin)

    assert rotulo.sellos_snapshot == []
    assert rotulo.calculo_sellos_id is None


def test_asociar_lote_valida_producto_y_duplicados(db_session: Session, producto, otro_producto, admin):
    rotulo = crear_rotulo(db_session, producto, admin)
    lote = crear_lote(db_session, producto)
    ajeno = crear_lote(db_session, otro_producto)

    asociado = services.asociar_lote(db_session, rotulo.id, schemas.RotuloLoteCrear(nro_lote=lote.nro_lote), admin.id)
    assert asociado.fecha_duracion is None

    for nro_lote, codigo in ((lote.nro_lote, 409), (ajeno.nro_lote, 400), (9999, 404)):
        with pytest.raises(HTTPException) as error:
            services.asociar_lote(db_session, rotulo.id, schemas.RotuloLoteCrear(nro_lote=nro_lote), admin.id)
        assert _codigo(error) == codigo


def test_cambiar_la_fecha_de_duracion_deja_constancia(db_session: Session, producto, admin):
    rotulo = crear_rotulo(db_session, producto, admin)
    lote = crear_lote(db_session, producto)
    asociado = services.asociar_lote(db_session, rotulo.id, schemas.RotuloLoteCrear(nro_lote=lote.nro_lote), admin.id)

    services.actualizar_rotulo_lote(
        db_session, asociado.id, schemas.RotuloLoteActualizar(fecha_duracion=date(2027, 1, 20)), admin.id
    )

    cambio = _historial(db_session, rotulo.id)[0]
    assert cambio.campo == f"lote:{lote.nro_lote}.fecha_duracion"
    assert cambio.valor_nuevo == "2027-01-20"


def test_completitud_indica_lo_que_falta_sin_impedir_guardar(db_session: Session, producto, receta, parametros, admin):
    rotulo = crear_rotulo(db_session, producto, admin)

    completitud = services.calcular_completitud(db_session, rotulo.id)

    assert completitud["completo"] is False
    assert "Lista de ingredientes" not in completitud["faltantes"]
    assert {"Denominación de venta", "RNPA/RPPA", "Evaluación de rotulado frontal",
            "Asociación a un lote de producción"} <= set(completitud["faltantes"])


def test_completitud_del_importado_pide_los_datos_del_importador(db_session: Session, producto, receta, admin):
    rotulo = crear_rotulo(db_session, producto, admin, es_importado=True, **DATOS_COMPLETOS)

    faltantes = services.calcular_completitud(db_session, rotulo.id)["faltantes"]

    assert {"Razón social del importador", "Domicilio del importador", "País de origen"} <= set(faltantes)


def test_completitud_al_cien_por_ciento(db_session: Session, producto, receta, parametros, admin):
    evaluar(db_session, producto, admin, agrega_azucares=True)
    frontal_services.calcular_sellos_producto(db_session, producto.id, admin.id)
    rotulo = crear_rotulo(db_session, producto, admin, **DATOS_COMPLETOS)
    lote = crear_lote(db_session, producto)
    services.asociar_lote(
        db_session, rotulo.id, schemas.RotuloLoteCrear(nro_lote=lote.nro_lote, fecha_duracion=date(2027, 2, 1)), admin.id
    )

    completitud = services.calcular_completitud(db_session, rotulo.id)

    assert completitud["faltantes"] == []
    assert completitud["porcentaje_completitud"] == 100


def test_con_el_modulo_frontal_desactivado_no_pide_sellos(db_session: Session, producto, receta, admin):
    parametros_services.cambiar_modulo(db_session, CambioModulo(activo=False, empleado_id=admin.id))
    rotulo = crear_rotulo(db_session, producto, admin)

    faltantes = services.calcular_completitud(db_session, rotulo.id)["faltantes"]

    assert not any("rotulado frontal" in f or "sellos" in f for f in faltantes)
