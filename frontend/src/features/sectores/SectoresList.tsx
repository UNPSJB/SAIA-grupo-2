import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Sector } from '../../types/sectores';
import { getSectores, deleteSector } from '../../services/sectoresServices';
import Boton from '../../components/Boton';
import ModalConfirmacion from '../../components/confirmacion';
import ModalAlerta from '../../components/alerta';
import styles from '../../styles/shared.module.css';

export default function SectoresList() {
    const [sectores, setSectores] = useState<Sector[]>([]);
    const [paginaActual, setPaginaActual] = useState(1);
    const sectoresPorPagina = 10;

    const [modalConfirmacion, setModalConfirmacion] = useState({ isOpen: false, idSeleccionado: 0 });
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });

    const cargarSectores = async () => {
        try {
            const data = await getSectores();
            setSectores(data);
        } catch (error) {
            console.error("Error de conexión:", error);
        }
    };

    useEffect(() => {
        cargarSectores();
    }, []);

    const solicitarEliminacion = (id: number) => {
        setModalConfirmacion({ isOpen: true, idSeleccionado: id });
    };

    const confirmarEliminacion = async () => {
        const id = modalConfirmacion.idSeleccionado;
        setModalConfirmacion({ isOpen: false, idSeleccionado: 0 });

        const exito = await deleteSector(id);
        
        if (exito) {
            cargarSectores();
            setModalAlerta({
                isOpen: true,
                titulo: "Operación Exitosa",
                mensaje: "El sector ha sido eliminado correctamente."
            });
        } else {
            setModalAlerta({
                isOpen: true,
                titulo: "Error al Eliminar",
                mensaje: "No se puede eliminar el sector. Verifique que no tenga dependencias activas."
            });
        }
    };

    const indiceUltimo = paginaActual * sectoresPorPagina;
    const indicePrimer = indiceUltimo - sectoresPorPagina;
    const sectoresActuales = sectores.slice(indicePrimer, indiceUltimo);
    const totalPaginas = Math.ceil(sectores.length / sectoresPorPagina);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Gestión de Sectores</h2>
            
            <Link to="/sectores/nuevo" className={styles.linkCrear}>
                <Boton variant="crear">
                    Registrar Sector
                </Boton>
            </Link>

            <div className={styles.contenedorTabla} style={{ maxWidth: '900px' }}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '2fr 2fr 1.5fr' }}>
                    <div>Nombre del Sector</div>
                    <div>Responsable / Encargado</div>
                    <div>Acciones</div>
                </div>

                {sectoresActuales.map((sec) => (
                    <div key={sec.id} className={styles.filaItem} style={{ gridTemplateColumns: '2fr 2fr 1.5fr' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-h)', justifyContent: 'flex-start', paddingLeft: '20px' }}>
                            {sec.nombre}
                        </div>
                        
                        <div style={{ color: 'var(--text)', justifyContent: 'flex-start', paddingLeft: '10px' }}>
                            {sec.responsable ? `${sec.responsable.nombre} ${sec.responsable.apellido}` : 'Sin asignar'}
                        </div>
                        
                        <div className={styles.grupoBotonesTabla}>
                            <Link to={`/sectores/${sec.id}`} title="Ver detalle">
                                <Boton variant="ver" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            <Link to={`/sectores/editar/${sec.id}`} title="Editar sector">
                                <Boton variant="editar" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            <span title="Eliminar sector">
                                <Boton 
                                    variant="eliminar" 
                                    onClick={() => solicitarEliminacion(sec.id)}
                                    style={{ padding: '8px 12px' }}
                                ></Boton>
                            </span>
                        </div>
                    </div>
                ))}

                {sectoresActuales.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)' }}>
                        No hay sectores registrados.
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

            <ModalConfirmacion
                isOpen={modalConfirmacion.isOpen}
                titulo="Confirmar Eliminación"
                mensaje="¿Seguro que deseas eliminar este sector de forma permanente?"
                onConfirm={confirmarEliminacion}
                onCancel={() => setModalConfirmacion({ isOpen: false, idSeleccionado: 0 })}
            />

            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={() => setModalAlerta({ ...modalAlerta, isOpen: false })}
            />
        </div>
    );
}