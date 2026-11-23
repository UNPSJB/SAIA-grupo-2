from datetime import datetime

import pytest
from sqlalchemy.orm import Session

from src.datos_nutricionales.constants import FuenteDatoNutricional, Nutriente
from src.datos_nutricionales.models import DatoNutricionalInsumo
from src.insumos.models import Insumo
from src.parametros_normativos import services as parametros_services
from src.parametros_normativos.constants import SelloAdvertencia
from src.parametros_normativos.exceptions import ModuloDesactivado
from src.parametros_normativos.schemas import CambioModulo
from src.rotulado_frontal import schemas, services
from src.rotulado_frontal.constants import ResultadoAplicabilidad
from src.unidades_medida.constants import MagnitudUnidad
from src.unidades_medida.models import UnidadMedida
from test.rotulado_frontal.conftest import cargar_receta

N = Nutriente
S = SelloAdvertencia
COMPOSICIONES = {
    "Harina": {N.ENERGIA: 350, N.AZUCARES_TOTALES: 1, N.GRASAS_TOTALES: 1, N.GRASAS_SATURADAS: 0.2, N.SODIO: 2},
    "Azúcar": {N.ENERGIA: 400, N.AZUCARES_TOTALES: 100, N.AZUCARES_ANADIDOS: 100},
    "Manteca": {N.ENERGIA: 740, N.GRASAS_TOTALES: 82, N.GRASAS_SATURADAS: 51, N.SODIO: 10},
    "Pasas": {N.ENERGIA: 300, N.AZUCARES_TOTALES: 60},
    "Sal": {N.SODIO: 38758},
    "Agua": {},
}


@pytest.fixture
def materias(db_session: Session, admin) -> dict:
    gramos = UnidadMedida(nombre="Gramos sellos", magnitud=MagnitudUnidad.MASA, factor_base=1.0)
    insumos = {nombre: Insumo(nombre=nombre, unidad_medida=gramos) for nombre in COMPOSICIONES}
    db_session.add_all(insumos.values())
    db_session.commit()
    for nombre, valores in COMPOSICIONES.items():
        for nutriente in Nutriente:
            valor = valores.get(nutriente, 0)
            db_session.add(
                DatoNutricionalInsumo(
                    insumo_id=insumos[nombre].id,
                    nutriente=nutriente,
                    valor=valor,
                    valor_fuente=valor,
                    fuente=FuenteDatoNutricional.VALOR_PROPIO,
                    fecha_carga=datetime.now(),
                    cargado_por_id=admin.id,
                )
            )
    db_session.commit()
    return insumos


def _evaluar(db, producto, admin, envasado=True, **marcas):
    return services.evaluar(
        db,
        producto.id,
        schemas.NuevaEvaluacion(empleado_id=admin.id, envasado_en_ausencia_del_cliente=envasado, **marcas),
    )


def _receta(db, producto, materias, **gramos):
    cargar_receta(db, producto, 1, [(materias[nombre], cantidad, None) for nombre, cantidad in gramos.items()])


def _paso(resultado, sello, forma=None):
    return next(
        p for p in resultado.pasos_calculo if p.sello == sello and (forma is None or p.forma_evaluacion.value == forma)
    )


def test_no_envasado_no_lleva_sellos(db_session: Session, admin, vigente, galletitas):
    _evaluar(db_session, galletitas, admin, envasado=False, agrega_azucares=True)

    resultado = services.calcular_sellos_producto(db_session, galletitas.id, admin.id)

    assert resultado.resultado_aplicabilidad == ResultadoAplicabilidad.NO_ENVASADO
    assert resultado.sellos_obtenidos == []
    assert resultado.leyendas_obtenidas == []
    assert resultado.provisorio is False


def test_sin_receta_el_calculo_queda_provisorio(db_session: Session, admin, vigente, galletitas):
    _evaluar(db_session, galletitas, admin, agrega_azucares=True)

    resultado = services.calcular_sellos_producto(db_session, galletitas.id, admin.id)

    assert resultado.resultado_aplicabilidad == ResultadoAplicabilidad.CORRESPONDE
    assert resultado.provisorio is True
    assert "no cuenta con una version vigente de receta" in (resultado.motivo_aplicabilidad or "")


