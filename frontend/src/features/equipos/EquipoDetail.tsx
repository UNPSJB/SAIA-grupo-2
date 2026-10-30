import { useState, useEffect } from "react";
import { Link, useParams } from 'react-router-dom';
import type { Equipo } from '../../types/equipos';
import type { CalibracionRealizada } from '../../types/calibracionRealizada';
import { getEquipoById } from '../../services/equiposServices';
import { getCalibracionesByEquipoId } from '../../services/calibracionRealizadaServices';
import { COLOR_ESTADO, ETIQUETA_ESTADO, textoMantenimiento } from './estadoMantenimiento';
import Boton from '../../components/Boton';
import VisorArchivo from '../../components/VisorArchivo';
import RegistrarCalibracionModal from './RegistrarCalibracionModal';
import styles from '../../styles/shared.module.css';

export default function EquipoDetail() {
    const [equipo, setEquipo] = useState<Equipo | null>(null);
    const [calibraciones, setCalibraciones] = useState<CalibracionRealizada[]>([]);
    const [certificacionAbierta, setCertificacionAbierta] = useState<CalibracionRealizada | null>(null);
    const [modalCalibracionAbierto, setModalCalibracionAbierto] = useState(false);
    const { id } = useParams();

    const cargarEquipo = async()=>{
        if (!id) return;
        try{
            const data = await getEquipoById(id);
            const calibracionesData = await getCalibracionesByEquipoId(id);
            setCalibraciones(calibracionesData);
            setEquipo(data);
        } catch (error){
            console.error("Error al cargar el equipo:", error);
        }
    };

    useEffect(() => {
        cargarEquipo();
    }, [id]);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Detalle del Equipo</h2>
            {equipo ? (
                <div className={styles.tarjetaEstatica} style={{ maxWidth: '600px', width: '100%' }}>
                    <p><strong>Nombre:</strong> {equipo.nombre}</p>
                    <p><strong>Categoría:</strong> {equipo.tipo.nombre}</p>
                    <p><strong>Ubicación / Sector:</strong> {equipo.sector?.nombre}</p>
                    <p><strong>Activo en Sistema:</strong> {equipo.activo ? 'Sí' : 'No'}</p>
                    <p><strong>Condición Física (Estado):</strong> {equipo.estado === 'bueno' ? 'Bueno (Operativo)' : 'Dañado'}</p>
                    
                    <p><strong>Mantenimiento:</strong>{' '}
                        <span
                            style={{
                                marginBottom: '20px',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                color: COLOR_ESTADO[equipo.estado_mantenimiento]
                            }}
                        >
                            {ETIQUETA_ESTADO[equipo.estado_mantenimiento]}
                        </span>
                    </p>

                    <p><strong>Frecuencia de mantenimiento:</strong>{' '}
                        {equipo.frecuencia_mantenimiento_dias !== null
                            ? `Cada ${equipo.frecuencia_mantenimiento_dias} días`
                            : 'No definida'}
                    </p>

                    <p><strong>Próximo mantenimiento:</strong>{' '}
                        {equipo.fecha_proximo_mantenimiento ?? 'No aplica'}
                        {equipo.fecha_proximo_mantenimiento && ` (${textoMantenimiento(equipo)})`}
                    </p>
                    
                    <p style={{marginBottom: '20px'}}><strong>Último mantenimiento:</strong> {equipo.fecha_ultimo_mantenimiento}</p>

                    {calibraciones.length > 0 ? (
                        <div className={styles.accordion}>
                            <details className={styles.accordionItem} open>
                                <summary className={styles.accordionHeader}>
                                    <strong>Calibraciones</strong>{' '}
                                    <svg className={styles.accordionIcon} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m2 5 6 6 6-6"/></svg>
                                </summary>
                                <div className={styles.accordionBody}> 
                                    <div className={styles.contenedorTabla}>
                                        <div className={styles.filaHeader} style={{ gridTemplateColumns: '2.5fr 0fr' }}>
                                            <div>Fecha</div>
                                            <div>Certificacion</div>
                                        </div>
                                        {calibraciones.map((cr) => (
                                            <div key={cr.fecha} className={styles.filaItem} style={{ gridTemplateColumns: '2.5fr 0fr' }}>
                                                <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>
                                                    {cr.fecha}
                                                </div>
                                                <div className={styles.grupoBotonesTabla}>
                                                    <Boton
                                                        variant="documentos"
                                                        onClick={() => setCertificacionAbierta(cr)}
                                                        title="Ver certificación"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </details>
                        </div>
                        ) : (
                            <p>El equipo no posee calibraciones registradas</p>
                        )}

                    <div className={styles.bloqueDetalle} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <Link to="/equipos">
                            <Boton variant="volver">Volver a la lista</Boton>
                        </Link>
                        <Boton variant="crear" onClick={() => setModalCalibracionAbierto(true)}>
                            Registrar calibración
                        </Boton>
                    </div>
                </div>
            ) : (
                <p>Equipo no encontrado</p>
            )}

            {certificacionAbierta && (
                <div
                    className={styles.modalOverlay}
                    role="presentation"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setCertificacionAbierta(null);
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="titulo-certificacion"
                        style={{
                            backgroundColor: 'var(--bg)',
                            width: '95%',
                            maxWidth: '1000px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            borderRadius: '12px',
                            padding: '24px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                            <h2 id="titulo-certificacion" style={{ margin: 0, color: 'var(--text-h)' }}>
                                Certificación - {certificacionAbierta.fecha}
                            </h2>
                            <Boton variant="volver" onClick={() => setCertificacionAbierta(null)}>
                                Volver
                            </Boton>
                        </div>

                        <VisorArchivo
                            url={certificacionAbierta.certificacion_url}
                            alto="72vh"
                        />
                    </section>
                </div>
            )}

            {modalCalibracionAbierto && equipo && (
                <RegistrarCalibracionModal
                    equipo={equipo}
                    onClose={() => setModalCalibracionAbierto(false)}
                    onSuccess={() => {
                        void cargarEquipo();
                    }}
                />
            )}
        </div>
    );
}