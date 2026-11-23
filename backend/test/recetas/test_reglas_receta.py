from typing import Optional

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.aditivos.models import Aditivo, ClaseFuncionalAditivo
from src.empleados.models import Empleado, RolEmpleado
from src.insumos.models import Insumo
from src.productos.constants import TipoProducto
from src.productos.exceptions import ProductoNoEncontrado
from src.productos.models import Producto
from src.recetas import exceptions, schemas, services
from src.recetas.constants import EstadoVersionReceta, FormatoDeclaracionAditivos
from src.unidades_medida.constants import MagnitudUnidad
from src.unidades_medida.models import UnidadMedida


def _unidad(db: Session, nombre: str, magnitud: MagnitudUnidad, factor: float) -> UnidadMedida:
    unidad = db.scalar(select(UnidadMedida).where(UnidadMedida.nombre == nombre))
    if unidad is None:
        unidad = UnidadMedida(nombre=nombre, magnitud=magnitud, factor_base=factor)
        db.add(unidad)
        db.commit()
    return unidad


@pytest.fixture
def u(db_session: Session) -> dict:
    return {
        "g": _unidad(db_session, "Gramos", MagnitudUnidad.MASA, 1.0),
        "kg": _unidad(db_session, "Kilogramos", MagnitudUnidad.MASA, 1000.0),
        "ml": _unidad(db_session, "Mililitros", MagnitudUnidad.VOLUMEN, 1.0),
        "l": _unidad(db_session, "Litros", MagnitudUnidad.VOLUMEN, 1000.0),
        "u": _unidad(db_session, "Unidades", MagnitudUnidad.CANTIDAD, 1.0),
    }


def _insumo(db: Session, nombre: str, unidad: UnidadMedida, **extra) -> Insumo:
    insumo = Insumo(nombre=nombre, unidad_medida=unidad, cantidad=100000.0, **extra)
    db.add(insumo)
    db.commit()
    return insumo


@pytest.fixture
def insumos(db_session: Session, u) -> dict:
    return {
        "harina": _insumo(db_session, "Harina 000", u["kg"], denominacion_rotulo="harina de trigo"),
        "azucar": _insumo(db_session, "Azúcar", u["kg"]),
        "manteca": _insumo(db_session, "Manteca", u["kg"]),
        "sal": _insumo(db_session, "Sal", u["kg"]),
        "leche": _insumo(db_session, "Leche", u["l"], densidad_g_ml=1.03),
        "agua": _insumo(db_session, "Agua", u["l"]),
        "huevo": _insumo(db_session, "Huevo", u["u"], peso_por_unidad_gramos=50.0),
        "sorbato": _insumo(db_session, "Sorbato", u["kg"]),
        "vainilla": _insumo(db_session, "Esencia de vainilla", u["kg"]),
    }


@pytest.fixture
def aditivos(db_session: Session) -> dict:
    conservante = ClaseFuncionalAditivo(nombre="conservante", necesita_ins=True)
    aromatizante = ClaseFuncionalAditivo(nombre="aromatizante", necesita_ins=False)
    db_session.add_all([conservante, aromatizante])
    db_session.flush()
    sorbato = Aditivo(nombre_completo="Sorbato de potasio", clase_funcional_id=conservante.id, numero_ins="202")
    vainilla = Aditivo(nombre_completo="Aroma de vainilla", clase_funcional_id=aromatizante.id)
    db_session.add_all([sorbato, vainilla])
    db_session.commit()
    return {"sorbato": sorbato, "vainilla": vainilla}


@pytest.fixture
def producto(db_session: Session, u) -> Producto:
    return _producto(db_session, "Budín", u["u"])


def _producto(db: Session, nombre: str, unidad: UnidadMedida) -> Producto:
    nuevo = Producto(nombre=nombre, tipo=TipoProducto.ALIMENTO, unidad_medida=unidad)
    db.add(nuevo)
    db.commit()
    return nuevo


