import pytest
from sqlalchemy.orm import Session

from src.parametros_normativos import exceptions as parametros_exceptions
from src.parametros_normativos import schemas as parametros_schemas
from src.parametros_normativos import services as parametros_services
from src.parametros_normativos.constants import Agregado, SelloAdvertencia
from src.productos.exceptions import ProductoNoEncontrado
from src.rotulado_frontal import exceptions, schemas, services
from src.rotulado_frontal.constants import ResultadoAplicabilidad

def _evaluar(db: Session, producto, admin, **respuestas) -> schemas.Evaluacion:
    datos = {"envasado_en_ausencia_del_cliente": True, **respuestas}
    return services.evaluar(db, producto.id, schemas.NuevaEvaluacion(empleado_id=admin.id, **datos))


def test_si_no_se_envasa_en_ausencia_del_cliente_no_corresponde(db_session, admin, vigente, galletitas):
    evaluacion = _evaluar(
        db_session, galletitas, admin, envasado_en_ausencia_del_cliente=False, agrega_azucares=True
    )
    assert evaluacion.resultado == ResultadoAplicabilidad.NO_ENVASADO
    assert evaluacion.sellos_a_evaluar == []
    assert evaluacion.leyendas == []
    assert evaluacion.agrega_azucares is True


def test_un_producto_en_categoria_exceptuada_no_lleva_rotulado(db_session, admin, vigente, galletitas):
    excepcion = vigente.excepciones[0].descripcion
    evaluacion = _evaluar(db_session, galletitas, admin, excepcion=excepcion, agrega_sodio=True)
    assert evaluacion.resultado == ResultadoAplicabilidad.EXCEPTUADO
    assert evaluacion.excepcion == excepcion
    assert evaluacion.sellos_a_evaluar == []


def test_la_excepcion_debe_estar_en_los_parametros_vigentes(db_session, admin, vigente, galletitas):
    with pytest.raises(exceptions.ExcepcionInvalida):
        _evaluar(db_session, galletitas, admin, excepcion="Inventada")


def test_sin_envase_en_ausencia_se_descarta_la_excepcion(db_session, admin, vigente, galletitas):
    evaluacion = _evaluar(
        db_session, galletitas, admin, envasado_en_ausencia_del_cliente=False, excepcion=vigente.excepciones[0].descripcion
    )
    assert evaluacion.excepcion is None


def test_sin_agregados_ni_edulcorantes_ni_cafeina_queda_exceptuado(db_session, admin, vigente, galletitas):
    evaluacion = _evaluar(db_session, galletitas, admin)
    assert evaluacion.resultado == ResultadoAplicabilidad.SIN_AGREGADOS
    assert evaluacion.sellos_a_evaluar == []


def test_con_azucares_agregados_corresponde_evaluar_azucares_y_calorias(db_session, admin, vigente, galletitas):
    evaluacion = _evaluar(db_session, galletitas, admin, agrega_azucares=True)
    assert evaluacion.resultado == ResultadoAplicabilidad.CORRESPONDE
    assert [s.sello for s in evaluacion.sellos_a_evaluar] == [
        SelloAdvertencia.EXCESO_AZUCARES,
        SelloAdvertencia.EXCESO_CALORIAS,
    ]
    assert evaluacion.sellos_a_evaluar[0].texto == "EXCESO EN AZÚCARES"
    assert evaluacion.leyendas == []


def test_los_sellos_salen_en_el_orden_de_la_norma(db_session, admin, vigente, galletitas):
    evaluacion = _evaluar(db_session, galletitas, admin, agrega_sodio=True, agrega_grasas=True, agrega_azucares=True)
    assert [s.sello for s in evaluacion.sellos_a_evaluar] == [
        SelloAdvertencia.EXCESO_AZUCARES,
        SelloAdvertencia.EXCESO_GRASAS_TOTALES,
        SelloAdvertencia.EXCESO_GRASAS_SATURADAS,
        SelloAdvertencia.EXCESO_SODIO,
        SelloAdvertencia.EXCESO_CALORIAS,
    ]


