import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Empleado } from '../../types/empleados';
import { getEmpleados } from '../../services/empleadosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function EmpleadosList() {
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [paginaActual, setPaginaActual] = useState(1);
    const empleadosPorPagina = 5; 

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getEmpleados();
                
                const datosOrdenados = data.sort((a, b) => {
                    if (a.activo === b.activo) return 0;
                    return a.activo ? -1 : 1;
                });
                
                setEmpleados(datosOrdenados);
            } catch (error) {
                console.error("Error al cargar empleados:", error);
            }
        };
        
        cargarDatos();
    }, []);

    // Paginación
    const indiceUltimo = paginaActual * empleadosPorPagina;
    const indicePrimer = indiceUltimo - empleadosPorPagina;
    const empleadosActuales = empleados.slice(indicePrimer, indiceUltimo);
    const totalPaginas = Math.ceil(empleados.length / empleadosPorPagina);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Directorio de Personal</h2>
            
            <Link to="/empleados/nuevo" className={styles.linkCrear}>
                <Boton variant="crear">
                    Registrar Empleado
                </Boton>
            </Link>

            <div className={styles.contenedorTabla}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '1fr 2fr 1.5fr 2.5fr 1fr 1.5fr' }}>
                    <div>Legajo</div>
                    <div>Nombre Completo</div>
                    <div>Sector/es</div> 
                    <div>Roles Asignados</div>
                    <div>Estado</div>
                    <div>Acciones</div>
                </div>

                {empleadosActuales.map((emp) => (
                    <div key={emp.id} className={styles.filaItem} style={{ gridTemplateColumns: '1fr 2fr 1.5fr 2.5fr 1fr 1.5fr' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-h)' }}>
                            {emp.legajo}
                        </div>

                        <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>
                            {emp.nombre} {emp.apellido}
                        </div>
                        
                        <div style={{ color: 'var(--text)', textAlign: 'center' }}>
                            {emp.sectores && emp.sectores.length > 0 ? (
                                emp.sectores.map(sec => sec.nombre).join(', ')
                            ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Sin asignar</span>
                            )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {emp.capacidades && emp.capacidades.length > 0 ? (
                                emp.capacidades.map(cap => (
                                    <span 
                                        key={cap.id} 
                                        className={`${styles.badge} ${cap.nombre.toLowerCase() === 'administrador' ? styles.badgeAdmin : ''}`}
                                        style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                                    >
                                        {cap.nombre}
                                    </span>
                                ))
                            ) : (
                                <span className={styles.badge} style={{ color: 'var(--text)' }}>
                                    Sin asignar
                                </span>
                            )}
                        </div>

                        <div>
                            {emp.activo ? (
                                <span style={{ color: '#16a34a', fontWeight: '500' }}>Activo</span>
                            ) : (
                                <span style={{ color: '#dc2626', fontWeight: '500' }}>Inactivo</span>
                            )}
                        </div>
                        
                        <div className={styles.grupoBotonesTabla}>
                            <Link to={`/empleados/editar/${emp.id}`} title="Editar empleado">
                                <Boton variant="editar" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            <Link to={`/empleados/${emp.id}`} title="Ver detalle">
                                <Boton variant="ver" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            <Link to={`/empleados/eliminar/${emp.id}`} title="Eliminar registro">
                                <Boton variant="eliminar" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                        </div>
                    </div>
                ))}

                {empleadosActuales.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)' }}>
                        No hay empleados registrados.
                    </div>
                )}
            </div>

            {totalPaginas > 1 && (
                <div className={styles.filaBotones} style={{ alignItems: 'center', marginTop: '30px', justifyContent: 'center' }}>
                    <Boton 
                        variant="volver" 
                        onClick={() => setPaginaActual(p => p - 1)} 
                        disabled={paginaActual === 1}
                    >
                        Anterior
                    </Boton>
                    
                    <span style={{ color: 'var(--text-h)', fontWeight: 'bold', margin: '0 15px' }}>
                        Página {paginaActual} de {totalPaginas}
                    </span>
                    
                    <Boton 
                        variant="siguiente" 
                        onClick={() => setPaginaActual(p => p + 1)} 
                        disabled={paginaActual === totalPaginas}
                    >
                        Siguiente
                    </Boton>
                </div>
            )}
        </div>
    );
}