def _renglon(insumo: Insumo, cantidad: float, unidad: UnidadMedida, aditivo: Optional[Aditivo] = None) -> dict:
    return {
        "insumo_id": insumo.id,
        "cantidad_original": cantidad,
        "unidad_medida_id": unidad.id,
        "tipo_uso": "aditivo" if aditivo else "ingrediente",
        "aditivo_id": aditivo.id if aditivo else None,
    }


def _crear(db: Session, producto: Producto, renglones: list, rendimiento: float = 1000):
    return services.crear_receta(
        db,
        schemas.RecetaCreate(
            producto_id=producto.id,
            version_inicial={"rendimiento_final_gramos": rendimiento, "unidad_venta_gramos": 50, "detalles": renglones},
        ),
    )


def _nueva_version(db: Session, receta_id: int, renglones: list):
    return services.crear_version_receta(
        db,
        receta_id,
        schemas.VersionRecetaCreate(rendimiento_final_gramos=1000, unidad_venta_gramos=50, detalles=renglones),
    )


def _receta_base(db: Session, producto: Producto, insumos: dict, u: dict, aditivos: dict):
    return _crear(
        db,
        producto,
        [
            _renglon(insumos["azucar"], 200, u["g"]),
            _renglon(insumos["harina"], 500, u["g"]),
            _renglon(insumos["manteca"], 200, u["g"]),
            _renglon(insumos["sal"], 10, u["g"]),
            _renglon(insumos["sorbato"], 1, u["g"], aditivos["sorbato"]),
            _renglon(insumos["vainilla"], 2, u["g"], aditivos["vainilla"]),
        ],
    )


def test_convierte_cada_renglon_a_gramos_con_las_equivalencias_del_insumo(db_session, producto, insumos, u):
    receta = _crear(
        db_session,
        producto,
        [
            _renglon(insumos["harina"], 0.5, u["kg"]),
            _renglon(insumos["leche"], 200, u["ml"]),
            _renglon(insumos["huevo"], 3, u["u"]),
        ],
    )
    detalles = services.obtener_version_vigente(db_session, receta.id).detalles
    assert [round(d.cantidad_gramos, 2) for d in detalles] == [500, 206, 150]


def test_sin_equivalencia_avisa_en_lugar_de_asumir(db_session, producto, insumos, u):
    with pytest.raises(exceptions.DensidadRequerida):
        _crear(db_session, producto, [_renglon(insumos["agua"], 100, u["ml"])])


def test_unidad_de_otra_magnitud_es_rechazada(db_session, producto, insumos, u):
    with pytest.raises(exceptions.UnidadInsumoIncompatible):
        _crear(db_session, producto, [_renglon(insumos["harina"], 100, u["ml"])])


def test_no_se_guarda_una_receta_sin_ingredientes(db_session, producto, insumos, u, aditivos):
    with pytest.raises(exceptions.RecetaSinIngredientes):
        _crear(db_session, producto, [_renglon(insumos["sorbato"], 1, u["g"], aditivos["sorbato"])])


def test_un_aditivo_necesita_su_referencia(db_session, producto, insumos, u):
    renglon = _renglon(insumos["sorbato"], 1, u["g"]) | {"tipo_uso": "aditivo"}
    with pytest.raises(exceptions.AditivoRequerido):
        _crear(db_session, producto, [_renglon(insumos["harina"], 100, u["g"]), renglon])


def test_sin_rendimiento_no_se_guarda(db_session, producto, insumos, u):
    with pytest.raises(exceptions.RendimientoFinalInvalido):
        _crear(db_session, producto, [_renglon(insumos["harina"], 100, u["g"])], rendimiento=0)


def test_un_producto_tiene_una_sola_receta(db_session, producto, insumos, u):
    _crear(db_session, producto, [_renglon(insumos["harina"], 100, u["g"])])
    with pytest.raises(exceptions.RecetaExistente):
        _crear(db_session, producto, [_renglon(insumos["harina"], 200, u["g"])])


