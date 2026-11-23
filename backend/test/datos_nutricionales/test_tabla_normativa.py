from datetime import datetime

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.aditivos.models import Aditivo, ClaseFuncionalAditivo
from src.datos_nutricionales import services
from src.datos_nutricionales.constants import EstadoTablaNutricional, FuenteDatoNutricional, Nutriente
from src.datos_nutricionales.models import DatoNutricionalInsumo
from src.insumos.models import Insumo
from src.productos.constants import TipoProducto
from src.productos.models import Producto
from src.recetas import schemas as recetas_schemas
from src.recetas import services as recetas_services
from src.rotulado_frontal.models import MarcaInsumo
from src.unidades_medida.constants import MagnitudUnidad
from src.unidades_medida.models import UnidadMedida

N = Nutriente
COMPOSICION = {
    "Harina": {N.ENERGIA: 350, N.CARBOHIDRATOS: 73, N.AZUCARES_TOTALES: 1, N.AZUCARES_ANADIDOS: 0, N.PROTEINAS: 10,
               N.GRASAS_TOTALES: 1, N.GRASAS_SATURADAS: 0.2, N.GRASAS_TRANS: 0, N.FIBRA_ALIMENTARIA: 3, N.SODIO: 2},
    "Azúcar": {N.ENERGIA: 400, N.CARBOHIDRATOS: 100, N.AZUCARES_TOTALES: 100, N.AZUCARES_ANADIDOS: 100, N.PROTEINAS: 0,
               N.GRASAS_TOTALES: 0, N.GRASAS_SATURADAS: 0, N.GRASAS_TRANS: 0, N.FIBRA_ALIMENTARIA: 0, N.SODIO: 0},
    "Manteca": {N.ENERGIA: 740, N.CARBOHIDRATOS: 0, N.AZUCARES_TOTALES: 0, N.AZUCARES_ANADIDOS: 0, N.PROTEINAS: 0.9,
                N.GRASAS_TOTALES: 82, N.GRASAS_SATURADAS: 51, N.GRASAS_TRANS: 3, N.FIBRA_ALIMENTARIA: 0, N.SODIO: 10},
}


@pytest.fixture
def gramos(db_session: Session) -> UnidadMedida:
    unidad = db_session.scalar(select(UnidadMedida).where(UnidadMedida.nombre == "Gramos"))
    if unidad is None:
        unidad = UnidadMedida(nombre="Gramos", magnitud=MagnitudUnidad.MASA, factor_base=1.0)
        db_session.add(unidad)
        db_session.commit()
    return unidad


def _cargar_datos(db: Session, insumo: Insumo, valores: dict, admin) -> None:
    for nutriente, valor in valores.items():
        db.add(
            DatoNutricionalInsumo(
                insumo_id=insumo.id,
                nutriente=nutriente,
                valor=valor,
                valor_fuente=valor,
                fuente=FuenteDatoNutricional.VALOR_PROPIO,
                fecha_carga=datetime.now(),
                cargado_por_id=admin.id,
            )
        )
    db.commit()


@pytest.fixture
def receta(db_session: Session, gramos, admin):
    producto = Producto(nombre="Budín", tipo=TipoProducto.ALIMENTO, unidad_medida=gramos)
    insumos = {nombre: Insumo(nombre=nombre, unidad_medida=gramos, cantidad=10000) for nombre in COMPOSICION}
    insumos["Leudante"] = Insumo(nombre="Leudante", unidad_medida=gramos, cantidad=10000)
    db_session.add_all([producto, *insumos.values()])
    clase = ClaseFuncionalAditivo(nombre="leudante", necesita_ins=True)
    db_session.add(clase)
    db_session.flush()
    aditivo = Aditivo(nombre_completo="Bicarbonato de sodio", clase_funcional_id=clase.id, numero_ins="500ii")
    db_session.add(aditivo)
    db_session.commit()
    for nombre, valores in COMPOSICION.items():
        _cargar_datos(db_session, insumos[nombre], valores, admin)

    def renglon(nombre, gramos_insumo, aditivo_id=None):
        return {
            "insumo_id": insumos[nombre].id,
            "cantidad_original": gramos_insumo,
            "unidad_medida_id": gramos.id,
            "tipo_uso": "aditivo" if aditivo_id else "ingrediente",
            "aditivo_id": aditivo_id,
        }

    creada = recetas_services.crear_receta(
        db_session,
        recetas_schemas.RecetaCreate(
            producto_id=producto.id,
            version_inicial={
                "rendimiento_final_gramos": 800,
                "unidad_venta_gramos": 50,
                "medida_casera": "1 rebanada",
                "detalles": [
                    renglon("Harina", 500),
                    renglon("Azúcar", 200),
                    renglon("Manteca", 100),
                    renglon("Leudante", 5, aditivo.id),
                ],
            },
        ),
    )
    return {"receta": creada, "producto": producto, "insumos": insumos}


def _fila(tabla, nutriente):
    return next(f for f in tabla.filas if f.nutriente == nutriente)


def test_calcula_por_cien_gramos_y_por_porcion(db_session, receta):
    tabla = services.obtener_informacion_nutricional_producto(db_session, receta["producto"].id)
    assert tabla.estado == EstadoTablaNutricional.COMPLETA
    assert tabla.porcion == 50
    assert tabla.medida_casera == "1 rebanada"
    energia = _fila(tabla, N.ENERGIA)
    assert (energia.valor_100g, energia.valor_porcion, energia.porcentaje_vd) == (411, 206, 10)
    proteinas = _fila(tabla, N.PROTEINAS)
    assert (proteinas.valor_100g, proteinas.valor_porcion, proteinas.porcentaje_vd) == (6.4, 3.2, 4)


