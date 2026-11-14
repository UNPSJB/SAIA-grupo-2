from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from src.alimentos_referencia import exceptions, services
from src.alimentos_referencia.models import AlimentoReferencia
from src.datos_nutricionales.constants import Nutriente
from src.unidades_medida.constants import MagnitudUnidad

CSV_REAL = Path(__file__).resolve().parents[2] / "data" / "alimentos_sara.csv"
COMPLEMENTO_REAL = Path(__file__).resolve().parents[2] / "data" / "alimentos_sara2_complemento.csv"

ENCABEZADO = (
    "Codigo,Alimento,UnidadMedida,Decimales,FactorCorreccion,Id,Agua,E,Prot,Lip,HCtotal,HCdisp,"
    "Fibra,Cen,Na,AGSat\n"
)


def _csv(tmp_path: Path, filas: list) -> Path:
    ruta = tmp_path / "alimentos.csv"
    ruta.write_text(ENCABEZADO + "".join(filas), encoding="utf-8")
    return ruta


FILA_HARINA = (
    '"A010","Harina de  Trigo","gramos","sin",1.0e+00,1,1.2e+01,3.4997000000000003e+02,'
    "1.0300000000000001e+01,1.0,7.6300000000000001e+01,7.3e+01,3.3e+00,4.8e-01,2.0e+00,1.6e-01\n"
)
FILA_LECHE = '"L006","Leche de vaca entera fluida","mililitros","sin",1,2,88,61.8,3.2,3.3,4.8,4.8,0,0.7,40,1.9\n'
FILA_SUPLEMENTO = '"S001","Hierro (elemental)","miligramos","con",1,3,0,0,0,0,0,0,0,100,0,0\n'


def test_importar_mapea_columnas_y_redondea(db_session: Session, tmp_path: Path):
    cantidad = services.importar_desde_csv(db_session, _csv(tmp_path, [FILA_HARINA]))

    harina = db_session.get(AlimentoReferencia, "A010")
    assert cantidad == 1
    assert harina.nombre == "Harina de Trigo"
    assert harina.magnitud == MagnitudUnidad.MASA
    assert harina.energia == 349.97
    assert harina.proteinas == 10.3
    assert harina.grasas_totales == 1.0
    assert harina.carbohidratos == 73.0
    assert harina.fibra_alimentaria == 3.3
    assert harina.sodio == 2.0
    assert harina.grasas_saturadas == 0.16


def test_importar_deja_nulos_los_nutrientes_que_el_csv_no_informa(db_session: Session, tmp_path: Path):
    services.importar_desde_csv(db_session, _csv(tmp_path, [FILA_HARINA]))

    harina = db_session.get(AlimentoReferencia, "A010")
    assert harina.azucares_totales is None
    assert harina.azucares_anadidos is None
    assert harina.grasas_trans is None


def test_importar_excluye_suplementos_y_marca_mililitros(db_session: Session, tmp_path: Path):
    cantidad = services.importar_desde_csv(db_session, _csv(tmp_path, [FILA_LECHE, FILA_SUPLEMENTO]))

    assert cantidad == 1
    assert db_session.get(AlimentoReferencia, "S001") is None
    assert db_session.get(AlimentoReferencia, "L006").magnitud == MagnitudUnidad.VOLUMEN


def test_importar_dos_veces_actualiza_sin_duplicar(db_session: Session, tmp_path: Path):
    services.importar_desde_csv(db_session, _csv(tmp_path, [FILA_HARINA]))
    services.importar_desde_csv(db_session, _csv(tmp_path, [FILA_HARINA.replace("2.0e+00,1.6e-01", "5.0,1.6e-01")]))

    assert db_session.query(AlimentoReferencia).count() == 1
    assert db_session.get(AlimentoReferencia, "A010").sodio == 5.0


def test_importar_el_csv_de_sara_completo(db_session: Session):
    cantidad = services.importar_desde_csv(db_session, CSV_REAL)

    assert cantidad == 369
    azucar = services.buscar_alimentos(db_session, "azucar blanca")[0]
    assert azucar.nombre == "Azúcar blanca molida"
    assert azucar.carbohidratos == 99.98


