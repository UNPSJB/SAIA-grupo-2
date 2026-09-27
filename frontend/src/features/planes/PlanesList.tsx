import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { PlanLimpieza } from '../../types/planes';
import { getPlanes } from '../../services/planesServices';
import Boton from '../../components/Boton';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/shared.module.css';

export default function PlanesList() {
    const { usuario } = useAuth();
    const [planes, setPlanes] = useState<PlanLimpieza[]>([]);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getPlanes();
                setPlanes(data);
            } catch (error) {
                console.error("Error al cargar planes:", error);
            }
        };
        cargarDatos();
    }, []);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Gestión de Planes de Limpieza</h2>
            
            {usuario?.rol === 'admin' && (
                <Link to="/planes/nuevo" className={styles.linkCrear}>
                    <Boton variant="crear">Crear Nuevo Plan</Boton>
                </Link>
            )}

            <div className={styles.contenedorTabla}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 0.8fr 0.8fr 1.8fr' }}>
                    <div>Título</div>
                    <div>Sector</div>
                    <div>Inicio</div>
                    <div>Fin</div>
                    <div style={{ textAlign: 'center' }}>Equipos</div>
                    <div style={{ textAlign: 'center' }}>Tareas</div>
                    <div>Acciones</div>
                </div>

                {planes.map((plan) => (
                    <div key={plan.id} className={styles.filaItem} style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 0.8fr 0.8fr 1.8fr', alignItems: 'center' }}>
                        <div style={{ fontWeight: '500' }}>{plan.titulo}</div>
                        <div>{plan.sector?.nombre || <span className={styles.textMuted}>Sin sector</span>}</div>
                        <div>{plan.fecha_inicio}</div>
                        <div>
                            {plan.fecha_fin ? (
                                plan.fecha_fin
                            ) : (
                                <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin límite</span>
                            )}
                        </div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold' }}>{plan.equipos?.length || 0}</div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold' }}>{plan.tareas?.length || 0}</div>
                        
                        <div className={styles.grupoBotonesTabla}>
                            {usuario?.rol === 'admin' && (
                                <Link to={`/planes/editar/${plan.id}`} title="Editar plan">
                                    <Boton variant="editar"></Boton>
                                </Link>
                            )}
                            <Link to={`/planes/${plan.id}`} title="Ver detalle del plan">
                                <Boton variant="ver"></Boton>
                            </Link>
                            {usuario?.rol === 'admin' && (
                                <Link to={`/planes/eliminar/${plan.id}`} title="Eliminar plan">
                                    <Boton variant="eliminar"></Boton>
                                </Link>
                            )}
                        </div>
                    </div>
                ))}

                {planes.length === 0 && (
                    <div className={styles.emptyMensaje}>No hay planes registrados.</div>
                )}
            </div>
        </div>
    );
}
