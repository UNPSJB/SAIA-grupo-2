import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Tarea } from '../../types/tareas';
import { getTareas } from '../../services/tareasServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function TareasList() {
    const [tareas, setTareas] = useState<Tarea[]>([]);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getTareas();
                setTareas(data);
            } catch (error) {
                console.error("Error al cargar tareas:", error);
            }
        };
        cargarDatos();
    }, []);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Gestión de Tareas y Checklists</h2>
            
            <Link to="/tareas/nueva" className={styles.linkCrear}>
                <Boton variant="crear">Nueva Tarea</Boton>
            </Link>

            <div className={styles.contenedorTabla}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '2fr 1fr 2fr 1fr 1.5fr', textAlign: 'center' }}>
                    <div style={{ textAlign: 'left' }}>Título</div>
                    <div>Frecuencia</div>
                    <div>Planes Asociados</div>
                    <div>Insumos</div>
                    <div>Acciones</div>
                </div>

                {tareas.map((tarea) => (
                    <div key={tarea.id} className={styles.filaItem} style={{ gridTemplateColumns: '2fr 1fr 2fr 1fr 1.5fr', alignItems: 'center', textAlign: 'center' }}>
                        
                        {/* Título */}
                        <div style={{ fontWeight: '500', textAlign: 'left' }}>{tarea.titulo}</div>
                        
                        {/* Frecuencia  */}
                        <div style={{ textTransform: 'capitalize' }}>{tarea.frecuencia}</div>
                        
                        {/* Planes asociados  */}
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {tarea.planes && tarea.planes.length > 0 ? (
                                tarea.planes.map(p => p.titulo).join(', ')
                            ) : (
                                <span style={{ fontStyle: 'italic' }}>Sin plan</span>
                            )}
                        </div>

                        {/* Insumos */}
                        <div>
                            {tarea.consumos_estimados && tarea.consumos_estimados.length > 0 ? (
                                <span style={{ fontWeight: '500', color: '#166534' }}>
                                    {tarea.consumos_estimados.length} {tarea.consumos_estimados.length === 1 ? 'producto' : 'productos'}
                                </span>
                            ) : (
                                <span style={{ color: '#9ca3af' }}>Ninguno</span>
                            )}
                        </div>
                        
                        {/* Botones de acción centrados */}
                        <div className={styles.grupoBotonesTabla} style={{ justifyContent: 'center' }}>
                            <Link to={`/tareas/editar/${tarea.id}`}>
                                <Boton variant="editar"></Boton>
                            </Link>
                            <Link to={`/tareas/eliminar/${tarea.id}`}>
                                <Boton variant="eliminar"></Boton>
                            </Link>
                        </div>
                    </div>
                ))}

                {tareas.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center' }}>No hay tareas registradas.</div>
                )}
            </div>
        </div>
    );
}