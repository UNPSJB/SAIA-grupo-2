from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from src.database import SessionLocal, engine
from src.models import Base
from src.capacidades.models import Capacidad
from src.empleados.models import Empleado, RolEmpleado
from src.equipos.models import Equipo, TipoEquipo
from src.insumos.models import Insumo
from src.unidades_medida.models import UnidadMedida
from src.sectores.models import Sector

from src.productos_limpieza.models import ProductoLimpieza
from src.productos_limpieza.constants import TipoProductoLimpieza
from src.tareas.models import Tarea, ConsumoEstimado
from src.tareas.constants import FrecuenciaTarea
from src.elementos_limpieza.models import ElementoLimpieza
from src.documentacion.constants import TipoDocumentacion
from src.documentacion.models import Documentacion, LibretaSanitaria, Capacitacion, CertificadoAptitudFisica, RequisitoDocumentacion
from src.planes.models import Plan
from src.checklists.models import Checklist, ConsumoReal

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
            # Solo Administrador y Operario
            capacidades = [
                Capacidad(nombre="Administrador"), 
                Capacidad(nombre="Operario")
            ]
            db.add_all(capacidades)
            db.commit()
            print("Capacidades creadas (2).")

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

            # Se les asigna explícitamente el rol además de la capacidad
            empleados = [
                Empleado(legajo="EMP-1000", dni="11111111", nombre="Carlos", apellido="Gómez", activo=True, rol=RolEmpleado.ADMIN),
                Empleado(legajo="EMP-1001", dni="22222222", nombre="María", apellido="Pérez", activo=True, rol=RolEmpleado.ADMIN),
                Empleado(legajo="EMP-1002", dni="33333333", nombre="Juan", apellido="López", activo=True, rol=RolEmpleado.OPERARIO),
                Empleado(legajo="EMP-1003", dni="44444444", nombre="Lucía", apellido="Martínez", activo=True, rol=RolEmpleado.OPERARIO),
                Empleado(legajo="EMP-1004", dni="55555555", nombre="Pedro", apellido="Sánchez", activo=False, rol=RolEmpleado.OPERARIO),
                Empleado(legajo="EMP-1005", dni="66666666", nombre="Ana", apellido="García", activo=True, rol=RolEmpleado.OPERARIO),
                Empleado(legajo="EMP-1006", dni="77777777", nombre="Diego", apellido="Fernández", activo=True, rol=RolEmpleado.OPERARIO),
                Empleado(legajo="EMP-1007", dni="88888888", nombre="Sofía", apellido="Romero", activo=True, rol=RolEmpleado.OPERARIO),
            ]

            # Los primeros dos son admins
            if c_admin: 
                empleados[0].capacidades.append(c_admin)
                empleados[1].capacidades.append(c_admin)
            
            # El resto son operarios
            if c_operario:
                for emp in empleados[2:]:
                    emp.capacidades.append(c_operario)
            
            db.add_all(empleados)
            db.commit()
            print("Empleados creados (8).")

        # --- SECTORES ---
        if db.query(Sector).count() == 0:
            carlos_admin = db.query(Empleado).filter_by(legajo="EMP-1000").first()
            maria_admin = db.query(Empleado).filter_by(legajo="EMP-1001").first()
            juan_op = db.query(Empleado).filter_by(legajo="EMP-1002").first()
            lucia_op = db.query(Empleado).filter_by(legajo="EMP-1003").first()
            ana_op = db.query(Empleado).filter_by(legajo="EMP-1005").first()
            diego_op = db.query(Empleado).filter_by(legajo="EMP-1006").first()
            sofia_op = db.query(Empleado).filter_by(legajo="EMP-1007").first()

            sectores = [
                Sector(
                    nombre="Depósito Frío",
                    responsable_id=carlos_admin.id if carlos_admin else None,
                    empleados=[emp for emp in [carlos_admin, juan_op] if emp]
                ),
                Sector(
                    nombre="Sector Cocción",
                    responsable_id=maria_admin.id if maria_admin else None,
                    empleados=[emp for emp in [maria_admin, lucia_op] if emp]
                ),
                Sector(
                    nombre="Recepción de Materia Prima",
                    responsable_id=carlos_admin.id if carlos_admin else None,
                    empleados=[emp for emp in [carlos_admin, ana_op] if emp]
                ),
                Sector(
                    nombre="Sector Preparación",
                    responsable_id=maria_admin.id if maria_admin else None,
                    empleados=[emp for emp in [maria_admin, diego_op] if emp]
                ),
                Sector(
                    nombre="Control de Calidad",
                    responsable_id=carlos_admin.id if carlos_admin else None,
                    empleados=[emp for emp in [carlos_admin, sofia_op] if emp]
                ),
                Sector(
                    nombre="Mantenimiento",
                    responsable_id=maria_admin.id if maria_admin else None,
                    empleados=[emp for emp in [maria_admin, juan_op, diego_op] if emp]
                ),
                Sector(
                    nombre="Sector Empaque",
                    responsable_id=carlos_admin.id if carlos_admin else None,
                    empleados=[emp for emp in [carlos_admin, lucia_op, sofia_op] if emp]
                ),
                Sector(
                    nombre="Laboratorio de Calidad",
                    responsable_id=maria_admin.id if maria_admin else None,
                    empleados=[emp for emp in [maria_admin, ana_op] if emp]
                ),
                Sector(
                    nombre="Línea de Producción",
                    responsable_id=carlos_admin.id if carlos_admin else None,
                    empleados=[emp for emp in [carlos_admin, juan_op, diego_op] if emp]
                )
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
                Equipo(nombre="Cortadora de Fiambre", activo=False, estado="danado", tipo_id=t_cortadora, sector_id=s_mantenimiento),
                Equipo(nombre="Envasadora al Vacío", activo=True, tipo_id=t_envasadora, sector_id=s_empaque),
                Equipo(nombre="Mezcladora de Polvos 100L", activo=True, tipo_id=t_mezcladora, sector_id=s_preparacion),
                Equipo(nombre="Balanza de Precisión", activo=True, tipo_id=t_balanza, sector_id=s_laboratorio),
                Equipo(nombre="Cinta Transportadora Ppal", activo=True, tipo_id=t_cinta, sector_id=s_produccion),
                Equipo(nombre="Detector de Metales Fin de Línea", activo=True, tipo_id=t_detector, sector_id=s_empaque),
                Equipo(nombre="Horno Convector Secundario", activo=False, estado="danado", tipo_id=t_horno, sector_id=s_mantenimiento)
            ]
            db.add_all(equipos)
            db.commit()
            print("Equipos creados (14).")

        if db.query(ProductoLimpieza).count() == 0:
            u_l = db.query(UnidadMedida).filter_by(nombre="Litros").first().id
            u_u = db.query(UnidadMedida).filter_by(nombre="Unidades").first().id
            
            productos_limpieza = [
                ProductoLimpieza(nombre="Hipoclorito 10%", tipo=TipoProductoLimpieza.DESINFECTANTE, stock=100.0, unidad_medida_id=u_l),
                ProductoLimpieza(nombre="Detergente Enzimático", tipo=TipoProductoLimpieza.DETERGENTE, stock=50.0, unidad_medida_id=u_l),
                ProductoLimpieza(nombre="Desengrasante Alcalino", tipo=TipoProductoLimpieza.DESENGRASANTE, stock=75.0, unidad_medida_id=u_l),
                ProductoLimpieza(nombre="Paños de Microfibra", tipo=TipoProductoLimpieza.OTRO, stock=200.0, unidad_medida_id=u_u)
            ]
            db.add_all(productos_limpieza)
            db.commit()
            print("Productos de Limpieza creados (4).")

        if db.query(Tarea).count() == 0:
            p_hipoclorito = db.query(ProductoLimpieza).filter_by(nombre="Hipoclorito 10%").first()
            p_detergente = db.query(ProductoLimpieza).filter_by(nombre="Detergente Enzimático").first()
            p_panos = db.query(ProductoLimpieza).filter_by(nombre="Paños de Microfibra").first()

            tareas = [
                Tarea(titulo="Desinfección de Superficies", frecuencia=FrecuenciaTarea.DIARIA),
                Tarea(titulo="Limpieza Profunda de Equipos", frecuencia=FrecuenciaTarea.SEMANAL),
                Tarea(titulo="Limpieza General de Sector", frecuencia=FrecuenciaTarea.DIARIA)
            ]
            db.add_all(tareas)
            db.commit()

            consumos = [
                ConsumoEstimado(tarea_id=tareas[0].id, producto_limpieza_id=p_hipoclorito.id, cantidad=0.5),
                ConsumoEstimado(tarea_id=tareas[0].id, producto_limpieza_id=p_panos.id, cantidad=1.0),
                ConsumoEstimado(tarea_id=tareas[1].id, producto_limpieza_id=p_detergente.id, cantidad=1.5),
                ConsumoEstimado(tarea_id=tareas[2].id, producto_limpieza_id=p_hipoclorito.id, cantidad=2.0)
            ]
            db.add_all(consumos)
            db.commit()
            print("Tareas y Consumos Estimados creados (3 tareas).")

        if db.query(Plan).count() == 0:
            s_frio = db.query(Sector).filter_by(nombre="Depósito Frío").first()
            s_coccion = db.query(Sector).filter_by(nombre="Sector Cocción").first()
            
            e_heladera = db.query(Equipo).filter_by(nombre="Heladera Cámara 1").first()
            e_horno = db.query(Equipo).filter_by(nombre="Horno Rotativo").first()
            
            t_desinfeccion = db.query(Tarea).filter_by(titulo="Desinfección de Superficies").first()
            t_profunda = db.query(Tarea).filter_by(titulo="Limpieza Profunda de Equipos").first()

            planes = [
                Plan(
                    titulo="Saneamiento Diario - Depósito Frío",
                    fecha_inicio=date.today() - timedelta(days=35),
                    sector_id=s_frio.id,
                    equipos=[e_heladera],
                    tareas=[t_desinfeccion]
                ),
                Plan(
                    titulo="Mantenimiento Semanal - Cocción",
                    fecha_inicio=date.today() - timedelta(days=35),
                    sector_id=s_coccion.id,
                    equipos=[e_horno],
                    tareas=[t_profunda, t_desinfeccion]
                )
            ]
            db.add_all(planes)
            db.commit()
            print("Planes de Limpieza creados (2).")

        if db.query(ElementoLimpieza).count() == 0:
            hoy = date.today()
            elementos = [
                ElementoLimpieza(
                    nombre="Cepillo de cerdas duras",
                    frecuencia_recambio_dias=90,
                    fecha_ultimo_recambio=hoy - timedelta(days=100),
                ),
                ElementoLimpieza(
                    nombre="Trapo de piso",
                    frecuencia_recambio_dias=30,
                    fecha_ultimo_recambio=hoy - timedelta(days=25),
                ),
                ElementoLimpieza(
                    nombre="Esponja abrasiva",
                    frecuencia_recambio_dias=60,
                    fecha_ultimo_recambio=hoy,
                ),
                ElementoLimpieza(
                    nombre="Guantes de nitrilo",
                    frecuencia_recambio_dias=45,
                    fecha_ultimo_recambio=hoy - timedelta(days=10),
                ),
                ElementoLimpieza(
                    nombre="Balde de 10 litros",
                    frecuencia_recambio_dias=None,
                    fecha_ultimo_recambio=hoy,
                ),
            ]
            db.add_all(elementos)
            db.commit()
            print("Elementos de Limpieza creados (5).")

        # --- CHECKLISTS (HISTORIAL DE EJECUCIONES HASTA EL PRIMERO DEL MES Y DÍAS PREVIOS) ---
        if db.query(Checklist).count() == 0:
            hoy = date.today()
            maria_admin = db.query(Empleado).filter_by(legajo="EMP-1001").first()
            juan_op = db.query(Empleado).filter_by(legajo="EMP-1002").first()
            lucia_op = db.query(Empleado).filter_by(legajo="EMP-1003").first()

            plan1 = db.query(Plan).filter_by(titulo="Saneamiento Diario - Depósito Frío").first()
            plan2 = db.query(Plan).filter_by(titulo="Mantenimiento Semanal - Cocción").first()

            p_hipoclorito = db.query(ProductoLimpieza).filter_by(nombre="Hipoclorito 10%").first()
            p_detergente = db.query(ProductoLimpieza).filter_by(nombre="Detergente Enzimático").first()
            p_panos = db.query(ProductoLimpieza).filter_by(nombre="Paños de Microfibra").first()

            t_desinfeccion = db.query(Tarea).filter_by(titulo="Desinfección de Superficies").first()
            t_profunda = db.query(Tarea).filter_by(titulo="Limpieza Profunda de Equipos").first()

            checklists_seed = []

            # Generar historial para los últimos 30 días
            for i in range(30, 0, -1):
                f_prog = hoy - timedelta(days=i)

                # Tarea diaria en plan1 (se completa casi todos los días)
                if i % 5 != 0:
                    c1 = Checklist(
                        tarea_id=t_desinfeccion.id,
                        plan_id=plan1.id if plan1 else None,
                        fecha_programada=f_prog,
                        realizada=True,
                        fecha_hora_completada=datetime.combine(f_prog, datetime.min.time().replace(hour=10, minute=15)),
                        empleado_id=juan_op.id if juan_op else None,
                        evidencia_url=None,
                        observaciones="Pisos y mesadas desinfectadas correctamente."
                    )
                    if p_hipoclorito:
                        c1.consumos_reales.append(ConsumoReal(producto_limpieza_id=p_hipoclorito.id, cantidad=0.5))
                    checklists_seed.append(c1)

                # Tarea diaria en plan2
                if i % 4 != 0:
                    c2 = Checklist(
                        tarea_id=t_desinfeccion.id,
                        plan_id=plan2.id if plan2 else None,
                        fecha_programada=f_prog,
                        realizada=True,
                        fecha_hora_completada=datetime.combine(f_prog, datetime.min.time().replace(hour=11, minute=30)),
                        empleado_id=lucia_op.id if lucia_op else None,
                        evidencia_url=None,
                        observaciones="Sanitización completa del sector."
                    )
                    if p_panos:
                        c2.consumos_reales.append(ConsumoReal(producto_limpieza_id=p_panos.id, cantidad=1.0))
                    checklists_seed.append(c2)

                # Tarea semanal profunda (incumplida frecuentemente para simular reporte)
                if i in (28, 21, 14, 7):
                    if i in (28, 7):
                        c3 = Checklist(
                            tarea_id=t_profunda.id,
                            plan_id=plan2.id if plan2 else None,
                            fecha_programada=f_prog,
                            realizada=True,
                            fecha_hora_completada=datetime.combine(f_prog, datetime.min.time().replace(hour=16, minute=45)),
                            empleado_id=maria_admin.id if maria_admin else None,
                            evidencia_url=None,
                            observaciones="Limpieza profunda con detergente enzimático realizada."
                        )
                        if p_detergente:
                            c3.consumos_reales.append(ConsumoReal(producto_limpieza_id=p_detergente.id, cantidad=1.5))
                        checklists_seed.append(c3)

            db.add_all(checklists_seed)
            db.commit()
            print(f"Historial de Checklists creado ({len(checklists_seed)} ejecuciones de prueba).")

        if db.query(RequisitoDocumentacion).count() == 0:
            db.add_all([
                RequisitoDocumentacion(
                    tipo=TipoDocumentacion.LIBRETA_SANITARIA,
                    obligatorio=True,
                    dias_aviso_previo=150,
                ),
                RequisitoDocumentacion(
                    tipo=TipoDocumentacion.CAPACITACION,
                    obligatorio=False,
                    dias_aviso_previo=30,
                ),
                RequisitoDocumentacion(
                    tipo=TipoDocumentacion.CERTIFICADO_APTITUD_FISICA,
                    obligatorio=False,
                    dias_aviso_previo=30,
                ),
            ])
            db.commit()
            print("Requisitos de documentacion creados (3).")

        if db.query(Documentacion).count() == 0:
            hoy_doc = date.today()
            empleados_doc = db.query(Empleado).order_by(Empleado.id).all()
            libretas = [
                LibretaSanitaria(
                    empleado_id=emp.id,
                    numero_carnet=f"LS-{1000 + indice}",
                    autoridad_emisora="Municipalidad de Trelew",
                    fecha_vencimiento=hoy_doc + timedelta(days=365),
                )
                for indice, emp in enumerate(empleados_doc)
            ]
            db.add_all(libretas)
            db.commit()
            print(f"Libretas sanitarias creadas ({len(libretas)}).")


        print("Base de datos poblada exitosamente con datos de prueba para Inocuidad Alimentaria!")

    except Exception as e:
        db.rollback()
        print(f"Error al poblar la base de datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()