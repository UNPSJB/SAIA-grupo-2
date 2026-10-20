import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Sector } from '../../types/sectores';
import { getSectores, deleteSector } from '../../services/sectoresServices';
import Boton from '../../components/Boton';
import ModalConfirmacion from '../../components/confirmacion';
import ModalAlerta from '../../components/alerta';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/shared.module.css';

import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';

import TablaPaginada, {type Columna } from '../../components/TablaPaginada';

export default function SectoresList() {
    const { usuario } = useAuth();
    const [sectores, setSectores] = useState<Sector[]>([]);
    const [busqueda, setBusqueda] = useState('');
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
    const sectoresFiltrados = filtrarPorTexto(sectores, busqueda, (c) => [c.nombre, c.responsable?.nombre, c.responsable?.apellido]);

    const indiceUltimo = paginaActual * sectoresPorPagina;
    const indicePrimer = indiceUltimo - sectoresPorPagina;
    const sectoresActuales = sectoresFiltrados.slice(indicePrimer, indiceUltimo);
    const totalPaginas = Math.ceil(sectoresFiltrados.length / sectoresPorPagina);


    const misColumnas: Columna<Sector>[] = [
        {
            key:'nombre',
            encabezado: 'Nombre del Sector',
            ordenable: true,
            variant: 'titulo',
            render: (sec) => sec.nombre
        },
        {
            key:'responsable',
            encabezado: 'Responsable/Encargado',
            ordenable: true,
            variant: 'badge',
            valorOrdenamiento: (sec) => sec.responsable ? `${sec.responsable.nombre} ${sec.responsable.apellido}` : 'ZZZ',
            render: (sec) => sec.responsable ? `${sec.responsable.nombre} ${sec.responsable.apellido}` : 'Sin asignar'
        },
        {
            key:'acciones',
            encabezado:'Acciones',
            ordenable:false,
            render: (sec)=> (
                <div className={styles.grupoBotonesTabla}>
                            <Link to={`/sectores/${sec.id}`} title="Ver detalle">
                                <Boton variant="ver" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            {usuario?.rol === 'admin' && (
                                <Link to={`/sectores/editar/${sec.id}`} title="Editar sector">
                                    <Boton variant="editar" style={{ padding: '8px 12px' }}></Boton>
                                </Link>
                            )}
                            {usuario?.rol === 'admin' && (
                                <span title="Eliminar sector">
                                    <Boton
                                        variant="eliminar"
                                        onClick={() => solicitarEliminacion(sec.id)}
                                        style={{ padding: '8px 12px' }}
                                    ></Boton>
                                </span>
                            )}
                        </div>
            )
        }

    ]



    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Gestión de Sectores</h2>
            

            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '1100px', marginBottom: '16px' }}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar sector o responsable..." />
            </div>
            {usuario?.rol === 'admin' && (
                <Link to="/sectores/nuevo" className={styles.linkCrear}>
                    <Boton variant="crear">
                        Registrar Sector
                    </Boton>
                </Link>
            )}

            <div style={{ maxWidth: '1100px', width: '100%' }}>
                 <TablaPaginada
                     datos={sectoresFiltrados}
                     columnas={misColumnas}
                     gridTemplateColumns="1.5fr 1fr 1fr "
                     itemsPorPagina={5}
                     mensajeVacio="No se encontraron capacidades con los filtros actuales."
                     columnaOrdenInicial="nombre" 
                     ordenAscInicial={true}
                 />
            </div>

            

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