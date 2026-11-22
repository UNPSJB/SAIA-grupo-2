import pytest

from src.alergenos import exceptions, schemas, services
from src.alergenos.constants import Alergeno, EstadoDeclaracion, UnidadDuracion
from src.empleados.exceptions import EmpleadoNoEncontrado
from src.insumos.exceptions import InsumoNoEncontrado
from src.productos.constants import TipoProducto
from src.productos.models import Producto
from test.alergenos.conftest import crear_receta


def _marcar(db, empleado, *cambios):
    return services.actualizar_marcas(
        db,
        schemas.ActualizacionMarcas(
            empleado_id=empleado.id, marcas=[schemas.CambioMarcaInsumo(**cambio) for cambio in cambios]
        ),
    )


def _marcas_basicas(db, admin, insumos):
    _marcar(
        db,
        admin,
        {"insumo_id": insumos["Harina 000"].id, "alergenos": ["trigo"], "contiene_gluten": True},
        {"insumo_id": insumos["Manteca"].id, "alergenos": ["leche"]},
        {"insumo_id": insumos["Huevo Entero"].id, "alergenos": ["huevo"]},
        {"insumo_id": insumos["Azúcar"].id},
    )


def _declarar(db, producto, empleado, **datos):
    return services.guardar_declaracion(
        db, producto.id, schemas.DeclaracionUpdate(empleado_id=empleado.id, **datos)
    )


def test_los_insumos_arrancan_sin_revisar(db_session, insumos):
    marcas = services.listar_marcas(db_session)
    assert [m.insumo.nombre for m in marcas] == ["Azúcar", "Harina 000", "Huevo Entero", "Manteca", "Sal"]
    assert not any(m.revisado for m in marcas)


def test_las_marcas_se_guardan_ordenadas_y_sin_repetir(db_session, admin, insumos):
    marcas = _marcar(
        db_session,
        admin,
        {"insumo_id": insumos["Harina 000"].id, "alergenos": ["soja", "trigo", "soja"], "contiene_gluten": True},
    )
    harina = next(m for m in marcas if m.insumo.nombre == "Harina 000")
    assert harina.revisado and harina.contiene_gluten
    assert harina.alergenos == [Alergeno.TRIGO, Alergeno.SOJA]
    assert harina.cambiado_por.id == admin.id


def test_marcar_un_insumo_inexistente_falla(db_session, admin):
    with pytest.raises(InsumoNoEncontrado):
        _marcar(db_session, admin, {"insumo_id": 999})


def test_sin_receta_no_hay_propuesta(db_session, medialunas):
    propuesta = services.proponer(db_session, medialunas.id)
    assert propuesta.tiene_receta is False
    assert propuesta.contiene == []


def test_la_propuesta_une_las_marcas_de_los_insumos_de_la_receta(db_session, admin, insumos, medialunas):
    _marcas_basicas(db_session, admin, insumos)
    crear_receta(
        db_session,
        medialunas,
        [(insumos["Harina 000"], 500), (insumos["Manteca"], 200), (insumos["Azúcar"], 80), (insumos["Sal"], 10)],
    )
    propuesta = services.proponer(db_session, medialunas.id)
    assert propuesta.tiene_receta and propuesta.version_receta == 1
    assert [(p.alergeno, p.insumos) for p in propuesta.contiene] == [
        (Alergeno.TRIGO, ["Harina 000"]),
        (Alergeno.LECHE, ["Manteca"]),
    ]
    assert propuesta.contiene_gluten is True
    assert propuesta.insumos_con_gluten == ["Harina 000"]
    assert [i.nombre for i in propuesta.insumos_sin_revisar] == ["Sal"]


