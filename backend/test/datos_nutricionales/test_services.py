from datetime import datetime

import pytest
from sqlalchemy.orm import Session

from src.alimentos_referencia.exceptions import AlimentoNoEncontrado
from src.datos_nutricionales import exceptions, services
from src.datos_nutricionales.constants import FuenteDatoNutricional as Fuente
from src.datos_nutricionales.constants import Nutriente
from src.datos_nutricionales.models import DatoNutricionalInsumo
from src.datos_nutricionales.schemas import CargaDatosNutricionales
from src.empleados.exceptions import EmpleadoNoEncontrado
from src.insumos.exceptions import InsumoNoEncontrado
from src.insumos.models import Insumo
from src.unidades_medida.constants import MagnitudUnidad
from src.unidades_medida.models import UnidadMedida


def _carga(empleado_id: int, *datos: dict) -> CargaDatosNutricionales:
    return CargaDatosNutricionales(empleado_id=empleado_id, datos=list(datos))


def _sara(nutriente: Nutriente, valor: float, codigo: str = "A010") -> dict:
    return {"nutriente": nutriente, "valor": valor, "fuente": Fuente.SARA, "alimento_codigo": codigo}


def _rotulo(nutriente: Nutriente, valor, referencia: str = "Rótulo Molino del Sur") -> dict:
    return {"nutriente": nutriente, "valor": valor, "fuente": Fuente.ROTULO_PROVEEDOR, "referencia": referencia}


def _dato(resultado, nutriente: Nutriente):
    return next(dato for dato in resultado.datos if dato.nutriente == nutriente)


def test_carga_desde_sara_registra_fuente_fecha_y_autor(db_session: Session, insumo, admin, harina_sara):
    antes = datetime.now()

    resultado = services.cargar_datos(
        db_session, insumo.id, _carga(admin.id, _sara(Nutriente.ENERGIA, 349.97), _sara(Nutriente.SODIO, 2.0))
    )

    energia = _dato(resultado, Nutriente.ENERGIA)
    assert energia.valor == 349.97
    assert energia.valor_fuente == 349.97
    assert energia.fuente == Fuente.SARA
    assert energia.alimento.codigo == "A010"
    assert energia.alimento.nombre == "Harina de Trigo"
    assert energia.cargado_por.id == admin.id
    assert energia.fecha_carga >= antes
    assert energia.modificado is False
    assert energia.modificado_por is None
    assert energia.unidad == "kcal"
    assert _dato(resultado, Nutriente.SODIO).unidad == "mg"


def test_carga_desde_sara_toma_el_valor_de_la_base_y_no_el_enviado(db_session: Session, insumo, admin, harina_sara):
    resultado = services.cargar_datos(db_session, insumo.id, _carga(admin.id, _sara(Nutriente.SODIO, 400)))

    sodio = _dato(resultado, Nutriente.SODIO)
    assert sodio.valor == 400
    assert sodio.valor_fuente == 2.0
    assert sodio.modificado is True
    assert sodio.modificado_por.id == admin.id


def test_modificar_un_valor_de_sara_queda_marcado_y_registra_quien(
    db_session: Session, insumo, admin, otro_admin, harina_sara
):
    services.cargar_datos(db_session, insumo.id, _carga(admin.id, _sara(Nutriente.SODIO, 2.0)))

    resultado = services.cargar_datos(db_session, insumo.id, _carga(otro_admin.id, _sara(Nutriente.SODIO, 3.5)))

    sodio = _dato(resultado, Nutriente.SODIO)
    assert sodio.valor == 3.5
    assert sodio.valor_fuente == 2.0
    assert sodio.modificado is True
    assert sodio.modificado_por.id == otro_admin.id
    assert sodio.cargado_por.id == admin.id
    assert sodio.fecha_modificacion is not None


