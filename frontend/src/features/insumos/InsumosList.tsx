import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Insumo } from '../../types/insumos';
import { getInsumos } from '../../services/insumosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function InsumosList() {
    const [insumos, setInsumos] = useState<Insumo[]>([]);
    const [paginaActual, setPaginaActual] = useState(1);
    const insumosPorPagina = 10;

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getInsumos();
                setInsumos(data);
            } catch (error) {
                console.error("Error al cargar insumos:", error);
            }
        };
        cargarDatos();
    }, []);

    const indiceUltimo = paginaActual * insumosPorPagina;
    const indicePrimer = indiceUltimo - insumosPorPagina;
    const insumosActuales = insumos.slice(indicePrimer, indiceUltimo);
    const totalPaginas = Math.ceil(insumos.length / insumosPorPagina);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Inventario de Insumos</h2>
            
            <Link to="/insumos/nuevo" className={styles.linkCrear}>
                <Boton variant="crear">
                    Registrar Insumo
                </Boton>
            </Link>

            <div className={styles.contenedorTabla} style={{ maxWidth: '900px' }}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '2fr 2fr 1.5fr' }}>
                    <div>Nombre del Insumo</div>
                    <div>Unidad de Medida</div>
                    <div>Acciones</div>
                </div>

                {insumosActuales.map((ins) => (
                    <div key={ins.id} className={styles.filaItem} style={{ gridTemplateColumns: '2fr 2fr 1.5fr' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>
                            {ins.nombre}
                        </div>
                        
                        <div>
                            <span className={styles.badge} style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
                                {ins.unidad_medida.nombre}
                            </span>
                        </div>
                        
                        <div className={styles.grupoBotonesTabla}>
                            <Link to={`/insumos/editar/${ins.id}`} title="Editar insumo">
                                <Boton variant="editar" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            <Link to={`/insumos/${ins.id}`} title="Ver detalle">
                                <Boton variant="ver" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            <Link to={`/insumos/eliminar/${ins.id}`} title="Eliminar registro">
                                <Boton variant="eliminar" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                        </div>
                    </div>
                ))}

                {insumosActuales.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)' }}>
                        No hay insumos registrados.
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