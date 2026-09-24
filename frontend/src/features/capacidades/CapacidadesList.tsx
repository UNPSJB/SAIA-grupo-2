import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Capacidad } from '../../types/capacidades';
import { getCapacidades, deleteCapacidad } from '../../services/capacidadesServices';
import Boton from '../../components/Boton';
import ModalConfirmacion from '../../components/confirmacion';
import ModalAlerta from '../../components/alerta';
import styles from '../../styles/shared.module.css';

export default function CapacidadesList() {
    const [capacidades, setCapacidades] = useState<Capacidad[]>([]);
    const [paginaActual, setPaginaActual] = useState(1);
    const capacidadesPorPagina = 10;

    const [modalConfirmacion, setModalConfirmacion] = useState({ isOpen: false, idSeleccionado: 0 });
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });

    const cargarCapacidades = async () => {
        try {
            const data = await getCapacidades();
            setCapacidades(data);
        } catch (error) {
            console.error("Error de conexión:", error);
        }
    };

    useEffect(() => {
        cargarCapacidades();
    }, []);

    const solicitarEliminacion = (id: number) => {
        setModalConfirmacion({ isOpen: true, idSeleccionado: id });
    };

    const confirmarEliminacion = async () => {
        const id = modalConfirmacion.idSeleccionado;
        setModalConfirmacion({ isOpen: false, idSeleccionado: 0 }); 

        const exito = await deleteCapacidad(id);
        
        if (exito) {
            cargarCapacidades();
            setModalAlerta({
                isOpen: true,
                titulo: "Operación Exitosa",
                mensaje: "La capacidad ha sido eliminada correctamente."
            });
        } else {
            setModalAlerta({
                isOpen: true,
                titulo: "Error al Eliminar",
                mensaje: "No se puede eliminar: Esta capacidad ya está asignada a uno o más empleados."
            });
        }
    };

    const indiceUltimo = paginaActual * capacidadesPorPagina;
    const indicePrimer = indiceUltimo - capacidadesPorPagina;
    const capacidadesActuales = capacidades.slice(indicePrimer, indiceUltimo);
    const totalPaginas = Math.ceil(capacidades.length / capacidadesPorPagina);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Gestión de Capacidades y Roles</h2>
            
            <Link to="/capacidades/nuevo" className={styles.linkCrear}>
                <Boton variant="crear">
                    Registrar Capacidad
                </Boton>
            </Link>

            <div className={styles.contenedorTabla} style={{ maxWidth: '800px' }}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '3fr 1fr' }}>
                    <div>Nombre del Rol / Capacidad</div>
                    <div>Acciones</div>
                </div>

                {capacidadesActuales.map((cap) => (
                    <div key={cap.id} className={styles.filaItem} style={{ gridTemplateColumns: '3fr 1fr' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-h)', justifyContent: 'flex-start', paddingLeft: '20px' }}>
                            {cap.nombre}
                        </div>
                        
                        <div className={styles.grupoBotonesTabla}>
                            <Boton 
                                variant="eliminar" 
                                onClick={() => solicitarEliminacion(cap.id)}
                                style={{ padding: '8px 12px' }}
                            ></Boton>
                        </div>
                    </div>
                ))}

                {capacidadesActuales.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)' }}>
                        No hay capacidades registradas.
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
                mensaje="¿Seguro que deseas eliminar de forma permanente esta capacidad?"
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