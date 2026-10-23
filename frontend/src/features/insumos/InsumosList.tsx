import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Insumo } from '../../types/insumos';
import { getInsumos } from '../../services/insumosServices';
import Boton from '../../components/Boton';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/shared.module.css';

import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';

export default function InsumosList() {
    const { usuario } = useAuth();
    const [insumos, setInsumos] = useState<Insumo[]>([]);
    const [busqueda, setBusqueda] = useState('');

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
    const insumosFiltrados = filtrarPorTexto(insumos, busqueda, (c) => [c.nombre, c.unidad_medida?.nombre]);

    const misColumnas: Columna<Insumo>[]=[
        {
            key:'nombre',
            encabezado: 'Nombre del Insumo',
            ordenable: true,
            render: (ins) => ins.nombre
        },
        {
            key:'unidad_medida.nombre',
            encabezado: 'Unidad de Medida',
            ordenable: true,
            render: (ins) => ins.unidad_medida.nombre
        },
         {
            key:'acciones',
            encabezado: 'Acciones',
            ordenable: false,
            render: (ins) => (
                 <div className={styles.grupoBotonesTabla}>
                            {usuario?.rol === 'admin' && (
                                <Link to={`/insumos/editar/${ins.id}`} title="Editar insumo">
                                    <Boton variant="editar" style={{ padding: '8px 12px' }}></Boton>
                                </Link>
                            )}
                            <Link to={`/insumos/${ins.id}`} title="Ver detalle">
                                <Boton variant="ver" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            {usuario?.rol === 'admin' && (
                                <Link to={`/insumos/eliminar/${ins.id}`} title="Eliminar registro">
                                    <Boton variant="eliminar" style={{ padding: '8px 12px' }}></Boton>
                                </Link>
                            )}
                        </div>
            )
        }
    ]

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Inventario de Insumos</h2>
            

            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '1100px', marginBottom: '16px' }}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar insumo..." />
            </div>
            {usuario?.rol === 'admin' && (
                <Link to="/insumos/nuevo" className={styles.linkCrear}>
                    <Boton variant="crear">
                        Registrar Insumo
                    </Boton>
                </Link>
            )}

                       <div style={{ maxWidth: '1100px', width: '100%' }}>
                            <TablaPaginada
                                datos={insumosFiltrados}
                                columnas={misColumnas}
                                gridTemplateColumns="1fr 2fr 1.5fr"
                                itemsPorPagina={5}
                                mensajeVacio="No se encontraron Insumos con los filtros actuales."
                                columnaOrdenInicial="nombre" 
                                ordenAscInicial={true}
                            />
                        </div>

        </div>
    );
}