def test_sin_declaracion_el_detalle_muestra_la_sugerencia(db_session, admin, insumos, medialunas):
    _marcas_basicas(db_session, admin, insumos)
    crear_receta(db_session, medialunas, [(insumos["Harina 000"], 500), (insumos["Huevo Entero"], 100)])
    detalle = services.detalle_producto(db_session, medialunas.id)
    assert detalle.declaracion is None
    assert detalle.leyendas.contiene == "CONTIENE TRIGO Y HUEVO."
    assert detalle.leyendas.puede_contener is None


def test_guardar_sin_confirmar_queda_sugerida(db_session, admin, insumos, medialunas):
    _marcas_basicas(db_session, admin, insumos)
    crear_receta(db_session, medialunas, [(insumos["Harina 000"], 500)])
    detalle = _declarar(
        db_session, medialunas, admin, contiene=["trigo"], contiene_gluten=True, puede_contener=["frutas_secas", "mani"]
    )
    assert detalle.declaracion.estado == EstadoDeclaracion.SUGERIDA
    assert detalle.declaracion.confirmado_por is None
    assert detalle.declaracion.modificada_respecto_de_la_propuesta is False
    assert detalle.leyendas.puede_contener == "PUEDE CONTENER MANÍ Y FRUTAS SECAS."


def test_confirmar_registra_quien_y_cuando(db_session, admin, insumos, medialunas):
    _marcas_basicas(db_session, admin, insumos)
    crear_receta(db_session, medialunas, [(insumos["Harina 000"], 500), (insumos["Manteca"], 100)])
    detalle = _declarar(
        db_session, medialunas, admin, contiene=["trigo", "leche", "huevo"], contiene_gluten=True, confirmar=True
    )
    declaracion = detalle.declaracion
    assert declaracion.estado == EstadoDeclaracion.CONFIRMADA
    assert declaracion.confirmado_por.id == admin.id
    assert declaracion.fecha_confirmacion is not None
    assert declaracion.modificada_respecto_de_la_propuesta is True
    assert detalle.leyendas.contiene == "CONTIENE TRIGO, HUEVO Y LECHE."


def test_solo_un_administrador_puede_confirmar(db_session, operario, medialunas):
    with pytest.raises(exceptions.PermisoConfirmacion):
        _declarar(db_session, medialunas, operario, contiene=["leche"], confirmar=True)
    detalle = _declarar(db_session, medialunas, operario, contiene=["leche"])
    assert detalle.declaracion.estado == EstadoDeclaracion.SUGERIDA


def test_modificar_una_declaracion_confirmada_la_vuelve_sugerida(db_session, admin, medialunas):
    _declarar(db_session, medialunas, admin, contiene=["leche"], confirmar=True)
    detalle = _declarar(db_session, medialunas, admin, contiene=["leche", "soja"])
    assert detalle.declaracion.estado == EstadoDeclaracion.SUGERIDA
    assert detalle.declaracion.fecha_confirmacion is None


def test_avisa_si_la_propuesta_cambio_despues_de_declarar(db_session, admin, insumos, medialunas):
    _marcas_basicas(db_session, admin, insumos)
    crear_receta(db_session, medialunas, [(insumos["Harina 000"], 500), (insumos["Sal"], 10)])
    _declarar(db_session, medialunas, admin, contiene=["trigo"], contiene_gluten=True, confirmar=True)
    assert services.detalle_producto(db_session, medialunas.id).propuesta_cambio is False

    _marcar(db_session, admin, {"insumo_id": insumos["Sal"].id, "alergenos": ["sulfitos"]})
    detalle = services.detalle_producto(db_session, medialunas.id)
    assert detalle.propuesta_cambio is True
    assert detalle.declaracion.estado == EstadoDeclaracion.CONFIRMADA


def test_la_declaracion_no_necesita_receta(db_session, admin, medialunas):
    detalle = _declarar(db_session, medialunas, admin, contiene=["pescado"], confirmar=True)
    assert detalle.declaracion.version_receta is None
    assert detalle.leyendas.contiene == "CONTIENE PESCADO."


