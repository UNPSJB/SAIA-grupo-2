import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Equipo } from '../../types/equipos';
import { getEquipos } from '../../services/equiposServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function EquiposList() {
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [paginaActual, setPaginaActual] = useState(1);
    const equiposPorPagina = 5; 

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getEquipos();
                
                const datosOrdenados = data.sort((a, b) => {
                    if (a.activo === b.activo) return 0;
                    return a.activo ? -1 : 1;
                });
                
                setEquipos(datosOrdenados);
            } catch (error) {
                console.error("Error al cargar equipos:", error);
            }
        };
        cargarDatos();
    }, []);

    const indiceUltimo = paginaActual * equiposPorPagina;
    const indicePrimer = indiceUltimo - equiposPorPagina;
    const equiposActuales = equipos.slice(indicePrimer, indiceUltimo);
    const totalPaginas = Math.ceil(equipos.length / equiposPorPagina);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Inventario de Equipamiento</h2>
            
            <Link to="/equipos/nuevo" className={styles.linkCrear}>
                <Boton variant="crear">
                    Registrar Equipo
                </Boton>
            </Link>

            <div className={styles.contenedorTabla}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1.5fr' }}>
                    <div>Nombre del Equipo</div>
                    <div>Categoría</div>
                    <div>Sector</div>
                    <div>Sistema</div>
                    <div>Condición</div>
                    <div>Acciones</div>
                </div>

                {equiposActuales.map((eq) => (
                    <div key={eq.id} className={styles.filaItem} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1.5fr' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>
                            {eq.nombre}
                        </div>
                        
                        <div>
                            <span className={styles.badge} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                                {eq.tipo.nombre}
                            </span>
                        </div>
                        
                        <div>{eq.sector ? eq.sector.nombre : <span style={{ color: 'var(--text-muted)' }}>Sin asignar</span>}</div>

                        <div>
                            {eq.activo ? (
                                <span style={{ color: '#16a34a', fontWeight: '500' }}>Activo</span>
                            ) : (
                                <span style={{ color: '#6b7280', fontWeight: '500' }}>Inactivo</span>
                            )}
                        </div>

                        <div>
                            {eq.estado === 'bueno' ? (
                                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Bueno</span>
                            ) : (
                                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Dañado</span>
                            )}
                        </div>
                        
                        <div className={styles.grupoBotonesTabla}>
                            <Link to={`/equipos/editar/${eq.id}`} title="Editar equipo">
                                <Boton variant="editar" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            <Link to={`/equipos/${eq.id}`} title="Ver detalle">
                                <Boton variant="ver" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            <Link to={`/equipos/eliminar/${eq.id}`} title="Eliminar registro">
                                <Boton variant="eliminar" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                        </div>
                    </div>
                ))}

                {equiposActuales.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)' }}>
                        No hay equipos registrados.
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