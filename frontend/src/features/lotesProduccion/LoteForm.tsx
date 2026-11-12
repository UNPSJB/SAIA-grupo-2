import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import type { LoteProduccion } from '../../types/lotesProduccion';
import type { Producto } from '../../types/productos';
import type { Insumo } from '../../types/insumos';

import { crearLote, asociarInsumoALote } from '../../services/lotesProduccionServices';
import { getProductos } from '../../services/productosServices';
import { getInsumos } from '../../services/insumosServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import NuevoProductoModal from '../productos/NuevoProductoModal';
import { ETIQUETA_TIPO_PRODUCTO, hoyLocal } from '../productos/formatoProducto';
import LoteDetalleModal from './LoteDetalleModal';
import styles from '../../styles/shared.module.css';

interface Errores {
    productoId?: string;
    fecha?: string;
    cantidad?: string;
}


//estructura para los insumos
interface InsumoTemporal {
    insumo_id: number;
    nombre: string;
    cantidad_utilizada: number;
    stock_disponible: number;
}

const estiloError = { borderColor: '#ef4444', outline: 'none' };
const estiloMensaje = { color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' };

export default function LoteForm() {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'admin';
    const navigate = useNavigate();
    const [parametros] = useSearchParams();

    const [productos, setProductos] = useState<Producto[] | null>(null);
    const [errorCarga, setErrorCarga] = useState(false);
    const [productoId, setProductoId] = useState(parametros.get('producto') ?? '');
    const [fecha, setFecha] = useState(hoyLocal);
    const [cantidad, setCantidad] = useState('');

    const [errores, setErrores] = useState<Errores>({});
    const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [creandoProducto, setCreandoProducto] = useState(false);
    const [loteRegistrado, setLoteRegistrado] = useState<LoteProduccion | null>(null);



    // estados para los insumos
    const [catalogoInsumos, setCatalogoInsumos] = useState<Insumo[]>([]);
    const [insumosAgregados, setInsumosAgregados] = useState<InsumoTemporal[]>([]);
    const [insumoSeleccionadoId, setInsumoSeleccionadoId] = useState('');
    const [gramosInsumo, setGramosInsumo] = useState('');
    const [alerta, setAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });


    useEffect(() => {
        let cancelado = false;

        getProductos()
            .then((datos) => {
                if (!cancelado) setProductos(datos);
            })
            .catch((problema) => {
                console.error('Error al cargar los productos:', problema);
                if (!cancelado) {
                    setProductos([]);
                    setErrorCarga(true);
                }
            });


            //carga de insumos
        getInsumos()
            .then((datos) => {
                if (!cancelado) {
                    setCatalogoInsumos(datos.filter((i) => i.activo !== false));
                }
            })
            .catch((err) => console.error('Error al cargar insumos:', err));


        return () => {
            cancelado = true;
        };
    }, []);

    const hoy = hoyLocal();
    const productoElegido = productos?.find((producto) => String(producto.id) === productoId) ?? null;
    const unidad = productoElegido?.unidad_medida.nombre.toLowerCase();


    // agregar insumos
    const handleAgregarInsumo = () => {
        const idNum = Number(insumoSeleccionadoId);
        const gramos = parseFloat(gramosInsumo);
        if (!insumoSeleccionadoId) {
            setAlerta({ isOpen: true, titulo: "Atención", mensaje: "Seleccioná un insumo de la lista." });
            return;
        }
        if (isNaN(gramos) || gramos <= 0) {
            setAlerta({ isOpen: true, titulo: "Cantidad inválida", mensaje: "La cantidad debe ser mayor a 0 gramos." });
            return;
        }
        const insumoReal = catalogoInsumos.find((i) => i.id === idNum);
        if (!insumoReal) return;
        // Validamos si ya fue agregado a la lista del formulario
        if (insumosAgregados.some((i) => i.insumo_id === idNum)) {
            setAlerta({ isOpen: true, titulo: "Insumo repetido", mensaje: "Este insumo ya está en la lista. Si querés cambiar la cantidad, quitalo y volvelo a agregar." });
            return;
        }
        //calido que haya la cantidad solicitada
        const stockActual = insumoReal.cantidad || 0;
        if (gramos > stockActual) {
            setAlerta({
                isOpen: true,
                titulo: "Stock insuficiente",
                mensaje: `No podés usar ${gramos}g de "${insumoReal.nombre}" porque solo hay ${stockActual}g disponibles en stock.`
            });
            return;
        }
        // si esta todo bien lo sumo
        setInsumosAgregados([
            ...insumosAgregados,
            {
                insumo_id: insumoReal.id,
                nombre: insumoReal.nombre,
                cantidad_utilizada: gramos,
                stock_disponible: stockActual
            }
        ]);
        setInsumoSeleccionadoId('');
        setGramosInsumo('');
    };
    // Función para quitar un insumo de la lista antes de guardar
    const handleQuitarInsumo = (insumoId: number) => {
        setInsumosAgregados(insumosAgregados.filter((i) => i.insumo_id !== insumoId));
    };




    const validar = (): Errores => {
        const nuevos: Errores = {};

        if (!productoElegido) {
            nuevos.productoId = 'Debe seleccionar un producto';
        }

        if (!fecha) {
            nuevos.fecha = 'La fecha es obligatoria';
        } else if (fecha > hoy) {
            nuevos.fecha = 'La fecha no puede ser posterior a hoy';
        }

        const cantidadNumero = Number(cantidad);
        if (cantidad.trim() === '' || Number.isNaN(cantidadNumero)) {
            nuevos.cantidad = 'La cantidad es obligatoria';
        } else if (cantidadNumero <= 0) {
            nuevos.cantidad = 'La cantidad debe ser mayor a 0';
        }

        return nuevos;
    };

    const handleSubmit = async (evento: FormEvent) => {
        evento.preventDefault();

        const nuevosErrores = validar();
        setErrores(nuevosErrores);
        setErrorGuardado(null);
        if (Object.keys(nuevosErrores).length > 0 || !productoElegido) return;



        for (const item of insumosAgregados) {
            if (item.cantidad_utilizada > item.stock_disponible) {
                setAlerta({
                    isOpen: true,
                    titulo: "Stock insuficiente",
                    mensaje: `El insumo ${item.nombre} no tiene stock suficiente para crear el lote.`
                });
                return;
            }
        }


        try {
            setGuardando(true);
            const lote = await crearLote({
                producto_id: productoElegido.id,
                fecha,
                cantidad: Number(cantidad),
            });



            //asociacion de los insumos
            for (const item of insumosAgregados) {
                await asociarInsumoALote(lote.nro_lote, {
                    insumo_id: item.insumo_id,
                    cantidad_utilizada: item.cantidad_utilizada
                });
            }

            setLoteRegistrado(lote);
            setCantidad('');
            setInsumosAgregados([]);
        } catch (error) {
            console.error('Error al registrar el lote:', error);
            setErrorGuardado(error instanceof Error ? error.message : 'No se pudo registrar el lote.');
        } finally {
            setGuardando(false);
        }
    };

    const alCrearProducto = (producto: Producto) => {
        setProductos((actuales) =>
            [...(actuales ?? []), producto].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        );
        setProductoId(String(producto.id));
        setErrores((actuales) => ({ ...actuales, productoId: undefined }));
        setCreandoProducto(false);
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Registrar Lote de Producción"
                descripcion="Asentá qué producto se elaboró, en qué fecha y cuánto. Si el producto todavía no existe, podés crearlo desde acá."
                ancho="700px"
                acciones={
                    esAdmin && (
                        <Link to="/lotes-produccion">
                            <Boton variant="ver">Ver historial</Boton>
                        </Link>
                    )
                }
            />

            <form
                onSubmit={handleSubmit}
                className={styles.formularioTarjeta}
                style={{ maxWidth: '700px' }}
                noValidate
            >
                {errorCarga && (
                    <p style={{ color: '#ef4444', marginTop: 0 }}>No se pudieron cargar los productos.</p>
                )}

                <div className={styles.formGroup}>
                    <label htmlFor="lote-producto">Producto:</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                        <select
                            id="lote-producto"
                            value={productoId}
                            onChange={(evento) => setProductoId(evento.target.value)}
                            style={{ flex: '1 1 260px', width: 'auto', ...(errores.productoId ? estiloError : {}) }}
                            disabled={productos === null}
                        >
                            <option value="">
                                {productos === null
                                    ? 'Cargando productos…'
                                    : productos.length === 0
                                      ? 'No hay productos cargados'
                                      : 'Seleccione un producto'}
                            </option>
                            {(productos ?? []).map((producto) => (
                                <option key={producto.id} value={String(producto.id)}>
                                    {producto.nombre}
                                </option>
                            ))}
                        </select>
                        <Boton variant="crear" onClick={() => setCreandoProducto(true)}>
                            Nuevo producto
                        </Boton>
                    </div>
                    {errores.productoId && <span style={estiloMensaje}>{errores.productoId}</span>}
                    {productoElegido && (
                        <span className={styles.textMuted} style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                            {ETIQUETA_TIPO_PRODUCTO[productoElegido.tipo]} · se mide en{' '}
                            {productoElegido.unidad_medida.nombre.toLowerCase()}
                        </span>
                    )}
                </div>

                <div className={styles.formGrid} style={{ marginTop: '16px' }}>
                    <div className={styles.formGroup}>
                        <label htmlFor="lote-fecha">Fecha de producción:</label>
                        <input
                            id="lote-fecha"
                            type="date"
                            className={`${styles.filtroFecha} ${errores.fecha ? styles.filtroFechaError : ''}`}
                            value={fecha}
                            max={hoy}
                            onChange={(evento) => setFecha(evento.target.value)}
                        />
                        {errores.fecha && <span style={estiloMensaje}>{errores.fecha}</span>}
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="lote-cantidad">
                            Cantidad producida{unidad ? ` (${unidad})` : ''}:
                        </label>
                        <input
                            id="lote-cantidad"
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Ej: 48"
                            value={cantidad}
                            onChange={(evento) => setCantidad(evento.target.value)}
                            style={errores.cantidad ? estiloError : {}}
                        />
                        {errores.cantidad && <span style={estiloMensaje}>{errores.cantidad}</span>}
                    </div>
                </div>


                {/* zona de agregar insumos */}
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '24px 0 16px' }} />
                
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 12px 0' }}>Insumos utilizados en la elaboración</h3>
                
                <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
                        <div>
                            <label className={styles.modalTituloCampo} style={{ fontSize: '0.85rem' }}>Insumo:</label>
                            <select
                                className={styles.modalSelector}
                                value={insumoSeleccionadoId}
                                onChange={(e) => setInsumoSeleccionadoId(e.target.value)}
                                style={{ marginTop: '4px' }}
                            >
                                <option value="">Seleccione insumo...</option>
                                {catalogoInsumos.map((ins) => (
                                    <option key={ins.id} value={ins.id}>
                                        {ins.nombre} ({ins.cantidad ?? 0}g disponibles)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={styles.modalTituloCampo} style={{ fontSize: '0.85rem' }}>Gramos:</label>
                            <input
                                type="number"
                                min="0.1"
                                step="any"
                                placeholder="Ej: 250"
                                value={gramosInsumo}
                                onChange={(e) => setGramosInsumo(e.target.value)}
                                style={{ marginTop: '4px', width: '100%' }}
                            />
                        </div>
                        <Boton type="button" variant="crear" onClick={handleAgregarInsumo}>
                            Agregar
                        </Boton>
                    </div>
                    {/*lista de insumos que se van sumando */}
                    {insumosAgregados.length > 0 ? (
                        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {insumosAgregados.map((item) => (
                                <div
                                    key={item.insumo_id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '6px 12px',
                                        background: 'var(--card-bg)',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)'
                                    }}
                                >
                                    <span style={{ fontSize: '0.9rem' }}>
                                        <strong>{item.nombre}</strong>: {item.cantidad_utilizada} g 
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '8px' }}>
                                            (de {item.stock_disponible}g en stock)
                                        </span>
                                    </span>
                                    <Boton
                                        type="button"
                                        variant="eliminar"
                                        title="Quitar de la lista"
                                        onClick={() => handleQuitarInsumo(item.insumo_id)}
                                    >
                                        Quitar
                                    </Boton>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '12px 0 0', fontStyle: 'italic' }}>
                            No se agregaron insumos todavía (opcional).
                        </p>
                    )}
                </div>




                {errorGuardado && (
                    <p role="alert" style={{ color: '#ef4444', margin: '16px 0 0' }}>
                        {errorGuardado}
                    </p>
                )}

                <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                    <Boton type="submit" variant="guardar" disabled={guardando}>
                        {guardando ? 'Registrando...' : 'Registrar lote'}
                    </Boton>
                    <Boton variant="eliminar" onClick={() => navigate(esAdmin ? '/lotes-produccion' : '/')}>
                        Cancelar
                    </Boton>
                </div>
            </form>

            {creandoProducto && (
                <NuevoProductoModal onCreado={alCrearProducto} onClose={() => setCreandoProducto(false)} />
            )}

            {loteRegistrado && (
                <LoteDetalleModal
                    lote={loteRegistrado}
                    subtitulo="Lote registrado correctamente."
                    onClose={() => setLoteRegistrado(null)}
                    acciones={
                        esAdmin && (
                            <Link to="/lotes-produccion">
                                <Boton variant="ver">Ir al historial</Boton>
                            </Link>
                        )
                    }
                />
            )}
            <ModalAlerta
                isOpen={alerta.isOpen}
                titulo={alerta.titulo}
                mensaje={alerta.mensaje}
                onClose={() => setAlerta({ ...alerta, isOpen: false })}
            />
        </div>
    );
}