def test_aplica_el_umbral_de_no_significativo_y_los_decimales_configurados(db_session, receta):
    tabla = services.obtener_informacion_nutricional_producto(db_session, receta["producto"].id)
    sodio = _fila(tabla, N.SODIO)
    assert (sodio.valor_100g, sodio.valor_porcion, sodio.porcentaje_vd) == (0, 0, 0)
    trans = _fila(tabla, N.GRASAS_TRANS)
    assert (trans.valor_100g, trans.valor_porcion) == (0.4, 0.2)


def test_los_valores_diarios_por_defecto_son_los_del_caa(db_session):
    valores = {v.nutriente: v.valor_diario for v in services.obtener_valores_diarios_referencia(db_session)}
    assert valores[N.PROTEINAS] == 75
    assert valores[N.SODIO] == 2400
    assert valores[N.AZUCARES_ANADIDOS] is None


def test_la_tabla_incluye_azucares_totales_y_anadidos_y_la_leyenda(db_session, receta):
    tabla = services.obtener_informacion_nutricional_producto(db_session, receta["producto"].id)
    nutrientes = [f.nutriente for f in tabla.filas]
    assert N.AZUCARES_TOTALES in nutrientes and N.AZUCARES_ANADIDOS in nutrientes
    assert "profesional" in tabla.leyenda


def test_un_ingrediente_sin_datos_deja_la_tabla_incompleta(db_session, receta, admin, gramos):
    receta_nueva = recetas_services.crear_version_receta(
        db_session,
        receta["receta"].id,
        recetas_schemas.VersionRecetaCreate(
            rendimiento_final_gramos=800,
            unidad_venta_gramos=50,
            medida_casera="1 rebanada",
            detalles=[
                {"insumo_id": receta["insumos"]["Harina"].id, "cantidad_original": 500, "unidad_medida_id": gramos.id, "tipo_uso": "ingrediente"},
                {"insumo_id": _insumo_sin_datos(db_session, gramos).id, "cantidad_original": 100, "unidad_medida_id": gramos.id, "tipo_uso": "ingrediente"},
            ],
        ),
    )
    tabla = services.obtener_informacion_nutricional_producto(db_session, receta["producto"].id)
    assert tabla.estado == EstadoTablaNutricional.INCOMPLETA
    assert tabla.insumos_sin_datos == ["Nueces"]
    calculo = recetas_services.calcular_informacion_nutricional_receta(db_session, receta["receta"].id, receta_nueva.version)
    assert calculo.estado == EstadoTablaNutricional.INCOMPLETA
    assert [f.insumo_nombre for f in calculo.faltantes] == ["Nueces"]
    assert set(calculo.faltantes[0].datos_faltantes) == {n.value for n in Nutriente}


def _insumo_sin_datos(db: Session, gramos) -> Insumo:
    insumo = Insumo(nombre="Nueces", unidad_medida=gramos, cantidad=1000)
    db.add(insumo)
    db.commit()
    return insumo


def test_un_aditivo_sin_datos_solo_es_incompleto_si_aporta_energia_o_sodio(db_session, receta, admin):
    producto_id = receta["producto"].id
    assert services.obtener_informacion_nutricional_producto(db_session, producto_id).estado == EstadoTablaNutricional.COMPLETA

    db_session.add(MarcaInsumo(insumo_id=receta["insumos"]["Leudante"].id, agrega_sodio=True, fecha_cambio=datetime.now()))
    db_session.commit()
    tabla = services.obtener_informacion_nutricional_producto(db_session, producto_id)
    assert tabla.estado == EstadoTablaNutricional.INCOMPLETA
    assert tabla.insumos_sin_datos == ["Leudante"]

    _cargar_datos(db_session, receta["insumos"]["Leudante"], {N.SODIO: 27000}, admin)
    tabla = services.obtener_informacion_nutricional_producto(db_session, producto_id)
    assert tabla.estado == EstadoTablaNutricional.COMPLETA
    assert _fila(tabla, N.SODIO).valor_100g == 171


def test_el_calculo_de_la_receta_expresa_los_valores_con_la_configuracion(db_session, receta):
    calculo = recetas_services.calcular_informacion_nutricional_receta(db_session, receta["receta"].id)
    items = {i.nutriente: i for i in calculo.items}
    assert items["energia"].valor_100g_expresado == "411 kcal"
    assert items["sodio"].valor_100g_expresado == "0 mg"
    assert round(items["energia"].valor_100g_raw, 2) == 411.25
    assert calculo.estado == EstadoTablaNutricional.COMPLETA


def test_el_calculo_recalcula_al_cambiar_un_dato(db_session, receta, admin):
    dato = db_session.scalar(
        select(DatoNutricionalInsumo).where(
            DatoNutricionalInsumo.insumo_id == receta["insumos"]["Harina"].id,
            DatoNutricionalInsumo.nutriente == N.PROTEINAS,
        )
    )
    dato.valor = 12
    db_session.commit()
    tabla = services.obtener_informacion_nutricional_producto(db_session, receta["producto"].id)
    assert _fila(tabla, N.PROTEINAS).valor_100g == 7.6
