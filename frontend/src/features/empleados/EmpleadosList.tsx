import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Empleado } from '../../types/empleados';
import { getEmpleados } from '../../services/empleadosServices';
import Boton from '../../components/Boton';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/shared.module.css';

export default function EmpleadosList() {
    const { usuario } = useAuth();
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
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

    const empleadosFiltrados = empleados.filter(emp => mostrarInactivos || emp.activo);

    const indiceUltimo = paginaActual * empleadosPorPagina;
    const indicePrimer = indiceUltimo - empleadosPorPagina;
    const empleadosActuales = empleadosFiltrados.slice(indicePrimer, indiceUltimo);
    const totalPaginas = Math.ceil(empleadosFiltrados.length / empleadosPorPagina);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Directorio de Personal</h2>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1100px', marginBottom: '20px' }}>
                {usuario?.rol === 'admin' ? (
                    <Link to="/empleados/nuevo">
                        <Boton variant="crear">
                            Registrar Empleado
                        </Boton>
                    </Link>
                ) : <div />}

                <label className={styles.labelCheckbox} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={mostrarInactivos}
                        onChange={(e) => {
                            setMostrarInactivos(e.target.checked);
                            setPaginaActual(1);
                        }}
                    />
                    <span>Mostrar empleados dados de baja</span>
                </label>
            </div>

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
                                    >
                                        {cap.nombre}
                                    </span>
                                ))
                            ) : (
                                <span className={styles.badge} style={{ color: 'var(--text-muted)' }}>
                                    Sin asignar
                                </span>
                            )}
                        </div>

                        <div>
                            {emp.activo ? (
                                <span className={styles.textSuccess}>Activo</span>
                            ) : (
                                <span className={styles.textInactive}>Inactivo</span>
                            )}
                        </div>
                        
                        <div className={styles.grupoBotonesTabla}>
                            {usuario?.rol === 'admin' && (
                                <Link to={`/empleados/editar/${emp.id}`} title="Editar empleado">
                                    <Boton variant="editar" style={{ padding: '8px 12px' }}></Boton>
                                </Link>
                            )}
                            <Link to={`/empleados/${emp.id}`} title="Ver detalle">
                                <Boton variant="ver" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            {usuario?.rol === 'admin' && !emp.activo && (
                                <Link to={`/empleados/eliminar/${emp.id}`} title="Eliminar físicamente">
                                    <Boton variant="eliminar" style={{ padding: '8px 12px' }}></Boton>
                                </Link>
                            )}
                        </div>
                    </div>
                ))}

                {empleadosActuales.length === 0 && (
                    <div className={styles.emptyMensaje}>
                        {mostrarInactivos ? "No hay empleados registrados." : "No hay empleados activos actualmente."}
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
