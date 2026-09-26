import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { PlanLimpieza } from '../../types/planes';
import { getPlanes } from '../../services/planesServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function PlanesList() {
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
            
            <Link to="/planes/nuevo" className={styles.linkCrear}>
                <Boton variant="crear">Crear Nuevo Plan</Boton>
            </Link>

            <div className={styles.contenedorTabla}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 0.8fr 0.8fr 1.5fr' }}>
                    <div>Título</div>
                    <div>Sector</div>
                    <div>Inicio</div>
                    <div>Fin</div>
                    <div style={{ textAlign: 'center' }}>Equipos</div>
                    <div style={{ textAlign: 'center' }}>Tareas</div>
                    <div>Acciones</div>
                </div>

                {planes.map((plan) => (
                    <div key={plan.id} className={styles.filaItem} style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 0.8fr 0.8fr 1.5fr', alignItems: 'center' }}>
                        <div style={{ fontWeight: '500' }}>{plan.titulo}</div>
                        <div>{plan.sector?.nombre || <span style={{ color: 'var(--text-muted)' }}>Sin sector</span>}</div>
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
                            <Link to={`/planes/editar/${plan.id}`}>
                                <Boton variant="editar"></Boton>
                            </Link>
                            <Link to={`/planes/eliminar/${plan.id}`}>
                                <Boton variant="eliminar"></Boton>
                            </Link>
                        </div>
                    </div>
                ))}

                {planes.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center' }}>No hay planes registrados.</div>
                )}
            </div>
        </div>
    );
}