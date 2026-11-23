from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.alergenos import schemas as alergenos_schemas
from src.alergenos import services as alergenos_services
from src.insumos.models import Insumo
from src.parametros_normativos.constants import SelloAdvertencia
from src.recetas import schemas as recetas_schemas
from src.recetas import services as recetas_services
from src.rotulado_frontal import services as frontal_services
from src.rotulados import schemas, services
from test.rotulados.conftest import DATOS_COMPLETOS, crear_lote, crear_rotulo, evaluar, version_receta

LEYENDA = "BORRADOR: debe ser revisado por un/a profesional y por la autoridad sanitaria competente antes de su uso"


def _confirmar_alergenos(db: Session, producto, admin) -> None:
    alergenos_services.guardar_declaracion(
        db,
        producto.id,
        alergenos_schemas.DeclaracionUpdate(
            empleado_id=admin.id, contiene=["trigo", "leche"], contiene_gluten=True, puede_contener=["huevo"], confirmar=True
        ),
    )
    alergenos_services.guardar_conservacion(
        db,
        producto.id,
        alergenos_schemas.ConservacionUpdate(empleado_id=admin.id, duracion=60, instrucciones="Mantener en lugar fresco y seco"),
    )


def _rotulo_completo(db: Session, producto, admin):
    evaluar(db, producto, admin, agrega_azucares=True, agrega_grasas=True)
    frontal_services.calcular_sellos_producto(db, producto.id, admin.id)
    _confirmar_alergenos(db, producto, admin)
    rotulo = crear_rotulo(db, producto, admin, instrucciones_uso="Consumir en el día una vez abierto.", **DATOS_COMPLETOS)
    lote = crear_lote(db, producto)
    services.asociar_lote(
        db, rotulo.id, schemas.RotuloLoteCrear(nro_lote=lote.nro_lote, fecha_duracion=date(2027, 1, 19)), 1
    )
    return rotulo, lote


def test_muestra_todos_los_elementos_del_rotulo(db_session: Session, producto, receta, parametros, admin):
    rotulo, lote = _rotulo_completo(db_session, producto, admin)

    vista = services.obtener_vista_previa(db_session, rotulo.id)

    assert vista.leyenda_borrador == LEYENDA
    cara = vista.cara_principal
    assert cara.denominacion_venta == "Galletitas dulces con manteca"
    assert (cara.contenido_neto, cara.unidad_contenido_neto) == (300, "g")
    assert cara.aplica_advertencias is True
    assert [s.sello for s in cara.sellos] == [
        SelloAdvertencia.EXCESO_AZUCARES,
        SelloAdvertencia.EXCESO_GRASAS_TOTALES,
        SelloAdvertencia.EXCESO_GRASAS_SATURADAS,
        SelloAdvertencia.EXCESO_CALORIAS,
    ]
    assert cara.sellos[0].texto == "EXCESO EN AZÚCARES"
    assert cara.parametros_version == parametros.version
    assert vista.lista_ingredientes == "Ingredientes: harina de trigo 000, azúcar, manteca."
    assert vista.alergenos.contiene == "CONTIENE TRIGO Y LECHE."
    assert vista.alergenos.puede_contener == "PUEDE CONTENER HUEVO."
    assert vista.origen.rnpa_rppa == "RNPA 04-123456"
    assert vista.origen.razon_social == "Dulces del Sur S.R.L."
    assert vista.lote.nro_lote == lote.nro_lote and vista.lote.fecha_duracion == date(2027, 1, 19)
    assert vista.conservacion.startswith("Duración: 60 días")
    assert vista.instrucciones_uso == "Consumir en el día una vez abierto."
    assert vista.tabla_nutricional.porcion_gramos == 30
    assert vista.tabla_nutricional.filas[0].nombre == "Valor energético"
    assert vista.tabla_nutricional.filas[0].valor_100g == "443 kcal"
    assert vista.advertencias == []
    assert vista.faltantes == []
    assert vista.completo is True


def test_advierte_los_datos_obligatorios_que_faltan(db_session: Session, producto, receta, parametros, admin):
    rotulo = crear_rotulo(db_session, producto, admin)

    vista = services.obtener_vista_previa(db_session, rotulo.id)

    assert vista.completo is False
    assert {"Denominación de venta", "Contenido neto", "RNPA/RPPA", "Asociación a un lote de producción"} <= set(vista.faltantes)
    assert "Falta evaluar si al producto le corresponde el sistema de advertencias." in vista.advertencias
    assert any("sugerida por el sistema" in a for a in vista.advertencias)
    assert vista.cara_principal.aplica_advertencias is None
    assert vista.leyenda_borrador == LEYENDA


