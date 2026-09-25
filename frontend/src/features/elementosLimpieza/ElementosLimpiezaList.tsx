import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { ElementoLimpieza } from '../../types/elementosLimpieza';
import { getElementosLimpieza } from '../../services/elementosLimpiezaServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function ElementosLimpiezaList() {
    const [elementos, setElementos] = useState<ElementoLimpieza[]>([]);
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 10;

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getElementosLimpieza();
                setElementos(data);
            } catch (error) {
                console.error("Error al cargar elementos de limpieza:", error);
            }
        };
        cargarDatos();
    }, []);

    const indiceUltimo = paginaActual * elementosPorPagina;
    const indicePrimer = indiceUltimo - elementosPorPagina;
    const elementosActuales = elementos.slice(indicePrimer, indiceUltimo);
    const totalPaginas = Math.ceil(elementos.length / elementosPorPagina);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Elementos de Limpieza</h2>

            <Link to="/elementosLimpieza/nuevo" className={styles.linkCrear}>
                <Boton variant="crear">
                    Registrar Elemento
                </Boton>
            </Link>

            <div className={styles.contenedorTabla} style={{ maxWidth: '900px' }}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '2fr 2fr 1.5fr' }}>
                    <div>Nombre del Elemento</div>
                    <div>Frecuencia de Recambio</div>
                    <div>Acciones</div>
                </div>

                {elementosActuales.map((el) => (
                    <div key={el.id} className={styles.filaItem} style={{ gridTemplateColumns: '2fr 2fr 1.5fr' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>
                            {el.nombre}
                        </div>

                        <div>
                            {el.frecuencia_recambio_dias !== null ? (
                                <span className={styles.badge} style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
                                    Cada {el.frecuencia_recambio_dias} días
                                </span>
                            ) : (
                                <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>No definida</span>
                            )}
                        </div>

                        <div className={styles.grupoBotonesTabla}>
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