ENCABEZADO_COMPLEMENTO = "Codigo,AlimentoSara2,AzucaresTotales,AzucaresAnadidos,GrasasTrans\n"


def _complemento(tmp_path: Path, filas: list) -> Path:
    ruta = tmp_path / "complemento.csv"
    ruta.write_text(ENCABEZADO_COMPLEMENTO + "".join(filas), encoding="utf-8")
    return ruta


def test_complemento_sara2_completa_azucares_y_trans(db_session: Session, tmp_path: Path):
    services.importar_desde_csv(db_session, _csv(tmp_path, [FILA_HARINA, FILA_LECHE]))

    completados = services.importar_complemento_sara2(
        db_session, _complemento(tmp_path, ['A010,"Harina de trigo,  cruda",0.333,0.0,0.01\n'])
    )

    harina = db_session.get(AlimentoReferencia, "A010")
    assert completados == 1
    assert harina.nombre_en_pdf == "Harina de trigo, cruda"
    assert (harina.azucares_totales, harina.azucares_anadidos, harina.grasas_trans) == (0.33, 0.0, 0.01)
    assert harina.sodio == 2.0
    leche = db_session.get(AlimentoReferencia, "L006")
    assert leche.nombre_en_pdf is None
    assert leche.azucares_totales is None


def test_complemento_sara2_respeta_los_datos_vacios_y_codigos_desconocidos(db_session: Session, tmp_path: Path):
    services.importar_desde_csv(db_session, _csv(tmp_path, [FILA_HARINA]))

    completados = services.importar_complemento_sara2(
        db_session, _complemento(tmp_path, ["A010,Harina de trigo,,,0\n", "Z999,Otro,1,1,1\n"])
    )

    harina = db_session.get(AlimentoReferencia, "A010")
    assert completados == 1
    assert harina.azucares_totales is None
    assert harina.azucares_anadidos is None
    assert harina.grasas_trans == 0.0
    assert db_session.get(AlimentoReferencia, "Z999") is None


def test_complemento_sara2_real(db_session: Session):
    services.importar_desde_csv(db_session, CSV_REAL)

    completados = services.importar_complemento_sara2(db_session, COMPLEMENTO_REAL)

    assert completados == 196
    azucar = db_session.get(AlimentoReferencia, "D003")
    assert (azucar.azucares_totales, azucar.azucares_anadidos, azucar.grasas_trans) == (99.8, 99.8, 0.0)
    assert azucar.nombre_en_pdf == "Azúcar blanca molida"


def test_buscar_ignora_mayusculas_y_tildes(db_session: Session, tmp_path: Path):
    services.importar_desde_csv(db_session, _csv(tmp_path, [FILA_HARINA, FILA_LECHE]))

    assert [a.codigo for a in services.buscar_alimentos(db_session, "HARÍNA")] == ["A010"]


def test_buscar_exige_todas_las_palabras(db_session: Session, tmp_path: Path):
    services.importar_desde_csv(db_session, _csv(tmp_path, [FILA_HARINA, FILA_LECHE]))

    assert [a.codigo for a in services.buscar_alimentos(db_session, "leche entera")] == ["L006"]
    assert services.buscar_alimentos(db_session, "leche trigo") == []


def test_buscar_sin_texto_devuelve_ordenado_y_respeta_el_limite(db_session: Session, tmp_path: Path):
    services.importar_desde_csv(db_session, _csv(tmp_path, [FILA_LECHE, FILA_HARINA]))

    assert [a.codigo for a in services.buscar_alimentos(db_session)] == ["A010", "L006"]
    assert len(services.buscar_alimentos(db_session, limite=1)) == 1


def test_leer_alimento_inexistente(db_session: Session):
    with pytest.raises(exceptions.AlimentoNoEncontrado):
        services.leer_alimento(db_session, "Z999")


def test_valor_de_lee_el_nutriente_pedido(db_session: Session, tmp_path: Path):
    services.importar_desde_csv(db_session, _csv(tmp_path, [FILA_HARINA]))
    harina = services.leer_alimento(db_session, "A010")

    assert services.valor_de(harina, Nutriente.SODIO) == 2.0
    assert services.valor_de(harina, Nutriente.AZUCARES_TOTALES) is None