def test_volver_al_valor_de_la_fuente_quita_la_marca(db_session: Session, insumo, admin, harina_sara):
    services.cargar_datos(db_session, insumo.id, _carga(admin.id, _sara(Nutriente.SODIO, 2.0)))
    services.cargar_datos(db_session, insumo.id, _carga(admin.id, _sara(Nutriente.SODIO, 9)))

    resultado = services.cargar_datos(db_session, insumo.id, _carga(admin.id, _sara(Nutriente.SODIO, 2.0)))

    sodio = _dato(resultado, Nutriente.SODIO)
    assert sodio.modificado is False
    assert sodio.modificado_por is None
    assert sodio.fecha_modificacion is None


def test_sara_sin_alimento_de_referencia(db_session: Session, insumo, admin):
    with pytest.raises(exceptions.ReferenciaObligatoria):
        services.cargar_datos(
            db_session,
            insumo.id,
            _carga(admin.id, {"nutriente": Nutriente.SODIO, "valor": 2.0, "fuente": Fuente.SARA}),
        )


def test_sara_con_alimento_inexistente(db_session: Session, insumo, admin):
    with pytest.raises(AlimentoNoEncontrado):
        services.cargar_datos(db_session, insumo.id, _carga(admin.id, _sara(Nutriente.SODIO, 2.0, "Z999")))


def test_sara_no_informa_azucares(db_session: Session, insumo, admin, harina_sara):
    with pytest.raises(exceptions.DatoNoInformado):
        services.cargar_datos(db_session, insumo.id, _carga(admin.id, _sara(Nutriente.AZUCARES_TOTALES, 0.3)))


def test_carga_manual_desde_rotulo(db_session: Session, insumo, admin):
    resultado = services.cargar_datos(
        db_session, insumo.id, _carga(admin.id, _rotulo(Nutriente.AZUCARES_TOTALES, 0.3))
    )

    azucares = _dato(resultado, Nutriente.AZUCARES_TOTALES)
    assert azucares.fuente == Fuente.ROTULO_PROVEEDOR
    assert azucares.referencia == "Rótulo Molino del Sur"
    assert azucares.alimento is None
    assert azucares.valor_fuente == 0.3
    assert azucares.modificado is False


def test_editar_un_valor_cargado_desde_rotulo_queda_marcado(db_session: Session, insumo, admin, otro_admin):
    services.cargar_datos(db_session, insumo.id, _carga(admin.id, _rotulo(Nutriente.PROTEINAS, 10)))

    resultado = services.cargar_datos(db_session, insumo.id, _carga(otro_admin.id, _rotulo(Nutriente.PROTEINAS, 11)))

    proteinas = _dato(resultado, Nutriente.PROTEINAS)
    assert proteinas.valor_fuente == 10
    assert proteinas.modificado is True
    assert proteinas.modificado_por.id == otro_admin.id


def test_cambiar_de_fuente_es_una_carga_nueva(db_session: Session, insumo, admin, otro_admin, harina_sara):
    services.cargar_datos(db_session, insumo.id, _carga(admin.id, _sara(Nutriente.SODIO, 9)))

    resultado = services.cargar_datos(db_session, insumo.id, _carga(otro_admin.id, _rotulo(Nutriente.SODIO, 3)))

    sodio = _dato(resultado, Nutriente.SODIO)
    assert sodio.fuente == Fuente.ROTULO_PROVEEDOR
    assert sodio.alimento is None
    assert sodio.valor_fuente == 3
    assert sodio.modificado is False
    assert sodio.modificado_por is None
    assert sodio.cargado_por.id == otro_admin.id


def test_cambiar_la_referencia_del_rotulo_es_una_carga_nueva(db_session: Session, insumo, admin):
    services.cargar_datos(db_session, insumo.id, _carga(admin.id, _rotulo(Nutriente.PROTEINAS, 10, "Marca A")))

    resultado = services.cargar_datos(
        db_session, insumo.id, _carga(admin.id, _rotulo(Nutriente.PROTEINAS, 12, "Marca B"))
    )

    proteinas = _dato(resultado, Nutriente.PROTEINAS)
    assert (proteinas.referencia, proteinas.valor_fuente, proteinas.modificado) == ("Marca B", 12, False)


