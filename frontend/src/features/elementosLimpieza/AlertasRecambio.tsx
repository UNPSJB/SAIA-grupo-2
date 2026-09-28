import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { ElementoLimpieza } from '../../types/elementosLimpieza';
import { getAlertasRecambio, registrarRecambio } from '../../services/elementosLimpiezaServices';
import { COLOR_ESTADO, ETIQUETA_ESTADO, textoRecambio } from './estadoRecambio';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function AlertasRecambio() {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'admin';

    const [alertas, setAlertas] = useState<ElementoLimpieza[]>([]);
    const [cargando, setCargando] = useState(true);

    const cargarAlertas = async () => {
        try {
            const data = await getAlertasRecambio();
            setAlertas(data);
        } catch (error) {
            console.error("Error al cargar las alertas de recambio:", error);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarAlertas();
    }, []);

    const handleRecambio = async (elemento: ElementoLimpieza) => {
        const exito = await registrarRecambio(String(elemento.id));
        if (exito) {
            cargarAlertas();
        } else {
            alert('Hubo un error al registrar el recambio.');
        }
    };

    const vencidos = alertas.filter(a => a.estado_recambio === 'vencido').length;
    const proximos = alertas.filter(a => a.estado_recambio === 'proximo').length;

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Alertas de Recambio</h2>

            {!cargando && alertas.length > 0 && (
                <p style={{ marginTop: '-10px', marginBottom: '20px' }}>
                    <span style={{ color: COLOR_ESTADO.vencido, fontWeight: 'bold' }}>{vencidos} vencidos</span>
                    {' · '}
                    <span style={{ color: COLOR_ESTADO.proximo, fontWeight: 'bold' }}>{proximos} próximos a vencer</span>
                </p>
            )}

            {esAdmin && (
                <Link to="/elementosLimpieza" className={styles.linkCrear}>
                    <Boton variant="volver">
                        Ver todos los elementos
                    </Boton>
                </Link>
            )}

            <div className={styles.contenedorTabla} style={{ maxWidth: '900px' }}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '2fr 1.3fr 1.5fr 1.2fr' }}>
                    <div>Elemento</div>
                    <div>Estado</div>
                    <div>Vencimiento</div>
                    <div>Acciones</div>
                </div>

                {alertas.map((el) => (
                    <div key={el.id} className={styles.filaItem} style={{ gridTemplateColumns: '2fr 1.3fr 1.5fr 1.2fr' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>
                            {el.nombre}
                        </div>

                        <div>
                            <span
                                className={styles.badge}
                                style={{
                                    fontSize: '0.75rem',
                                    padding: '3px 10px',
                                    backgroundColor: COLOR_ESTADO[el.estado_recambio],
                                    color: '#ffffff'
                                }}
                            >
                                {ETIQUETA_ESTADO[el.estado_recambio]}
                            </span>
                        </div>

                        <div style={{ fontSize: '0.85rem' }}>
                            {textoRecambio(el)}
                        </div>

                        <div className={styles.grupoBotonesTabla}>
                            {esAdmin && (
                                <Boton variant="guardar" onClick={() => handleRecambio(el)}>
                                    Registrar recambio
                                </Boton>
                            )}
                        </div>
                    </div>
                ))}

                {!cargando && alertas.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)' }}>
                        No hay elementos vencidos ni próximos a vencer.
                    </div>
                )}

                {cargando && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)' }}>
                        Cargando alertas...
                    </div>
                )}
            </div>
        </div>
    );
}
