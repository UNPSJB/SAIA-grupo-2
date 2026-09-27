import { useState, useEffect } from "react";
import { Link, useParams } from 'react-router-dom';
import type { Sector } from '../../types/sectores';
import { getSectorById } from '../../services/sectoresServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function SectorDetail() {
    const [sector, setSector] = useState<Sector | null>(null);
    const { id } = useParams();

    useEffect(() => {
        const cargarSector = async () => {
            if (id) {
                try {
                    const data = await getSectorById(Number(id));
                    setSector(data);
                } catch (error) {
                    console.error("Error al cargar sector:", error);
                }
            }
        };
        cargarSector();
    }, [id]);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Detalles del Sector</h2>
            
            {sector ? (
                <div className={styles.formularioTarjeta} style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
                    
                    {/* ENCABEZADO DEL SECTOR */}
                    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '15px', marginBottom: '20px' }}>
                        <h3 style={{ color: 'var(--primary)', fontSize: '1.5rem', marginBottom: '10px' }}>
                            {sector.nombre}
                        </h3>
                        <p style={{ color: 'var(--text-h)', fontSize: '1.1rem' }}>
                            <strong>Responsable / Encargado: </strong>
                            {sector.responsable 
                                ? `${sector.responsable.nombre} ${sector.responsable.apellido} (${sector.responsable.legajo})` 
                                : <span style={{ color: 'var(--text-muted)' }}>Sin asignar</span>}
                        </p>
                    </div>

                    {/* TABLA DE EMPLEADOS */}
                    <div>
                        <h4 style={{ color: 'var(--text-h)', marginBottom: '15px' }}>
                            Personal asignado ({sector.empleados?.length || 0})
                        </h4>
                        
                        {sector.empleados && sector.empleados.length > 0 ? (
                            <div className={styles.contenedorTabla}>
                                <div className={styles.filaHeader} style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
                                    <div>Legajo</div>
                                    <div>Nombre y Apellido</div>
                                    <div>Acción</div>
                                </div>
                                {sector.empleados.map(emp => (
                                    <div key={emp.id} className={styles.filaItem} style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--text-h)' }}>{emp.legajo}</div>
                                        <div>{emp.nombre} {emp.apellido}</div>
                                        <div>
                                            <Link to={`/empleados/${emp.id}`}>
                                                <Boton variant="ver" style={{ padding: '4px 8px', fontSize: '0.85rem' }}>Ver perfil</Boton>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
                                No hay empleados asignados a este sector actualmente.
                            </div>
                        )}
                    </div>

                    {/*TABLA DE EQUIPOS */}
                    <div style={{ marginTop: '30px' }}>
                        <h4 style={{ color: 'var(--text-h)', marginBottom: '15px' }}>
                            Equipamiento instalado ({sector.equipos?.length || 0})
                        </h4>
                        
                        {sector.equipos && sector.equipos.length > 0 ? (
                            <div className={styles.contenedorTabla}>
                                <div className={styles.filaHeader} style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                                    <div>Nombre del Equipo</div>
                                    <div>Estado</div>
                                    <div>Acción</div>
                                </div>
                                {sector.equipos.map(eq => (
                                    <div key={eq.id} className={styles.filaItem} style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                                        <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>{eq.nombre}</div>
                                        <div>
                                            {eq.activo 
                                                ? <span style={{ color: '#16a34a', fontWeight: '500' }}>Operativo</span> 
                                                : <span style={{ color: '#dc2626', fontWeight: '500' }}>Fuera de Servicio</span>}
                                        </div>
                                        <div>
                                            <Link to={`/equipos/${eq.id}`}>
                                                <Boton variant="ver" style={{ padding: '4px 8px', fontSize: '0.85rem' }}>Ver equipo</Boton>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
                                No hay equipos asignados a este sector actualmente.
                            </div>
                        )}
                    </div>

                    <div className={styles.filaBotones} style={{ marginTop: '30px', justifyContent: 'center' }}>
                        <Link to="/sectores">
                            <Boton variant="volver">Volver a Sectores</Boton>
                        </Link>
                    </div>
                </div>
            ) : (
                <p>Cargando información...</p>
            )}
        </div>
    );
}