def test_reenviar_el_mismo_dato_no_cambia_la_fecha(db_session: Session, insumo, admin, otro_admin):
    primera = services.cargar_datos(db_session, insumo.id, _carga(admin.id, _rotulo(Nutriente.PROTEINAS, 10)))

    segunda = services.cargar_datos(db_session, insumo.id, _carga(otro_admin.id, _rotulo(Nutriente.PROTEINAS, 10)))

    assert _dato(segunda, Nutriente.PROTEINAS).fecha_carga == _dato(primera, Nutriente.PROTEINAS).fecha_carga
    assert _dato(segunda, Nutriente.PROTEINAS).cargado_por.id == admin.id


def test_los_nutrientes_no_enviados_se_conservan(db_session: Session, insumo, admin):
    services.cargar_datos(db_session, insumo.id, _carga(admin.id, _rotulo(Nutriente.PROTEINAS, 10)))

    resultado = services.cargar_datos(db_session, insumo.id, _carga(admin.id, _rotulo(Nutriente.SODIO, 2)))

    assert [dato.nutriente for dato in resultado.datos] == [Nutriente.PROTEINAS, Nutriente.SODIO]


def test_valor_nulo_borra_el_dato(db_session: Session, insumo, admin):
    services.cargar_datos(db_session, insumo.id, _carga(admin.id, _rotulo(Nutriente.PROTEINAS, 10)))

    resultado = services.cargar_datos(db_session, insumo.id, _carga(admin.id, _rotulo(Nutriente.PROTEINAS, None)))

    assert resultado.datos == []


def test_los_datos_se_devuelven_en_el_orden_de_la_tabla(db_session: Session, insumo, admin):
    resultado = services.cargar_datos(
        db_session,
        insumo.id,
        _carga(
            admin.id,
            _rotulo(Nutriente.SODIO, 2),
            _rotulo(Nutriente.ENERGIA, 340),
            _rotulo(Nutriente.GRASAS_TOTALES, 1),
        ),
    )

    assert [d.nutriente for d in resultado.datos] == [Nutriente.ENERGIA, Nutriente.GRASAS_TOTALES, Nutriente.SODIO]


def test_valor_negativo(db_session: Session, insumo, admin):
    with pytest.raises(exceptions.ValorNegativo):
        services.cargar_datos(db_session, insumo.id, _carga(admin.id, _rotulo(Nutriente.SODIO, -1)))


def test_nutriente_repetido(db_session: Session, insumo, admin):
    with pytest.raises(exceptions.NutrienteRepetido):
        services.cargar_datos(
            db_session, insumo.id, _carga(admin.id, _rotulo(Nutriente.SODIO, 1), _rotulo(Nutriente.SODIO, 2))
        )


def test_insumo_inexistente(db_session: Session, admin):
    with pytest.raises(InsumoNoEncontrado):
        services.cargar_datos(db_session, 999, _carga(admin.id, _rotulo(Nutriente.SODIO, 1)))


def test_empleado_inexistente(db_session: Session, insumo):
    with pytest.raises(EmpleadoNoEncontrado):
        services.cargar_datos(db_session, insumo.id, _carga(999, _rotulo(Nutriente.SODIO, 1)))


def test_combinar_fuentes_admite_azucares_por_encima_de_los_carbohidratos(db_session: Session, insumo, admin):
    resultado = services.cargar_datos(
        db_session,
        insumo.id,
        _carga(admin.id, _rotulo(Nutriente.CARBOHIDRATOS, 4.6), _rotulo(Nutriente.AZUCARES_TOTALES, 4.8)),
    )

    assert [d.valor for d in resultado.datos] == [4.6, 4.8]


