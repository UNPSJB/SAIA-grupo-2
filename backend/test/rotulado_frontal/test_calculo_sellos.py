import pytest
from sqlalchemy.orm import Session

from src.rotulado_frontal import schemas, services
from src.rotulado_frontal.constants import ResultadoAplicabilidad


def test_calculo_sellos_producto_no_envasado(db_session: Session, admin, vigente, galletitas):
    # Evaluar como no envasado en ausencia del cliente
    services.evaluar(
        db_session,
        galletitas.id,
        schemas.NuevaEvaluacion(
            empleado_id=admin.id,
            envasado_en_ausencia_del_cliente=False,
            agrega_azucares=True,
        ),
    )

    resultado = services.calcular_sellos_producto(db_session, galletitas.id, admin.id)
    assert resultado.resultado_aplicabilidad == ResultadoAplicabilidad.NO_ENVASADO
    assert resultado.sellos_obtenidos == []
    assert resultado.leyendas_obtenidas == []
    assert resultado.provisorio is False


def test_calculo_sellos_producto_sin_receta(db_session: Session, admin, vigente, galletitas):
    # Evaluar como envasado con agregado de azucares pero sin receta creada
    services.evaluar(
        db_session,
        galletitas.id,
        schemas.NuevaEvaluacion(
            empleado_id=admin.id,
            envasado_en_ausencia_del_cliente=True,
            agrega_azucares=True,
        ),
    )

    resultado = services.calcular_sellos_producto(db_session, galletitas.id, admin.id)
    assert resultado.resultado_aplicabilidad == ResultadoAplicabilidad.CORRESPONDE
    assert resultado.provisorio is True
    assert "no cuenta con una version vigente de receta" in (resultado.motivo_aplicabilidad or "")


def test_obtener_calculo_sellos_vigente_ninguno(db_session: Session, galletitas):
    calculo = services.obtener_calculo_sellos_vigente(db_session, galletitas.id)
    assert calculo is None