def test_edulcorantes_y_cafeina_generan_leyendas_sin_sellos_de_exceso(db_session, admin, vigente, jugo):
    evaluacion = _evaluar(db_session, jugo, admin, contiene_edulcorantes=True, contiene_cafeina=True)
    assert evaluacion.resultado == ResultadoAplicabilidad.CORRESPONDE
    assert evaluacion.sellos_a_evaluar == []
    assert [s.sello for s in evaluacion.leyendas] == [
        SelloAdvertencia.CONTIENE_EDULCORANTES,
        SelloAdvertencia.CONTIENE_CAFEINA,
    ]
    assert all(s.es_leyenda for s in evaluacion.leyendas)


def test_la_evaluacion_guarda_la_version_de_parametros_usada(db_session, admin, vigente, galletitas):
    primera = _evaluar(db_session, galletitas, admin, agrega_azucares=True)
    borrador = parametros_services.crear_borrador(db_session, parametros_schemas.NuevoBorrador(empleado_id=admin.id))
    parametros_services.modificar_borrador(
        db_session,
        borrador.id,
        parametros_schemas.BorradorUpdate(
            reglas=[parametros_schemas.ReglaAgregadoUpdate(agregado=Agregado.AZUCARES, sellos=[SelloAdvertencia.EXCESO_AZUCARES])]
        ),
    )
    parametros_services.publicar(db_session, borrador.id, parametros_schemas.Publicacion(empleado_id=admin.id))

    segunda = _evaluar(db_session, galletitas, admin, agrega_azucares=True)
    assert segunda.parametros.version == 2
    assert [s.sello for s in segunda.sellos_a_evaluar] == [SelloAdvertencia.EXCESO_AZUCARES]

    historial = services.historial(db_session, galletitas.id)
    assert [e.id for e in historial] == [segunda.id, primera.id]
    assert historial[1].parametros.version == 1
    assert [s.sello for s in historial[1].sellos_a_evaluar] == [
        SelloAdvertencia.EXCESO_AZUCARES,
        SelloAdvertencia.EXCESO_CALORIAS,
    ]


def test_corregir_las_marcas_crea_una_nueva_evaluacion(db_session, admin, vigente, galletitas):
    _evaluar(db_session, galletitas, admin, agrega_azucares=True)
    corregida = _evaluar(db_session, galletitas, admin, agrega_azucares=False)
    estado = services.estado_producto(db_session, galletitas.id)
    assert estado.evaluacion.id == corregida.id
    assert estado.evaluacion.resultado == ResultadoAplicabilidad.SIN_AGREGADOS
    assert len(services.historial(db_session, galletitas.id)) == 2


def test_resumen_incluye_productos_sin_evaluar(db_session, admin, vigente, galletitas, jugo):
    _evaluar(db_session, jugo, admin, contiene_cafeina=True)
    resumen = {estado.producto.nombre: estado for estado in services.resumen(db_session)}
    assert resumen["Galletitas de avena"].evaluacion is None
    assert resumen["Jugo de naranja"].evaluacion.resultado == ResultadoAplicabilidad.CORRESPONDE


def test_sin_parametros_vigentes_no_se_puede_evaluar(db_session, admin, galletitas):
    with pytest.raises(parametros_exceptions.SinParametrosVigentes):
        _evaluar(db_session, galletitas, admin)


def test_producto_inexistente(db_session, admin, vigente):
    with pytest.raises(ProductoNoEncontrado):
        services.evaluar(
            db_session, 999, schemas.NuevaEvaluacion(empleado_id=admin.id, envasado_en_ausencia_del_cliente=True)
        )


def test_con_el_modulo_desactivado_no_se_evalua_ni_se_consulta(db_session, admin, vigente, galletitas):
    _evaluar(db_session, galletitas, admin, agrega_sodio=True)
    parametros_services.cambiar_modulo(db_session, parametros_schemas.CambioModulo(activo=False, empleado_id=admin.id))
    with pytest.raises(parametros_exceptions.ModuloDesactivado):
        _evaluar(db_session, galletitas, admin)
    with pytest.raises(parametros_exceptions.ModuloDesactivado):
        services.resumen(db_session)
    with pytest.raises(parametros_exceptions.ModuloDesactivado):
        services.estado_producto(db_session, galletitas.id)

    parametros_services.cambiar_modulo(db_session, parametros_schemas.CambioModulo(activo=True, empleado_id=admin.id))
    assert services.estado_producto(db_session, galletitas.id).evaluacion.agrega_sodio is True
