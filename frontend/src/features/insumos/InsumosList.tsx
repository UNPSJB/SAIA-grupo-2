import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Insumo } from '../../types/insumos';
import { getInsumos, agregarStockInsumo } from '../../services/insumosServices';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/shared.module.css';

import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import EncabezadoPagina from '../../components/EncabezadoPagina';

export default function InsumosList() {
    const { usuario } = useAuth();
    const [insumos, setInsumos] = useState<Insumo[]>([]);
    const [busqueda, setBusqueda] = useState('');


    //nuevo
    //estados para el modal de sumar stock
    const [insumoSeleccionado, setInsumoSeleccionado] = useState<Insumo | null>(null);
    const [cantidadASumar, setCantidadASumar] = useState<string>('');
    const [guardandoStock, setGuardandoStock] = useState(false);

    //alerta por si hay algun error
    const [alerta, setAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });

 const cargarDatos = async () => {
        try {
            const data = await getInsumos();
            setInsumos(data);
        } catch (error) {
            console.error("Error al cargar insumos:", error);
        }
    };
    useEffect(() => {
        cargarDatos();
    }, []);
    const abrirModalStock = (insumo: Insumo) => {
        setInsumoSeleccionado(insumo);
        setCantidadASumar('');
    };
    const cerrarModalStock = () => {
        setInsumoSeleccionado(null);
        setCantidadASumar('');
    };
    const handleConfirmarStock = async (e: React.FormEvent) => {
        e.preventDefault();
        const gramos = parseFloat(cantidadASumar);
        if (isNaN(gramos) || gramos <= 0) {
            setAlerta({
                isOpen: true,
                titulo: "Cantidad inválida",
                mensaje: "Por favor ingresá una cantidad mayor a 0 gramos."
            });
            return;
        }
        if (!insumoSeleccionado) return;
        try {
            setGuardandoStock(true);
            await agregarStockInsumo(insumoSeleccionado.id, gramos);
            cerrarModalStock();
            await cargarDatos();
        } catch (error: any) {
            setAlerta({
                isOpen: true,
                titulo: "Error",
                mensaje: error.message || "No se pudo actualizar el stock."
            });
        } finally {
            setGuardandoStock(false);
        }
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
            render: (ins) => `${ins.cantidad ?? 0} g` // ahora todo pasaria a ser solo gramos asique no se bien que hacer con la unidad de abajo
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

                            {/* tiene el mismo icono que el crear insumo no se si esta bien eso */}
                            {usuario?.rol === 'admin' && (
                                <Boton 
                                    type="button"
                                    variant="crear" 
                                    title="Sumar cantidad en gramos"
                                    onClick={() => abrirModalStock(ins)}
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
                descripcion="Gestión y control de insumos disponibles, incluyendo detalles de cada insumo y su unidad de medida."
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
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>Sumar Stock</h3>
                        <p>
                            Insumo: <strong>{insumoSeleccionado.nombre}</strong><br />
                            Stock actual: <strong>{insumoSeleccionado.cantidad ?? 0} g</strong>
                        </p>
                        <form onSubmit={handleConfirmarStock}>
                            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                                <label className={styles.modalTituloCampo}>Cantidad a sumar (en gramos):</label>
                                <input
                                    type="number"
                                    min="0.1"
                                    step="any"
                                    required
                                    autoFocus
                                    placeholder="Ej: 500"
                                    value={cantidadASumar}
                                    onChange={(e) => setCantidadASumar(e.target.value)}
                                    style={{ width: '100%', marginTop: '8px' }}
                                />
                            </div>
                            <div className={styles.filaBotones}>
                                <Boton type="submit" variant="guardar" disabled={guardandoStock}>
                                    {guardandoStock ? "Guardando..." : "Sumar al Stock"}
                                </Boton>
                                <Boton type="button" variant="volver" onClick={cerrarModalStock}>
                                    Cancelar
                                </Boton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal de Alerta reutilizable */}
            <ModalAlerta
                isOpen={alerta.isOpen}
                titulo={alerta.titulo}
                mensaje={alerta.mensaje}
                onClose={() => setAlerta({ ...alerta, isOpen: false })}
            />
        </div>
    );
}