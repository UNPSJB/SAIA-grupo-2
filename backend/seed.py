from sqlalchemy.orm import Session
from src.database import SessionLocal, engine
from src.models import Base
from src.capacidades.models import Capacidad
from src.empleados.models import Empleado
from src.equipos.models import Equipo, TipoEquipo
from src.insumos.models import Insumo
from src.unidades_medida.models import UnidadMedida
from src.sectores.models import Sector # <-- Agregamos el modelo de Sector

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    
    try:
        print("Iniciando el poblamiento de la base de datos...")

        # --- UNIDADES DE MEDIDA ---
        if db.query(UnidadMedida).count() == 0:
            unidades = [
                UnidadMedida(nombre="Kilogramos"),
                UnidadMedida(nombre="Litros"),
                UnidadMedida(nombre="Gramos"),
                UnidadMedida(nombre="Unidades"),
                UnidadMedida(nombre="Mililitros"),
                UnidadMedida(nombre="Toneladas"),
                UnidadMedida(nombre="Cajas"),
                UnidadMedida(nombre="Paquetes"),
                UnidadMedida(nombre="Rollos"),
                UnidadMedida(nombre="Pallets")
            ]
            db.add_all(unidades)
            db.commit()
            print("Unidades de medida creadas (10).")

        # --- CAPACIDADES ---
        if db.query(Capacidad).count() == 0:
            capacidades = [
                Capacidad(nombre="Administrador"), 
                Capacidad(nombre="Operario"),
                Capacidad(nombre="Control de Calidad"),
                Capacidad(nombre="Limpieza"),
                Capacidad(nombre="Mantenimiento"),
                Capacidad(nombre="Supervisor"),
                Capacidad(nombre="Logística"),
                Capacidad(nombre="Seguridad e Higiene"),
                Capacidad(nombre="Empaque")
            ]
            db.add_all(capacidades)
            db.commit()
            print("Capacidades creadas (9).")

        # --- INSUMOS ---
        if db.query(Insumo).count() == 0:
            u_kg = db.query(UnidadMedida).filter_by(nombre="Kilogramos").first().id
            u_l = db.query(UnidadMedida).filter_by(nombre="Litros").first().id
            u_u = db.query(UnidadMedida).filter_by(nombre="Unidades").first().id
            u_cj = db.query(UnidadMedida).filter_by(nombre="Cajas").first().id
            u_rl = db.query(UnidadMedida).filter_by(nombre="Rollos").first().id
            u_pq = db.query(UnidadMedida).filter_by(nombre="Paquetes").first().id
            
            insumos = [
                Insumo(nombre="Harina 000", unidad_medida_id=u_kg),
                Insumo(nombre="Azúcar Blanca", unidad_medida_id=u_kg),
                Insumo(nombre="Detergente Industrial", unidad_medida_id=u_l),
                Insumo(nombre="Lavandina Concentrada", unidad_medida_id=u_l),
                Insumo(nombre="Desengrasante", unidad_medida_id=u_l),
                Insumo(nombre="Cofias Descartables", unidad_medida_id=u_u),
                Insumo(nombre="Guantes de Nitrilo", unidad_medida_id=u_cj),
                Insumo(nombre="Levadura Fresca", unidad_medida_id=u_kg),
                Insumo(nombre="Sal Fina", unidad_medida_id=u_kg),
                Insumo(nombre="Aceite de Girasol", unidad_medida_id=u_l),
                Insumo(nombre="Alcohol al 70%", unidad_medida_id=u_l),
                Insumo(nombre="Papel Film", unidad_medida_id=u_rl),
                Insumo(nombre="Etiquetas Adhesivas", unidad_medida_id=u_rl),
                Insumo(nombre="Cajas de Cartón Corrugado", unidad_medida_id=u_cj),
                Insumo(nombre="Bolsas de Consorcio", unidad_medida_id=u_pq),
                Insumo(nombre="Esponjas Metálicas", unidad_medida_id=u_u)
            ]
            db.add_all(insumos)
            db.commit()
            print("Insumos creados (16).")

        # --- EMPLEADOS ---
        if db.query(Empleado).count() == 0:
            c_admin = db.query(Capacidad).filter_by(nombre="Administrador").first()
            c_operario = db.query(Capacidad).filter_by(nombre="Operario").first()
            c_calidad = db.query(Capacidad).filter_by(nombre="Control de Calidad").first()
            c_limpieza = db.query(Capacidad).filter_by(nombre="Limpieza").first()
            c_mantenimiento = db.query(Capacidad).filter_by(nombre="Mantenimiento").first()
            c_supervisor = db.query(Capacidad).filter_by(nombre="Supervisor").first()
            c_logistica = db.query(Capacidad).filter_by(nombre="Logística").first()
            c_empaque = db.query(Capacidad).filter_by(nombre="Empaque").first()

            empleados = [
                Empleado(legajo="EMP-1000", dni="11111111", nombre="Carlos", apellido="Gómez", activo=True),
                Empleado(legajo="EMP-1001", dni="22222222", nombre="María", apellido="Pérez", activo=True),
                Empleado(legajo="EMP-1002", dni="33333333", nombre="Juan", apellido="López", activo=True),
                Empleado(legajo="EMP-1003", dni="44444444", nombre="Lucía", apellido="Martínez", activo=True),
                Empleado(legajo="EMP-1004", dni="55555555", nombre="Pedro", apellido="Sánchez", activo=False),
                Empleado(legajo="EMP-1005", dni="66666666", nombre="Ana", apellido="García", activo=True),
                Empleado(legajo="EMP-1006", dni="77777777", nombre="Diego", apellido="Fernández", activo=True),
                Empleado(legajo="EMP-1007", dni="88888888", nombre="Sofía", apellido="Romero", activo=True),
                Empleado(legajo="EMP-1008", dni="99999999", nombre="Martín", apellido="Castro", activo=True),
                Empleado(legajo="EMP-1009", dni="10101010", nombre="Laura", apellido="Díaz", activo=True),
                Empleado(legajo="EMP-1010", dni="12121212", nombre="Jorge", apellido="Ruiz", activo=False),
                Empleado(legajo="EMP-1011", dni="13131313", nombre="Elena", apellido="Vargas", activo=True),
                Empleado(legajo="EMP-1012", dni="14141414", nombre="Andrés", apellido="Herrera", activo=True),
                Empleado(legajo="EMP-1013", dni="15151515", nombre="Valeria", apellido="Guzmán", activo=True),
            ]

            if c_admin: empleados[0].capacidades.append(c_admin)
            if c_admin and c_supervisor: empleados[1].capacidades.extend([c_admin, c_supervisor])
            if c_operario:
                empleados[2].capacidades.append(c_operario)
                empleados[4].capacidades.append(c_operario)
                empleados[8].capacidades.append(c_operario)
            if c_operario and c_limpieza:
                empleados[3].capacidades.extend([c_operario, c_limpieza])
                empleados[5].capacidades.extend([c_operario, c_limpieza])
            if c_calidad: 
                empleados[6].capacidades.append(c_calidad)
                empleados[13].capacidades.append(c_calidad)
            if c_limpieza: empleados[7].capacidades.append(c_limpieza)
            if c_mantenimiento: empleados[9].capacidades.append(c_mantenimiento)
            if c_logistica: 
                empleados[10].capacidades.append(c_logistica)
                empleados[11].capacidades.append(c_logistica)
            if c_empaque: empleados[12].capacidades.append(c_empaque)
            
            db.add_all(empleados)
            db.commit()
            print("Empleados creados (14).")

        # --- SECTORES (NUEVO) ---
        if db.query(Sector).count() == 0:
            carlos_admin = db.query(Empleado).filter_by(legajo="EMP-1000").first()
            maria_admin = db.query(Empleado).filter_by(legajo="EMP-1001").first()
            juan_op = db.query(Empleado).filter_by(legajo="EMP-1002").first()
            lucia_op = db.query(Empleado).filter_by(legajo="EMP-1003").first()

            sectores = [
                Sector(nombre="Depósito Frío", responsable_id=carlos_admin.id if carlos_admin else None, empleados=[carlos_admin, juan_op] if carlos_admin and juan_op else []),
                Sector(nombre="Sector Cocción", responsable_id=maria_admin.id if maria_admin else None, empleados=[maria_admin, lucia_op] if maria_admin and lucia_op else []),
                Sector(nombre="Recepción de Materia Prima"),
                Sector(nombre="Sector Preparación"),
                Sector(nombre="Control de Calidad"),
                Sector(nombre="Mantenimiento"),
                Sector(nombre="Sector Empaque"),
                Sector(nombre="Laboratorio de Calidad"),
                Sector(nombre="Línea de Producción")
            ]
            
            db.add_all(sectores)
            db.commit()
            print("Sectores creados (9).")

        # --- TIPOS DE EQUIPO ---
        if db.query(TipoEquipo).count() == 0:
            tipos = [
                TipoEquipo(nombre="Heladera"),
                TipoEquipo(nombre="Horno"),
                TipoEquipo(nombre="Balanza"),
                TipoEquipo(nombre="Amasadora"),
                TipoEquipo(nombre="Termómetro"),
                TipoEquipo(nombre="Cortadora"),
                TipoEquipo(nombre="Envasadora"),
                TipoEquipo(nombre="Mezcladora"),
                TipoEquipo(nombre="Pasteurizador"),
                TipoEquipo(nombre="Cinta Transportadora"),
                TipoEquipo(nombre="Detector de Metales")
            ]
            db.add_all(tipos)
            db.commit()
            print("Tipos de equipo creados (11).")

        # --- EQUIPOS ---
        if db.query(Equipo).count() == 0:
            # Tipos
            t_heladera = db.query(TipoEquipo).filter_by(nombre="Heladera").first().id
            t_horno = db.query(TipoEquipo).filter_by(nombre="Horno").first().id
            t_balanza = db.query(TipoEquipo).filter_by(nombre="Balanza").first().id
            t_amasadora = db.query(TipoEquipo).filter_by(nombre="Amasadora").first().id
            t_termometro = db.query(TipoEquipo).filter_by(nombre="Termómetro").first().id
            t_cortadora = db.query(TipoEquipo).filter_by(nombre="Cortadora").first().id
            t_envasadora = db.query(TipoEquipo).filter_by(nombre="Envasadora").first().id
            t_mezcladora = db.query(TipoEquipo).filter_by(nombre="Mezcladora").first().id
            t_cinta = db.query(TipoEquipo).filter_by(nombre="Cinta Transportadora").first().id
            t_detector = db.query(TipoEquipo).filter_by(nombre="Detector de Metales").first().id

            # Sectores
            s_frio = db.query(Sector).filter_by(nombre="Depósito Frío").first().id
            s_coccion = db.query(Sector).filter_by(nombre="Sector Cocción").first().id
            s_recepcion = db.query(Sector).filter_by(nombre="Recepción de Materia Prima").first().id
            s_preparacion = db.query(Sector).filter_by(nombre="Sector Preparación").first().id
            s_calidad = db.query(Sector).filter_by(nombre="Control de Calidad").first().id
            s_mantenimiento = db.query(Sector).filter_by(nombre="Mantenimiento").first().id
            s_empaque = db.query(Sector).filter_by(nombre="Sector Empaque").first().id
            s_laboratorio = db.query(Sector).filter_by(nombre="Laboratorio de Calidad").first().id
            s_produccion = db.query(Sector).filter_by(nombre="Línea de Producción").first().id

            equipos = [
                Equipo(nombre="Heladera Cámara 1", activo=True, tipo_id=t_heladera, sector_id=s_frio),
                Equipo(nombre="Horno Rotativo", activo=True, tipo_id=t_horno, sector_id=s_coccion),
                Equipo(nombre="Balanza Digital 30kg", activo=True, tipo_id=t_balanza, sector_id=s_recepcion),
                Equipo(nombre="Amasadora Industrial 50kg", activo=True, tipo_id=t_amasadora, sector_id=s_preparacion),
                Equipo(nombre="Termómetro Infrarrojo", activo=True, tipo_id=t_termometro, sector_id=s_calidad),
                Equipo(nombre="Termómetro de Pinche", activo=True, tipo_id=t_termometro, sector_id=s_coccion),
                Equipo(nombre="Cámara de Congelados", activo=True, tipo_id=t_heladera, sector_id=s_frio),
                Equipo(nombre="Cortadora de Fiambre", activo=False, tipo_id=t_cortadora, sector_id=s_mantenimiento),
                Equipo(nombre="Envasadora al Vacío", activo=True, tipo_id=t_envasadora, sector_id=s_empaque),
                Equipo(nombre="Mezcladora de Polvos 100L", activo=True, tipo_id=t_mezcladora, sector_id=s_preparacion),
                Equipo(nombre="Balanza de Precisión", activo=True, tipo_id=t_balanza, sector_id=s_laboratorio),
                Equipo(nombre="Cinta Transportadora Ppal", activo=True, tipo_id=t_cinta, sector_id=s_produccion),
                Equipo(nombre="Detector de Metales Fin de Línea", activo=True, tipo_id=t_detector, sector_id=s_empaque),
                Equipo(nombre="Horno Convector Secundario", activo=False, tipo_id=t_horno, sector_id=s_mantenimiento)
            ]
            db.add_all(equipos)
            db.commit()
            print("Equipos creados (14).")

        print("Base de datos poblada exitosamente con datos de prueba para Inocuidad Alimentaria!")

    except Exception as e:
        db.rollback()
        print(f"Error al poblar la base de datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()