def test_sin_calculos_no_hay_calculo_vigente(db_session: Session, galletitas):
    assert services.obtener_calculo_sellos_vigente(db_session, galletitas.id) is None


def test_calcula_porcentaje_de_energia_y_exceso_en_calorias(db_session, admin, vigente, galletitas, materias):
    _receta(db_session, galletitas, materias, Harina=600, Azúcar=250, Manteca=150)
    _evaluar(db_session, galletitas, admin, agrega_azucares=True, agrega_grasas=True)

    resultado = services.calcular_sellos_producto(db_session, galletitas.id, admin.id)

    assert [s.sello for s in resultado.sellos_obtenidos] == [S.EXCESO_AZUCARES, S.EXCESO_GRASAS_SATURADAS, S.EXCESO_CALORIAS]
    assert resultado.sellos_obtenidos[0].texto == "EXCESO EN AZÚCARES"
    azucares = _paso(resultado, S.EXCESO_AZUCARES)
    assert azucares.valor_gramos_100g == 25
    assert azucares.energia_total_kcal_100g == 421
    assert azucares.valor_calculado == pytest.approx(23.75, abs=0.01)
    grasas = _paso(resultado, S.EXCESO_GRASAS_TOTALES)
    assert grasas.valor_calculado == pytest.approx(27.58, abs=0.01)
    assert grasas.supera_umbral is False
    calorias = _paso(resultado, S.EXCESO_CALORIAS)
    assert calorias.evaluado is True and calorias.valor_calculado == 421
    assert _paso(resultado, S.EXCESO_SODIO, "mg_por_kcal").evaluado is False
    assert resultado.provisorio is False


def test_calorias_solo_con_sello_de_azucares_o_grasas(db_session, admin, vigente, galletitas, materias):
    _receta(db_session, galletitas, materias, Harina=950, Manteca=50)
    _evaluar(db_session, galletitas, admin, agrega_grasas=True)

    resultado = services.calcular_sellos_producto(db_session, galletitas.id, admin.id)

    assert resultado.sellos_obtenidos == []
    calorias = _paso(resultado, S.EXCESO_CALORIAS)
    assert calorias.evaluado is False
    assert "sello de azúcares, grasas totales o grasas saturadas" in calorias.motivo_no_evaluado


def test_los_azucares_naturales_no_cuentan_como_anadidos(db_session, admin, vigente, galletitas, materias):
    _receta(db_session, galletitas, materias, Harina=700, Pasas=300)
    _evaluar(db_session, galletitas, admin, agrega_azucares=True)

    resultado = services.calcular_sellos_producto(db_session, galletitas.id, admin.id)

    assert _paso(resultado, S.EXCESO_AZUCARES).valor_gramos_100g == 0
    assert resultado.sellos_obtenidos == []


def test_sodio_por_kcal_y_cada_100_gramos(db_session, admin, vigente, galletitas, materias):
    _receta(db_session, galletitas, materias, Harina=990, Sal=10)
    _evaluar(db_session, galletitas, admin, agrega_sodio=True)

    resultado = services.calcular_sellos_producto(db_session, galletitas.id, admin.id)

    assert [s.sello for s in resultado.sellos_obtenidos] == [S.EXCESO_SODIO]
    assert _paso(resultado, S.EXCESO_SODIO, "mg_por_kcal").valor_calculado == pytest.approx(1.12, abs=0.01)
    assert _paso(resultado, S.EXCESO_SODIO, "cantidad_cada_100").valor_calculado == pytest.approx(389.56, abs=0.01)


def test_bebida_sin_aporte_energetico_usa_el_parametro_por_porcion(db_session, admin, vigente, jugo, materias):
    _receta(db_session, jugo, materias, Agua=978, Azúcar=20, Sal=2)
    _evaluar(db_session, jugo, admin, agrega_sodio=True)

    resultado = services.calcular_sellos_producto(db_session, jugo.id, admin.id)

    pasos_sodio = [p for p in resultado.pasos_calculo if p.sello == S.EXCESO_SODIO and p.limite_umbral == 40]
    assert len(pasos_sodio) == 1 and pasos_sodio[0].evaluado is True
    assert pasos_sodio[0].supera_umbral is True


