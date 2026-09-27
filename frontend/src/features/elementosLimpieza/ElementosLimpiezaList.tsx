import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { ElementoLimpieza } from '../../types/elementosLimpieza';
import { getElementosLimpieza, registrarRecambio } from '../../services/elementosLimpiezaServices';
import { COLOR_ESTADO, ETIQUETA_ESTADO, textoRecambio } from './estadoRecambio';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function ElementosLimpiezaList() {
    const [elementos, setElementos] = useState<ElementoLimpieza[]>([]);
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 10;

    const cargarDatos = async () => {
        try {
            const data = await getElementosLimpieza();
            setElementos(data);
        } catch (error) {
            console.error("Error al cargar elementos de limpieza:", error);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const handleRecambio = async (elemento: ElementoLimpieza) => {
        const exito = await registrarRecambio(String(elemento.id));
        if (exito) {
            cargarDatos();
        } else {
            alert('Hubo un error al registrar el recambio.');
        }
    };

    const indiceUltimo = paginaActual * elementosPorPagina;
    const indicePrimer = indiceUltimo - elementosPorPagina;
    const elementosActuales = elementos.slice(indicePrimer, indiceUltimo);
    const totalPaginas = Math.ceil(elementos.length / elementosPorPagina);

    const conAlerta = elementos.filter(
        e => e.estado_recambio === 'vencido' || e.estado_recambio === 'proximo'
    ).length;

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Elementos de Limpieza</h2>

            {conAlerta > 0 && (
                <p style={{ marginTop: '-10px', marginBottom: '20px', color: COLOR_ESTADO.vencido, fontWeight: 'bold' }}>
                    {conAlerta} {conAlerta === 1 ? 'elemento requiere' : 'elementos requieren'} atención
                </p>
            )}

            <div className={styles.filaBotones} style={{ justifyContent: 'center', marginBottom: '20px' }}>
                <Link to="/elementosLimpieza/nuevo">
                    <Boton variant="crear">Registrar Elemento</Boton>
                </Link>
                <Link to="/elementosLimpieza/alertas">
                    <Boton variant="ver">Ver Alertas de Recambio</Boton>
                </Link>
            </div>

            <div className={styles.contenedorTabla} style={{ maxWidth: '1000px' }}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '2fr 1.2fr 1.2fr 1.4fr 1.6fr' }}>
                    <div>Nombre</div>
                    <div>Frecuencia</div>
                    <div>Estado</div>
                    <div>Vencimiento</div>
                    <div>Acciones</div>
                </div>

                {elementosActuales.map((el) => (
                    <div key={el.id} className={styles.filaItem} style={{ gridTemplateColumns: '2fr 1.2fr 1.2fr 1.4fr 1.6fr' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>
                            {el.nombre}
                        </div>

                        <div style={{ fontSize: '0.85rem' }}>
                            {el.frecuencia_recambio_dias !== null
                                ? `Cada ${el.frecuencia_recambio_dias} días`
                                : <span style={{ opacity: 0.6 }}>No definida</span>}
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
                            {el.frecuencia_recambio_dias !== null && (
                                <Boton
                                    variant="guardar"
                                    style={{ padding: '8px 12px' }}
                                    onClick={() => handleRecambio(el)}
                                >
                                </Boton>
                            )}
                            <Link to={`/elementosLimpieza/editar/${el.id}`} title="Editar elemento">
                                <Boton variant="editar" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            <Link to={`/elementosLimpieza/${el.id}`} title="Ver detalle">
                                <Boton variant="ver" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            <Link to={`/elementosLimpieza/eliminar/${el.id}`} title="Eliminar registro">
                                <Boton variant="eliminar" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                        </div>
                    </div>
                ))}

                {elementosActuales.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)' }}>
                        No hay elementos de limpieza registrados.
                    </div>
                )}
            </div>

            {totalPaginas > 1 && (
                <div className={styles.filaBotones} style={{ alignItems: 'center', marginTop: '30px', justifyContent: 'center' }}>
                    <Boton variant="volver" onClick={() => setPaginaActual(p => p - 1)} disabled={paginaActual === 1}>
                        Anterior
                    </Boton>
                    <span style={{ color: 'var(--text-h)', fontWeight: 'bold', margin: '0 15px' }}>
                        Página {paginaActual} de {totalPaginas}
                    </span>
                    <Boton variant="siguiente" onClick={() => setPaginaActual(p => p + 1)} disabled={paginaActual === totalPaginas}>
                        Siguiente
                    </Boton>
                </div>
            )}
        </div>
    );
}