def test_producto_inexistente(db_session, insumos, u):
    with pytest.raises(ProductoNoEncontrado):
        services.crear_receta(
            db_session,
            schemas.RecetaCreate(
                producto_id=999,
                version_inicial={
                    "rendimiento_final_gramos": 100,
                    "unidad_venta_gramos": 10,
                    "detalles": [_renglon(insumos["harina"], 100, u["g"])],
                },
            ),
        )


def test_cada_cambio_crea_una_version_y_archiva_la_anterior(db_session, producto, insumos, u):
    receta = _crear(db_session, producto, [_renglon(insumos["harina"], 100, u["g"])])
    nueva = _nueva_version(db_session, receta.id, [_renglon(insumos["harina"], 150, u["g"])])
    versiones = services.listar_versiones_de_receta(db_session, receta.id)
    assert nueva.version == 2
    assert [(v.version, v.estado) for v in versiones] == [
        (2, EstadoVersionReceta.ACTIVO),
        (1, EstadoVersionReceta.ARCHIVADO),
    ]
    assert services.obtener_version_vigente(db_session, receta.id).version == 2


def test_composicion_separa_ingredientes_y_aditivos_y_suma_cien(db_session, producto, insumos, u, aditivos):
    receta = _receta_base(db_session, producto, insumos, u, aditivos)
    composicion = services.calcular_composicion_receta(db_session, receta.id)
    assert [i.nombre_insumo for i in composicion.ingredientes] == ["Azúcar", "Harina 000", "Manteca", "Sal"]
    assert [a.nombre_insumo for a in composicion.aditivos] == ["Sorbato", "Esencia de vainilla"]
    assert composicion.total_gramos == 913
    assert composicion.suma_correcta is True
    assert round(composicion.ingredientes[1].porcentaje, 2) == round(500 / 913 * 100, 2)


def test_lista_de_ingredientes_ordenada_con_aditivos_por_funcion(db_session, producto, insumos, u, aditivos):
    receta = _receta_base(db_session, producto, insumos, u, aditivos)
    lista = services.obtener_lista_ingredientes_rotulo(db_session, receta.id)
    assert [i.denominacion_rotulo for i in lista.ingredientes] == ["harina de trigo", "Azúcar", "Manteca", "Sal"]
    assert [g.texto_grupo for g in lista.grupos_aditivos] == ["conservante: Sorbato de potasio (INS 202)", "aromatizante"]
    assert lista.texto_rotulo == (
        "Ingredientes: harina de trigo, Azúcar, Manteca, Sal, conservante: Sorbato de potasio (INS 202), aromatizante."
    )
    assert lista.es_orden_manual is False


@pytest.mark.parametrize(
    "formato, texto",
    [
        (FormatoDeclaracionAditivos.FUNCION_NOMBRE, "conservante: Sorbato de potasio"),
        (FormatoDeclaracionAditivos.FUNCION_INS, "conservante: INS 202"),
    ],
)
def test_formato_de_declaracion_de_aditivos(db_session, producto, insumos, u, aditivos, formato, texto):
    receta = _receta_base(db_session, producto, insumos, u, aditivos)
    services.actualizar_configuracion_produccion(
        db_session, schemas.ConfiguracionProduccionUpdate(formato_declaracion_aditivos=formato)
    )
    assert services.obtener_lista_ingredientes_rotulo(db_session, receta.id).grupos_aditivos[0].texto_grupo == texto


def _admin(db: Session) -> Empleado:
    empleado = Empleado(legajo="EMP-9401", dni="34000001", nombre="Ana", apellido="Prueba", activo=True, rol=RolEmpleado.ADMIN)
    db.add(empleado)
    db.commit()
    return empleado


