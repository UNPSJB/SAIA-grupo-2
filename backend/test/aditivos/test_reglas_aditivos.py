import pytest
from sqlalchemy.orm import Session

from src.aditivos import exceptions, schemas, services


def _clase(db: Session, nombre: str, necesita_ins: bool):
    return services.crear_clase_funcional_aditivo(
        db, schemas.ClaseFuncionalAditivoCreate(nombre=nombre, necesita_ins=necesita_ins)
    )


def _aditivo(db: Session, clase_id: int, nombre: str, ins=None):
    return services.crear_aditivo(
        db, schemas.AditivoCreate(nombre_completo=nombre, clase_funcional_id=clase_id, numero_ins=ins)
    )


def test_el_ins_es_obligatorio_si_la_clase_lo_necesita(db_session: Session):
    conservante = _clase(db_session, "conservante", True)
    with pytest.raises(exceptions.NumeroINSRequerido):
        _aditivo(db_session, conservante.id, "Sorbato de potasio")
    with pytest.raises(exceptions.NumeroINSRequerido):
        _aditivo(db_session, conservante.id, "Sorbato de potasio", "  ")


def test_en_los_aromatizantes_el_ins_es_opcional_y_se_conserva(db_session: Session):
    aromatizante = _clase(db_session, "aromatizante", False)
    sin_ins = _aditivo(db_session, aromatizante.id, "Aroma de vainilla")
    con_ins = _aditivo(db_session, aromatizante.id, "Vainillina", "1101")
    assert sin_ins.numero_ins is None
    assert con_ins.numero_ins == "1101"


def test_el_ins_no_se_repite(db_session: Session):
    conservante = _clase(db_session, "conservante", True)
    _aditivo(db_session, conservante.id, "Sorbato de potasio", "202")
    with pytest.raises(exceptions.NumeroINSDuplicado):
        _aditivo(db_session, conservante.id, "Otro sorbato", "202")


def test_el_aditivo_necesita_una_clase_existente(db_session: Session):
    with pytest.raises(exceptions.ClaseFuncionalNoEncontrada):
        _aditivo(db_session, 999, "Sin clase", "300")


def test_aditivos_por_clase(db_session: Session):
    conservante = _clase(db_session, "conservante", True)
    _aditivo(db_session, conservante.id, "Sorbato de potasio", "202")
    _aditivo(db_session, conservante.id, "Benzoato de sodio", "211")
    nombres = {a.nombre_completo for a in services.listar_aditivos_de_clase(db_session, conservante.id)}
    assert nombres == {"Sorbato de potasio", "Benzoato de sodio"}