def test_empleado_inexistente(db_session, medialunas):
    with pytest.raises(EmpleadoNoEncontrado):
        services.guardar_declaracion(db_session, medialunas.id, schemas.DeclaracionUpdate(empleado_id=999))


def _conservar(db, producto, empleado, **datos):
    return services.guardar_conservacion(db, producto.id, schemas.ConservacionUpdate(empleado_id=empleado.id, **datos))


@pytest.mark.parametrize(
    "datos, leyenda",
    [
        (
            {"temperatura_minima": 0, "temperatura_maxima": 4, "duracion": 7},
            "Conservar entre 0 °C y 4 °C. Duración en estas condiciones: 7 días.",
        ),
        (
            {"temperatura_maxima": -18, "duracion": 1, "unidad_duracion": "meses"},
            "Conservar a no más de -18 °C. Duración en estas condiciones: 1 mes.",
        ),
        ({"duracion": 6, "unidad_duracion": "meses"}, "Duración: 6 meses."),
        (
            {"instrucciones": "Conservar en lugar fresco y seco."},
            "Conservar en lugar fresco y seco.",
        ),
        (
            {"temperatura_minima": 2.5, "instrucciones": "Una vez abierto, consumir dentro de las 48 horas"},
            "Conservar a no menos de 2,5 °C. Una vez abierto, consumir dentro de las 48 horas.",
        ),
    ],
)
def test_condiciones_de_conservacion_y_su_leyenda(db_session, admin, medialunas, datos, leyenda):
    detalle = _conservar(db_session, medialunas, admin, **datos)
    assert detalle.leyendas.conservacion == leyenda
    assert detalle.conservacion.modificado_por.id == admin.id


def test_conservacion_vacia_es_rechazada(db_session, admin, medialunas):
    with pytest.raises(exceptions.SinDatosConservacion):
        _conservar(db_session, medialunas, admin, instrucciones="   ")


def test_temperaturas_invertidas_son_rechazadas(db_session, admin, medialunas):
    with pytest.raises(exceptions.TemperaturasInvertidas):
        _conservar(db_session, medialunas, admin, temperatura_minima=8, temperatura_maxima=2)


def test_actualizar_la_conservacion_reemplaza_los_datos(db_session, admin, medialunas):
    _conservar(db_session, medialunas, admin, temperatura_minima=0, temperatura_maxima=4, duracion=7)
    detalle = _conservar(db_session, medialunas, admin, duracion=30)
    assert detalle.conservacion.temperatura_minima is None
    assert detalle.conservacion.unidad_duracion == UnidadDuracion.DIAS
    assert detalle.leyendas.conservacion == "Duración: 30 días."


def test_resumen_muestra_lo_declarado_o_lo_sugerido(db_session, admin, insumos, medialunas, gramos):
    pan = Producto(nombre="Pan", tipo=TipoProducto.ALIMENTO, unidad_medida=gramos)
    db_session.add(pan)
    db_session.commit()
    _marcas_basicas(db_session, admin, insumos)
    crear_receta(db_session, medialunas, [(insumos["Harina 000"], 500)])
    _declarar(db_session, pan, admin, contiene=["leche"], puede_contener=["soja"], confirmar=True)
    _conservar(db_session, pan, admin, duracion=3)

    resumen = {r.producto.nombre: r for r in services.resumen(db_session)}
    assert resumen["Medialunas"].guardada is False
    assert resumen["Medialunas"].estado == EstadoDeclaracion.SUGERIDA
    assert resumen["Medialunas"].contiene == [Alergeno.TRIGO]
    assert resumen["Medialunas"].contiene_gluten is True
    assert resumen["Pan"].estado == EstadoDeclaracion.CONFIRMADA
    assert resumen["Pan"].tiene_receta is False
    assert resumen["Pan"].puede_contener == [Alergeno.SOJA]
    assert resumen["Pan"].leyenda_conservacion == "Duración: 3 días."