def test_un_error_no_guarda_nada_de_la_operacion(db_session: Session, insumo, admin):
    with pytest.raises(exceptions.ValorNegativo):
        services.cargar_datos(
            db_session,
            insumo.id,
            _carga(
                admin.id,
                _rotulo(Nutriente.PROTEINAS, 10),
                _rotulo(Nutriente.AZUCARES_TOTALES, 1),
                _rotulo(Nutriente.AZUCARES_ANADIDOS, -2),
            ),
        )

    assert db_session.query(DatoNutricionalInsumo).count() == 0


def test_resumen_por_insumo(db_session: Session, insumo, admin, harina_sara):
    insumo_sin_datos = Insumo(nombre="Azucar", unidad_medida_id=insumo.unidad_medida_id)
    insumo_inactivo = Insumo(nombre="Viejo", unidad_medida_id=insumo.unidad_medida_id, activo=False)
    db_session.add_all([insumo_sin_datos, insumo_inactivo])
    db_session.commit()
    services.cargar_datos(
        db_session,
        insumo.id,
        _carga(admin.id, _sara(Nutriente.SODIO, 5), _sara(Nutriente.ENERGIA, 349.97), _rotulo(Nutriente.GRASAS_TRANS, 0)),
    )

    resumen = {item.insumo.nombre: item for item in services.resumen_por_insumo(db_session)}

    assert list(resumen) == ["Azucar", "Harina 000"]
    harina = resumen["Harina 000"]
    assert (harina.cargados, harina.total, harina.modificados) == (3, 10, 1)
    assert harina.fuentes == [Fuente.SARA, Fuente.ROTULO_PROVEEDOR]
    assert harina.ultima_actualizacion is not None
    assert (resumen["Azucar"].cargados, resumen["Azucar"].ultima_actualizacion) == (0, None)


def test_al_eliminar_el_insumo_se_borran_sus_datos(db_session: Session, insumo, admin):
    from src.insumos import services as insumos_services

    services.cargar_datos(db_session, insumo.id, _carga(admin.id, _rotulo(Nutriente.SODIO, 2)))
    insumo.activo = False
    db_session.commit()

    insumos_services.eliminar_insumo(db_session, insumo.id)

    assert db_session.query(DatoNutricionalInsumo).count() == 0


def test_insumo_liquido_informa_magnitud_volumen(db_session: Session, insumo):
    leche = Insumo(
        nombre="Leche entera",
        unidad_medida=UnidadMedida(nombre="Litros", magnitud=MagnitudUnidad.VOLUMEN, factor_base=1000.0),
    )
    db_session.add(leche)
    db_session.commit()

    assert services.obtener_datos_insumo(db_session, leche.id).insumo.magnitud == MagnitudUnidad.VOLUMEN
    assert services.obtener_datos_insumo(db_session, insumo.id).insumo.magnitud == MagnitudUnidad.MASA
    magnitudes = {r.insumo.nombre: r.insumo.magnitud for r in services.resumen_por_insumo(db_session)}
    assert magnitudes == {"Harina 000": MagnitudUnidad.MASA, "Leche entera": MagnitudUnidad.VOLUMEN}


def test_carga_desde_sara_de_un_nutriente_del_complemento(db_session: Session, insumo, admin, harina_sara):
    harina_sara.azucares_totales = 0.3
    harina_sara.nombre_en_pdf = "Harina de trigo, cruda"
    db_session.commit()

    resultado = services.cargar_datos(db_session, insumo.id, _carga(admin.id, _sara(Nutriente.AZUCARES_TOTALES, 0.3)))

    azucares = _dato(resultado, Nutriente.AZUCARES_TOTALES)
    assert (azucares.valor_fuente, azucares.modificado) == (0.3, False)
    assert azucares.alimento.nombre_en_pdf == "Harina de trigo, cruda"