def test_advierte_la_tabla_nutricional_incompleta(db_session: Session, producto, receta, insumos, gramos, parametros, admin):
    nueces = Insumo(nombre="Nueces", unidad_medida=gramos, cantidad=1000)
    db_session.add(nueces)
    db_session.commit()
    insumos = {**insumos, "Nueces": nueces}
    recetas_services.crear_version_receta(
        db_session,
        receta.id,
        recetas_schemas.VersionRecetaCreate(**version_receta(insumos, gramos, {"Harina 000": 500, "Nueces": 100})),
    )
    evaluar(db_session, producto, admin, agrega_azucares=True)
    frontal_services.calcular_sellos_producto(db_session, producto.id, admin.id)
    rotulo = crear_rotulo(db_session, producto, admin, **DATOS_COMPLETOS)

    vista = services.obtener_vista_previa(db_session, rotulo.id)

    assert vista.tabla_nutricional.estado == "incompleta"
    assert vista.tabla_nutricional.insumos_sin_datos == ["Nueces"]
    assert "La tabla nutricional está incompleta: faltan datos nutricionales de Nueces." in vista.advertencias
    assert vista.cara_principal.calculo_provisorio is True
    assert any("provisorio" in a for a in vista.advertencias)
    assert vista.completo is False


def test_indica_que_no_corresponden_octogonos(db_session: Session, producto, receta, parametros, admin):
    evaluar(db_session, producto, admin, envasado=False)
    rotulo = crear_rotulo(db_session, producto, admin)

    cara = services.obtener_vista_previa(db_session, rotulo.id).cara_principal

    assert cara.aplica_advertencias is False
    assert cara.sellos == [] and cara.leyendas == []
    assert "no se envasa en ausencia del cliente" in cara.motivo


def test_avisa_si_falta_calcular_los_sellos(db_session: Session, producto, receta, parametros, admin):
    evaluar(db_session, producto, admin, agrega_sodio=True)
    rotulo = crear_rotulo(db_session, producto, admin)

    vista = services.obtener_vista_previa(db_session, rotulo.id)

    assert vista.cara_principal.aplica_advertencias is True
    assert "Falta calcular los sellos de advertencia del producto." in vista.advertencias
    assert "Cálculo de sellos de advertencia" in vista.faltantes


def test_avisa_si_la_receta_cambio_despues_del_borrador(db_session: Session, producto, receta, insumos, gramos, parametros, admin):
    rotulo, _ = _rotulo_completo(db_session, producto, admin)
    recetas_services.crear_version_receta(
        db_session,
        receta.id,
        recetas_schemas.VersionRecetaCreate(**version_receta(insumos, gramos, {"Harina 000": 600, "Azúcar": 400})),
    )

    vista = services.obtener_vista_previa(db_session, rotulo.id)

    assert vista.receta_version == 1 and vista.receta_version_vigente == 2
    assert any("la vigente es la 2" in a for a in vista.advertencias)
    assert vista.completo is False


def test_avisa_si_la_evaluacion_cambio_despues_del_calculo(db_session: Session, producto, receta, parametros, admin):
    rotulo, _ = _rotulo_completo(db_session, producto, admin)
    evaluar(db_session, producto, admin, agrega_azucares=True, agrega_grasas=True, agrega_sodio=True)

    vista = services.obtener_vista_previa(db_session, rotulo.id)

    assert any("recalculá los sellos" in a for a in vista.advertencias)


def test_permite_elegir_el_lote(db_session: Session, producto, receta, parametros, admin):
    rotulo, primero = _rotulo_completo(db_session, producto, admin)
    segundo = crear_lote(db_session, producto, date(2026, 11, 22))
    asociado = services.asociar_lote(db_session, rotulo.id, schemas.RotuloLoteCrear(nro_lote=segundo.nro_lote), admin.id)

    por_defecto = services.obtener_vista_previa(db_session, rotulo.id)
    elegido = services.obtener_vista_previa(db_session, rotulo.id, por_defecto.lotes[1].rotulo_lote_id)

    assert por_defecto.lote.rotulo_lote_id == asociado.id
    assert f"Fecha de duración del lote {segundo.nro_lote}" in por_defecto.faltantes
    assert elegido.lote.nro_lote == primero.nro_lote
    assert elegido.faltantes == []
    with pytest.raises(HTTPException) as error:
        services.obtener_vista_previa(db_session, rotulo.id, 9999)
    assert error.value.status_code == 404


def test_con_el_modulo_desactivado_no_muestra_advertencias(db_session: Session, producto, receta, parametros, admin):
    from src.parametros_normativos import services as parametros_services
    from src.parametros_normativos.schemas import CambioModulo

    rotulo, _ = _rotulo_completo(db_session, producto, admin)
    parametros_services.cambiar_modulo(db_session, CambioModulo(activo=False, empleado_id=admin.id))

    cara = services.obtener_vista_previa(db_session, rotulo.id).cara_principal

    assert cara.aplica_advertencias is None
    assert cara.sellos == []
    assert "desactivado" in cara.motivo


def test_avisa_si_los_sellos_son_de_otra_version_de_receta(db_session: Session, producto, receta, insumos, gramos, parametros, admin):
    rotulo, _ = _rotulo_completo(db_session, producto, admin)
    recetas_services.crear_version_receta(
        db_session,
        receta.id,
        recetas_schemas.VersionRecetaCreate(**version_receta(insumos, gramos, {"Harina 000": 600, "Azúcar": 400})),
    )
    services.actualizar_snapshots(db_session, rotulo.id, admin.id)

    vista = services.obtener_vista_previa(db_session, rotulo.id)

    assert vista.receta_version == 2
    assert any("Los sellos se calcularon con la versión 1" in a for a in vista.advertencias)