def test_bebida_con_aporte_energetico_no_usa_el_criterio_de_40_mg(db_session, admin, vigente, jugo, materias):
    _receta(db_session, jugo, materias, Agua=968, Azúcar=30, Sal=2)
    _evaluar(db_session, jugo, admin, agrega_sodio=True)

    resultado = services.calcular_sellos_producto(db_session, jugo.id, admin.id)

    paso = next(p for p in resultado.pasos_calculo if p.sello == S.EXCESO_SODIO and p.limite_umbral == 40)
    assert paso.evaluado is False
    assert "4 kcal por porción" in paso.motivo_no_evaluado


def test_leyendas_salen_de_las_reglas_de_la_version(db_session, admin, vigente, galletitas, materias):
    _receta(db_session, galletitas, materias, Harina=1000)
    _evaluar(db_session, galletitas, admin, contiene_edulcorantes=True, contiene_cafeina=True)

    resultado = services.calcular_sellos_producto(db_session, galletitas.id, admin.id)

    assert [l.sello for l in resultado.leyendas_obtenidas] == [S.CONTIENE_EDULCORANTES, S.CONTIENE_CAFEINA]
    assert resultado.leyendas_obtenidas[0].texto == "CONTIENE EDULCORANTES, NO RECOMENDABLE EN NIÑOS/AS."
    assert resultado.sellos_obtenidos == []


def test_sin_agregados_informa_el_motivo(db_session, admin, vigente, galletitas, materias):
    _receta(db_session, galletitas, materias, Harina=600, Azúcar=400)
    _evaluar(db_session, galletitas, admin)

    resultado = services.calcular_sellos_producto(db_session, galletitas.id, admin.id)

    assert resultado.resultado_aplicabilidad == ResultadoAplicabilidad.SIN_AGREGADOS
    assert resultado.sellos_obtenidos == []
    assert "no corresponden sellos" in resultado.motivo_aplicabilidad


def test_tabla_incompleta_deja_el_calculo_provisorio(db_session, admin, vigente, galletitas, materias):
    sin_datos = Insumo(nombre="Nueces", unidad_medida=materias["Harina"].unidad_medida)
    db_session.add(sin_datos)
    db_session.commit()
    cargar_receta(db_session, galletitas, 1, [(materias["Azúcar"], 500, None), (sin_datos, 500, None)])
    _evaluar(db_session, galletitas, admin, agrega_azucares=True)

    resultado = services.calcular_sellos_producto(db_session, galletitas.id, admin.id)

    assert resultado.provisorio is True
    assert [s.sello for s in resultado.sellos_obtenidos] == [S.EXCESO_AZUCARES]


def test_el_calculo_guarda_version_de_receta_y_de_parametros(db_session, admin, vigente, galletitas, materias):
    _receta(db_session, galletitas, materias, Harina=600, Azúcar=250, Manteca=150)
    _evaluar(db_session, galletitas, admin, agrega_azucares=True, contiene_edulcorantes=True)
    calculado = services.calcular_sellos_producto(db_session, galletitas.id, admin.id)

    guardado = services.obtener_calculo_sellos_vigente(db_session, galletitas.id)

    assert guardado.id == calculado.id
    assert guardado.version_receta == 1
    assert guardado.parametros.version == vigente.version
    assert [s.sello for s in guardado.sellos_obtenidos] == [s.sello for s in calculado.sellos_obtenidos]
    assert [l.sello for l in guardado.leyendas_obtenidas] == [S.CONTIENE_EDULCORANTES]
    assert len(guardado.pasos_calculo) == len(calculado.pasos_calculo)


def test_con_el_modulo_desactivado_no_calcula(db_session, admin, vigente, galletitas):
    parametros_services.cambiar_modulo(db_session, CambioModulo(activo=False, empleado_id=admin.id))

    with pytest.raises(ModuloDesactivado):
        services.calcular_sellos_producto(db_session, galletitas.id, admin.id)
