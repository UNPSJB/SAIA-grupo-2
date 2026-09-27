import { useState, useEffect } from "react";
import { Link, useParams } from 'react-router-dom';
import type { PlanLimpieza } from '../../types/planes';
import { getPlanById } from '../../services/planesServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function PlanDetail() {
    const [plan, setPlan] = useState<PlanLimpieza | null>(null);
    const { id } = useParams();

    useEffect(() => {
        const cargarPlan = async () => {
            if (id) {
                try {
                    const data = await getPlanById(id);
                    setPlan(data);
                } catch (error) {
                    console.error("Error al cargar plan:", error);
                }
            }
        };
        cargarPlan();
    }, [id]);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Detalle del Plan de Limpieza</h2>
            {plan ? (
                <div className={styles.formularioTarjeta} style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
                    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '15px', marginBottom: '20px' }}>
                        <h3 style={{ color: 'var(--text-h)', fontSize: '1.6rem', marginBottom: '10px' }}>{plan.titulo}</h3>
                        <p style={{ margin: '4px 0', fontSize: '1.05rem' }}>
                            <strong>Sector Asignado:</strong> {plan.sector?.nombre || 'Sin sector'}
                        </p>
                        <p style={{ margin: '4px 0' }}>
                            <strong>Fecha de Inicio:</strong> {plan.fecha_inicio} | <strong>Fecha de Fin:</strong> {plan.fecha_fin || 'Sin límite de fin'}
                        </p>
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <h4 style={{ color: 'var(--text-h)', marginBottom: '12px' }}>
                            Equipos Involucrados ({plan.equipos?.length || 0})
                        </h4>
                        {plan.equipos && plan.equipos.length > 0 ? (
                            <div className={styles.contenedorTabla}>
                                <div className={styles.filaHeader} style={{ gridTemplateColumns: '1fr 3fr' }}>
                                    <div>ID</div>
                                    <div>Nombre del Equipo</div>
                                </div>
                                {plan.equipos.map(eq => (
                                    <div key={eq.id} className={styles.filaItem} style={{ gridTemplateColumns: '1fr 3fr' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>#{eq.id}</div>
                                        <div style={{ fontWeight: '500' }}>{eq.nombre}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.textMuted} style={{ fontStyle: 'italic' }}>No hay equipos asociados a este plan.</div>
                        )}
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <h4 style={{ color: 'var(--text-h)', marginBottom: '12px' }}>
                            Tareas Configuradas ({plan.tareas?.length || 0})
                        </h4>
                        {plan.tareas && plan.tareas.length > 0 ? (
                            <div className={styles.contenedorTabla}>
                                <div className={styles.filaHeader} style={{ gridTemplateColumns: '1fr 3fr' }}>
                                    <div>ID</div>
                                    <div>Título de la Tarea</div>
                                </div>
                                {plan.tareas.map(t => (
                                    <div key={t.id} className={styles.filaItem} style={{ gridTemplateColumns: '1fr 3fr' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>#{t.id}</div>
                                        <div style={{ fontWeight: '500' }}>{t.titulo}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.textMuted} style={{ fontStyle: 'italic' }}>No hay tareas asignadas a este plan.</div>
                        )}
                    </div>

                    <div className={styles.filaBotones} style={{ marginTop: '30px', justifyContent: 'center' }}>
                        <Link to="/planes">
                            <Boton variant="volver">Volver a la Lista</Boton>
                        </Link>
                    </div>
                </div>
            ) : (
                <p>Cargando información del plan...</p>
            )}
        </div>
    );
}
