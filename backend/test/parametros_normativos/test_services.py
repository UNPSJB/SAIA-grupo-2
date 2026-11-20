from datetime import date, timedelta

import pytest
from sqlalchemy.orm import Session

from src.parametros_normativos import exceptions, schemas, services
from src.parametros_normativos.constants import (
    Agregado,
    ClaveParametro,
    EstadoConjunto,
    FormaCriterio,
    SelloAdvertencia,
)
from src.parametros_normativos.models import ConjuntoParametros
from src.productos.constants import TipoProducto


def _borrador(db: Session, admin, base_id=None) -> ConjuntoParametros:
    return services.crear_borrador(db, schemas.NuevoBorrador(empleado_id=admin.id, base_id=base_id))


def _publicar(db: Session, conjunto: ConjuntoParametros, admin) -> ConjuntoParametros:
    return services.publicar(db, conjunto.id, schemas.Publicacion(empleado_id=admin.id))


def test_importa_la_version_inicial_publicada_con_su_norma_y_vigencia(db_session, vigente):
    assert vigente.version == 1
    assert vigente.estado == EstadoConjunto.PUBLICADO
    assert vigente.fecha_vigencia == date(2025, 1, 1)
    assert "27.642" in vigente.norma_origen
    assert vigente.fecha_publicacion is not None


def test_la_version_inicial_trae_los_umbrales_de_la_norma(vigente):
    azucares = [c for c in vigente.criterios if c.sello == SelloAdvertencia.EXCESO_AZUCARES]
    assert {c.tipo_producto for c in azucares} == {TipoProducto.ALIMENTO, TipoProducto.BEBIDA}
    assert all(c.forma == FormaCriterio.PORCENTAJE_ENERGIA and c.limite == 10 and c.factor_energetico == 4 for c in azucares)
    calorias = {c.tipo_producto: c.limite for c in vigente.criterios if c.sello == SelloAdvertencia.EXCESO_CALORIAS}
    assert calorias == {TipoProducto.ALIMENTO: 275, TipoProducto.BEBIDA: 25}
    assert len(vigente.textos) == 7
    assert [t.sello for t in vigente.textos][0] == SelloAdvertencia.EXCESO_AZUCARES
    assert len(vigente.excepciones) == 10
    assert vigente.parametros_generales[0].clave == ClaveParametro.KCAL_BEBIDA_SIN_APORTE_ENERGETICO


def test_las_reglas_de_aplicabilidad_asocian_cada_agregado_con_sus_sellos(vigente):
    reglas = {}
    for regla in vigente.sellos_por_agregado:
        reglas.setdefault(regla.agregado, set()).add(regla.sello)
    assert reglas[Agregado.SODIO] == {SelloAdvertencia.EXCESO_SODIO}
    assert reglas[Agregado.EDULCORANTES] == {SelloAdvertencia.CONTIENE_EDULCORANTES}
    assert SelloAdvertencia.EXCESO_CALORIAS in reglas[Agregado.AZUCARES]


def test_sin_versiones_publicadas_no_hay_vigente(db_session):
    assert services.buscar_vigente(db_session) is None
    with pytest.raises(exceptions.SinParametrosVigentes):
        services.conjunto_vigente(db_session)


def test_crear_borrador_copia_la_vigente_con_version_siguiente(db_session, admin, vigente):
    borrador = _borrador(db_session, admin)
    assert borrador.version == 2
    assert borrador.estado == EstadoConjunto.BORRADOR
    assert borrador.creado_por_id == admin.id
    assert len(borrador.criterios) == len(vigente.criterios)
    assert {c.id for c in borrador.criterios}.isdisjoint({c.id for c in vigente.criterios})
    assert len(borrador.sellos_por_agregado) == len(vigente.sellos_por_agregado)
    assert [e.descripcion for e in borrador.excepciones] == [e.descripcion for e in vigente.excepciones]


def test_solo_puede_haber_un_borrador_a_la_vez(db_session, admin, vigente):
    _borrador(db_session, admin)
    with pytest.raises(exceptions.BorradorExistente):
        _borrador(db_session, admin)


def test_crear_borrador_sin_versiones_publicadas_falla(db_session, admin):
    with pytest.raises(exceptions.SinParametrosVigentes):
        _borrador(db_session, admin)


