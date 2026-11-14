import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Insumo } from '../../types/insumos';
import type { UnidadMedida } from '../../types/unidadesMedida';
import { getInsumos } from '../../services/insumosServices';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';
import Boton from '../../components/Boton';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/shared.module.css';

import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import SumarStockModal from './SumarStockModal';
import { formatearStock } from './cantidades';

export default function InsumosList() {
    const { usuario } = useAuth();
    const [insumos, setInsumos] = useState<Insumo[]>([]);
    const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [insumoSeleccionado, setInsumoSeleccionado] = useState<Insumo | null>(null);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let cancelado = false;
        Promise.all([getInsumos(), getUnidadesMedida()])
            .then(([datosInsumos, datosUnidades]) => {
                if (cancelado) return;
                setInsumos(datosInsumos);
                setUnidades(datosUnidades);
            })
            .catch((error) => console.error("Error al cargar insumos:", error));
        return () => {
            cancelado = true;
        };
    }, [version]);

    const stockGuardado = () => {
        setInsumoSeleccionado(null);
        setVersion((v) => v + 1);
    };

    const insumosFiltrados = filtrarPorTexto(insumos, busqueda, (c) => [c.nombre, c.unidad_medida?.nombre]);

    const misColumnas: Columna<Insumo>[]=[
        {
            key:'nombre',
            encabezado: 'Nombre del Insumo',
            ordenable: true,
            render: (ins) => ins.nombre
        },
        {
            key: 'cantidad',
            encabezado: 'Stock Disponible',
            ordenable: true,
            render: (ins) => formatearStock(ins.cantidad, ins.unidad_medida.magnitud)
        },
        {
            key:'unidad_medida.nombre',
            encabezado: 'Unidad de Medida',
            ordenable: true,
            valorOrdenamiento: (ins) => ins.unidad_medida.nombre,
            render: (ins) => ins.unidad_medida.nombre
        },
         {
            key:'acciones',
            encabezado: 'Acciones',
            ordenable: false,
            render: (ins) => (
                 <div className={styles.grupoBotonesTabla}>
                            {usuario?.rol === 'admin' && (
                                <Boton
                                    type="button"
                                    variant="crear"
                                    title="Sumar stock"
                                    onClick={() => setInsumoSeleccionado(ins)}
                                >
                                </Boton>
                            )}
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
            <EncabezadoPagina
                titulo="Inventario de Insumos"
                descripcion="Gestión y control de insumos disponibles. El stock se lleva en gramos, o en litros para los líquidos."
                acciones={usuario?.rol === 'admin' && (
                    <Link to="/insumos/nuevo">
                        <Boton variant="crear">Registrar Insumo</Boton>
                    </Link>
                )}
            />


            <div className={styles.filaBotonesSuperiores}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar insumo..." />
            </div>

                       <div style={{ maxWidth: '1100px', width: '100%' }}>
                            <TablaPaginada
                                datos={insumosFiltrados}
                                columnas={misColumnas}
                                gridTemplateColumns="1.5fr 1fr 1fr 2fr"
                                itemsPorPagina={5}
                                mensajeVacio="No se encontraron Insumos con los filtros actuales."
                                columnaOrdenInicial="nombre"
                                ordenAscInicial={true}
                            />
                        </div>

            {insumoSeleccionado && (
                <SumarStockModal
                    insumo={insumoSeleccionado}
                    unidades={unidades}
                    onCerrar={() => setInsumoSeleccionado(null)}
                    onGuardado={stockGuardado}
                />
            )}
        </div>
    );
}
