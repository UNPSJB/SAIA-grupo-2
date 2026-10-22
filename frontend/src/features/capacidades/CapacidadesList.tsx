import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Capacidad } from '../../types/capacidades';
import { getCapacidades, deleteCapacidad } from '../../services/capacidadesServices';
import Boton from '../../components/Boton';
import ModalConfirmacion from '../../components/confirmacion';
import ModalAlerta from '../../components/alerta';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/shared.module.css';

import BuscadorTexto from '../../components/BuscadorTexto';
import TablaPaginada, {type Columna } from '../../components/TablaPaginada';
import { filtrarPorTexto } from '../../utils/texto';



export default function CapacidadesList() {
    const { usuario } = useAuth();
    const [capacidades, setCapacidades] = useState<Capacidad[]>([]);
    const [busqueda, setBusqueda] = useState('');
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
    const capacidadesFiltradas = filtrarPorTexto(capacidades, busqueda, (c) => [c.nombre]);

    const indiceUltimo = paginaActual * capacidadesPorPagina;
    const indicePrimer = indiceUltimo - capacidadesPorPagina;
    const capacidadesActuales = capacidadesFiltradas.slice(indicePrimer, indiceUltimo);
    const totalPaginas = Math.ceil(capacidadesFiltradas.length / capacidadesPorPagina);


    const misColumnas: Columna<Capacidad>[]=[
        {
            key: 'nombre',
            encabezado: 'Nombre del Rol / Capacidad',
            ordenable: true,
            variant: 'titulo', // <--- Usamos el prop variant
            render: (capacidad)=> capacidad.nombre
        },

        {
            key: 'acciones',
            encabezado: 'Acciones',
            ordenable: false,
            render: (capacidad) => (
                <div className={styles.grupoBotonesTabla}>
                            {usuario?.rol === 'admin' && (
                                <Boton
                                    variant="eliminar"
                                    onClick={() => solicitarEliminacion(capacidad.id)}
                                    style={{ padding: '8px 12px' }}
                                ></Boton>
                            )}
                        </div>
            )
        }


    ]


    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Gestión de Capacidades y Roles</h2>
            

            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '1100px', marginBottom: '16px' }}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar capacidad..." />
            </div>
            {usuario?.rol === 'admin' && (
                <Link to="/capacidades/nuevo" className={styles.linkCrear}>
                    <Boton variant="crear">
                        Registrar Capacidad
                    </Boton>
                </Link>
            )}


                       <div style={{ maxWidth: '1100px', width: '100%' }}>
                            <TablaPaginada
                                datos={capacidadesFiltradas}
                                columnas={misColumnas}
                                gridTemplateColumns="1.5fr 1fr"
                                itemsPorPagina={5}
                                mensajeVacio="No se encontraron capacidades con los filtros actuales."
                                columnaOrdenInicial="nombre" 
                                ordenAscInicial={true}
                            />
                        </div>


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