def test_crear_borrador_desde_una_base_inexistente_falla(db_session, admin, vigente):
    with pytest.raises(exceptions.ConjuntoNoEncontrado):
        _borrador(db_session, admin, base_id=999)


def test_modificar_borrador_cambia_umbrales_sin_tocar_la_version_publicada(db_session, admin, vigente):
    borrador = _borrador(db_session, admin)
    criterio = borrador.criterios[0]
    services.modificar_borrador(
        db_session,
        borrador.id,
        schemas.BorradorUpdate(
            norma_origen="Resolución hipotética 1/2027",
            fecha_vigencia=date(2027, 1, 1),
            notas="  Ajuste de prueba  ",
            criterios=[schemas.CriterioUpdate(id=criterio.id, limite=12, factor_energetico=4)],
            textos=[schemas.TextoUpdate(sello=SelloAdvertencia.EXCESO_SODIO, texto="EXCESO EN SODIO")],
            parametros_generales=[
                schemas.ParametroGeneralUpdate(clave=ClaveParametro.KCAL_BEBIDA_SIN_APORTE_ENERGETICO, valor=5)
            ],
        ),
    )
    db_session.refresh(borrador)
    db_session.refresh(vigente)
    assert borrador.criterios[0].limite == 12
    assert borrador.norma_origen == "Resolución hipotética 1/2027"
    assert borrador.notas == "Ajuste de prueba"
    assert borrador.parametros_generales[0].valor == 5
    assert vigente.criterios[0].limite == 10
    assert "27.642" in vigente.norma_origen


def test_modificar_reglas_y_excepciones_las_reemplaza(db_session, admin, vigente):
    borrador = _borrador(db_session, admin)
    services.modificar_borrador(
        db_session,
        borrador.id,
        schemas.BorradorUpdate(
            reglas=[
                schemas.ReglaAgregadoUpdate(
                    agregado=Agregado.SODIO,
                    sellos=[SelloAdvertencia.EXCESO_SODIO, SelloAdvertencia.EXCESO_SODIO],
                )
            ],
            excepciones=["Única excepción"],
        ),
    )
    db_session.refresh(borrador)
    assert [(r.agregado, r.sello) for r in borrador.sellos_por_agregado] == [
        (Agregado.SODIO, SelloAdvertencia.EXCESO_SODIO)
    ]
    assert [e.descripcion for e in borrador.excepciones] == ["Única excepción"]
    assert len(vigente.excepciones) == 10


@pytest.mark.parametrize(
    "cambio, error",
    [
        ({"norma_origen": "   "}, exceptions.DatoObligatorio),
        ({"criterios": [{"id": 99999, "limite": 1}]}, exceptions.ElementoInexistente),
        ({"textos": [{"sello": "exceso_sodio", "texto": "  "}]}, exceptions.TextoVacio),
        ({"excepciones": ["Válida", "  "]}, exceptions.TextoVacio),
    ],
)
def test_modificar_borrador_valida_los_datos(db_session, admin, vigente, cambio, error):
    borrador = _borrador(db_session, admin)
    with pytest.raises(error):
        services.modificar_borrador(db_session, borrador.id, schemas.BorradorUpdate(**cambio))


@pytest.mark.parametrize("limite, factor", [(0, 4), (-3, 4), (10, 0), (10, None)])
def test_modificar_borrador_rechaza_umbrales_o_factores_no_positivos(db_session, admin, vigente, limite, factor):
    borrador = _borrador(db_session, admin)
    criterio = next(c for c in borrador.criterios if c.factor_energetico is not None)
    with pytest.raises(exceptions.ValorInvalido):
        services.modificar_borrador(
            db_session,
            borrador.id,
            schemas.BorradorUpdate(criterios=[schemas.CriterioUpdate(id=criterio.id, limite=limite, factor_energetico=factor)]),
        )
    db_session.refresh(criterio)
    assert criterio.limite == 10


def test_un_conjunto_publicado_no_se_puede_modificar_ni_descartar(db_session, admin, vigente):
    with pytest.raises(exceptions.ConjuntoPublicado):
        services.modificar_borrador(db_session, vigente.id, schemas.BorradorUpdate(notas="x"))
    with pytest.raises(exceptions.ConjuntoPublicado):
        services.descartar_borrador(db_session, vigente.id)
    with pytest.raises(exceptions.ConjuntoPublicado):
        _publicar(db_session, vigente, admin)


