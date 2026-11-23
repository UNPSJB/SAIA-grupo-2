from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from test.rotulado_frontal.test_calculo_sellos import _evaluar, _receta, materias


def test_calcular_y_consultar_sellos_por_la_api(client: TestClient, db_session: Session, admin, vigente, galletitas, materias):
    assert client.get(f"/rotulado-frontal/productos/{galletitas.id}/calculo-sellos").status_code == 404

    _receta(db_session, galletitas, materias, Harina=600, Azúcar=250, Manteca=150)
    _evaluar(db_session, galletitas, admin, agrega_azucares=True)
    calculado = client.post(
        f"/rotulado-frontal/productos/{galletitas.id}/calcular-sellos", json={"empleado_id": admin.id}
    )

    assert calculado.status_code == 200
    vigente_api = client.get(f"/rotulado-frontal/productos/{galletitas.id}/calculo-sellos")
    assert vigente_api.status_code == 200
    assert vigente_api.json()["id"] == calculado.json()["id"]
    assert [s["sello"] for s in vigente_api.json()["sellos_obtenidos"]] == ["exceso_azucares", "exceso_calorias"]
