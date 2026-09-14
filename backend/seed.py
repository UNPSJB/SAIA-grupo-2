from sqlalchemy.orm import Session
from src.database import SessionLocal
from src.database import SessionLocal, engine
from src.models import Base
from src.capacidades.models import Capacidad
from src.empleados.models import Empleado
from src.equipos.models import Equipo
from src.insumos.models import Insumo
from src.unidades_medida.models import UnidadMedida

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        print(" Iniciando el poblamiento de la base de datos...")

        #Unidades de Medida 
        if db.query(UnidadMedida).count() == 0:
            unidades = [
                UnidadMedida(nombre="Kilogramos"),
                UnidadMedida(nombre="Litros"),
                UnidadMedida(nombre="Gramos"),
                UnidadMedida(nombre="Unidades")
            ]
            db.add_all(unidades)
            db.commit()
            print(" Unidades de medida creadas.")

        #Capacidades 
        if db.query(Capacidad).count() == 0:
            capacidades = [
                Capacidad(nombre="Administrativo"),
                Capacidad(nombre="Operario"),
                Capacidad(nombre="Control de Calidad")
            ]
            db.add_all(capacidades)
            db.commit()
            print(" Capacidades creadas.")

        #Insumos 
        if db.query(Insumo).count() == 0:
            unidad_kg = db.query(UnidadMedida).filter_by(nombre="Kilogramos").first()
            insumos = [
                Insumo(nombre="Harina 000", unidad_medida_id=unidad_kg.id if unidad_kg else 1),
                Insumo(nombre="Azúcar blanca", unidad_medida_id=unidad_kg.id if unidad_kg else 1)
            ]
            db.add_all(insumos)
            db.commit()
            print("Insumos creados.")

        #Empleados y asignación de capacidades 
        if db.query(Empleado).count() == 0:
            cap_operario = db.query(Capacidad).filter_by(nombre="Operario").first()
            cap_admin = db.query(Capacidad).filter_by(nombre="Administrativo").first()

            emp1 = Empleado(nombre="Carlos", apellido="Gómez")
            emp2 = Empleado(nombre="pepe", apellido="Gómez")
            emp3 = Empleado(nombre="pedro", apellido="Gómez")
            emp4 = Empleado(nombre="Carlos", apellido="Gutierrez")
            emp5 = Empleado(nombre="Carlos", apellido="Tevez")

            if cap_operario:
                emp1.capacidades.append(cap_admin)
                emp2.capacidades.append(cap_admin)
                emp3.capacidades.append(cap_operario)
                emp4.capacidades.append(cap_admin)
                emp5.capacidades.append(cap_operario)
            
            db.add(emp1)
            db.add(emp2)
            db.add(emp3)
            db.add(emp4)
            db.add(emp5)
            db.commit()
            print("Empleados creados.")

        #Equipos
        if db.query(Equipo).count() == 0:
            equipos = [
                Equipo(nombre="Heladera Cámara 1", activo=True, tipo="heladera", ubicacion="Depósito Frío"),
                Equipo(nombre="Horno Rotativo", activo=True, tipo="horno", ubicacion="Sector Cocción"),
                Equipo(nombre="Balanza Digital", activo=True, tipo="balanza", ubicacion="Recepción de Materia Prima")
            ]
            db.add_all(equipos)
            db.commit()
            print("Equipos creados.")

        print("Base de datos poblada exitosamente con datos de prueba!")

    except Exception as e:
        db.rollback()
        print(f"Error al poblar la base de datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()