def test_publicar_con_vigencia_futura_no_reemplaza_a_la_vigente_hasta_esa_fecha(db_session, admin, vigente):
    borrador = _borrador(db_session, admin)
    futura = date.today() + timedelta(days=30)
    services.modificar_borrador(db_session, borrador.id, schemas.BorradorUpdate(fecha_vigencia=futura))
    publicada = _publicar(db_session, borrador, admin)
    assert publicada.estado == EstadoConjunto.PUBLICADO
    assert publicada.publicado_por_id == admin.id
    assert services.conjunto_vigente(db_session).id == vigente.id
    assert services.conjunto_vigente(db_session, futura).id == publicada.id


def test_con_igual_fecha_de_vigencia_rige_la_version_mas_alta(db_session, admin, vigente):
    publicada = _publicar(db_session, _borrador(db_session, admin), admin)
    assert publicada.fecha_vigencia == vigente.fecha_vigencia
    assert services.conjunto_vigente(db_session).id == publicada.id


def test_un_borrador_nunca_es_vigente(db_session, admin, vigente):
    borrador = _borrador(db_session, admin)
    services.modificar_borrador(db_session, borrador.id, schemas.BorradorUpdate(fecha_vigencia=date(2025, 6, 1)))
    assert services.conjunto_vigente(db_session).id == vigente.id


def test_listar_marca_la_vigente_y_ordena_por_version(db_session, admin, vigente):
    _borrador(db_session, admin)
    listado = services.listar_conjuntos(db_session)
    assert [c.version for c in listado] == [2, 1]
    assert [c.vigente for c in listado] == [False, True]


def test_descartar_borrador_lo_elimina_y_permite_crear_otro(db_session, admin, vigente):
    borrador = _borrador(db_session, admin)
    services.descartar_borrador(db_session, borrador.id)
    with pytest.raises(exceptions.ConjuntoNoEncontrado):
        services.leer_conjunto(db_session, borrador.id)
    assert _borrador(db_session, admin).version == 2


def test_el_modulo_arranca_activo_y_se_puede_desactivar(db_session, admin):
    assert services.leer_modulo(db_session).activo is True
    services.verificar_modulo_activo(db_session)
    modulo = services.cambiar_modulo(db_session, schemas.CambioModulo(activo=False, empleado_id=admin.id))
    assert modulo.activo is False
    assert modulo.cambiado_por_id == admin.id
    assert modulo.fecha_cambio is not None
    with pytest.raises(exceptions.ModuloDesactivado):
        services.verificar_modulo_activo(db_session)


def test_la_version_inicial_trae_la_clase_de_aditivo_edulcorante(vigente):
    assert [(c.agregado, c.clase_funcional) for c in vigente.clases_aditivo] == [(Agregado.EDULCORANTES, "edulcorante")]


def test_el_borrador_copia_y_reemplaza_las_clases_de_aditivo(db_session, admin, vigente):
    borrador = _borrador(db_session, admin)
    assert [c.clase_funcional for c in borrador.clases_aditivo] == ["edulcorante"]
    services.modificar_borrador(
        db_session,
        borrador.id,
        schemas.BorradorUpdate(
            clases_aditivo=[
                schemas.ClasesAditivoUpdate(agregado=Agregado.EDULCORANTES, clases=["  Edulcorante ", "edulcorante"]),
                schemas.ClasesAditivoUpdate(agregado=Agregado.SODIO, clases=["Resaltador de sabor"]),
            ]
        ),
    )
    db_session.refresh(borrador)
    assert sorted((c.agregado.value, c.clase_funcional) for c in borrador.clases_aditivo) == [
        ("edulcorantes", "edulcorante"),
        ("sodio", "resaltador de sabor"),
    ]
    assert [c.clase_funcional for c in vigente.clases_aditivo] == ["edulcorante"]


def test_una_clase_de_aditivo_vacia_es_rechazada(db_session, admin, vigente):
    borrador = _borrador(db_session, admin)
    with pytest.raises(exceptions.TextoVacio):
        services.modificar_borrador(
            db_session,
            borrador.id,
            schemas.BorradorUpdate(clases_aditivo=[{"agregado": "edulcorantes", "clases": ["  "]}]),
        )