def test_ajuste_manual_solo_entre_porcentajes_iguales(db_session, producto, insumos, u, aditivos):
    receta = _receta_base(db_session, producto, insumos, u, aditivos)
    admin = _admin(db_session)
    ids = {nombre: insumos[nombre].id for nombre in ("harina", "azucar", "manteca", "sal")}

    ajustada = services.guardar_orden_manual_ingredientes(
        db_session,
        receta.id,
        1,
        schemas.AjusteOrdenIngredientesPayload(
            orden_insumo_ids=[ids["harina"], ids["manteca"], ids["azucar"], ids["sal"]], empleado_id=admin.id
        ),
    )
    assert [i.nombre_insumo for i in ajustada.ingredientes] == ["Harina 000", "Manteca", "Azúcar", "Sal"]
    assert ajustada.es_orden_manual is True
    assert ajustada.orden_manual_por.id == admin.id

    with pytest.raises(exceptions.OrdenManualFueraDeEmpate):
        services.guardar_orden_manual_ingredientes(
            db_session,
            receta.id,
            1,
            schemas.AjusteOrdenIngredientesPayload(orden_insumo_ids=[ids["sal"], ids["harina"], ids["manteca"], ids["azucar"]]),
        )
    with pytest.raises(exceptions.OrdenManualInvalido):
        services.guardar_orden_manual_ingredientes(
            db_session, receta.id, 1, schemas.AjusteOrdenIngredientesPayload(orden_insumo_ids=[ids["harina"]])
        )

    restablecida = services.restablecer_orden_automatico_ingredientes(db_session, receta.id, 1)
    assert restablecida.es_orden_manual is False
    assert [i.nombre_insumo for i in restablecida.ingredientes] == ["Harina 000", "Azúcar", "Manteca", "Sal"]


def test_la_nueva_version_conserva_el_orden_manual_si_no_cambian_los_porcentajes(db_session, producto, insumos, u, aditivos):
    receta = _receta_base(db_session, producto, insumos, u, aditivos)
    ids = [insumos[n].id for n in ("harina", "manteca", "azucar", "sal")]
    services.guardar_orden_manual_ingredientes(
        db_session, receta.id, 1, schemas.AjusteOrdenIngredientesPayload(orden_insumo_ids=ids)
    )
    renglones = [
        _renglon(insumos["azucar"], 200, u["g"]),
        _renglon(insumos["harina"], 500, u["g"]),
        _renglon(insumos["manteca"], 200, u["g"]),
        _renglon(insumos["sal"], 10, u["g"]),
        _renglon(insumos["sorbato"], 1, u["g"], aditivos["sorbato"]),
        _renglon(insumos["vainilla"], 2, u["g"], aditivos["vainilla"]),
    ]
    segunda = _nueva_version(db_session, receta.id, renglones)
    assert segunda.orden_ingredientes_manual == ids
    assert segunda.aviso_orden_anterior is None

    renglones[2] = _renglon(insumos["manteca"], 250, u["g"])
    tercera = _nueva_version(db_session, receta.id, renglones)
    assert tercera.orden_ingredientes_manual is None
    assert tercera.aviso_orden_anterior is not None


def test_las_versiones_anteriores_son_de_solo_lectura(db_session, producto, insumos, u):
    receta = _crear(db_session, producto, [_renglon(insumos["harina"], 100, u["g"]), _renglon(insumos["sal"], 100, u["g"])])
    _nueva_version(db_session, receta.id, [_renglon(insumos["harina"], 150, u["g"])])
    with pytest.raises(exceptions.VersionSoloLectura):
        services.restablecer_orden_automatico_ingredientes(db_session, receta.id, 1)


def test_crear_y_versionar_requieren_administrador(client, db_session, producto, insumos, u):
    datos = {
        "producto_id": producto.id,
        "version_inicial": {
            "rendimiento_final_gramos": 100,
            "unidad_venta_gramos": 10,
            "detalles": [_renglon(insumos["harina"], 100, u["g"])],
        },
    }
    assert client.post("/recetas/", json=datos, headers={"X-User-Role": "operario"}).status_code == 403
    creada = client.post("/recetas/", json=datos, headers={"X-User-Role": "admin"})
    assert creada.status_code in (200, 201)
    receta_id = creada.json()["id"]
    assert client.get(f"/recetas/{receta_id}/versiones/vigente").status_code == 200
    repetida = client.post("/recetas/", json=datos, headers={"X-User-Role": "admin"})
    assert repetida.status_code == 400
