import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import type { LoteProduccion } from '../../types/lotesProduccion';
import type { Producto } from '../../types/productos';
import { crearLote } from '../../services/lotesProduccionServices';
import { getProductos } from '../../services/productosServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
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

        return () => {
            cancelado = true;
        };
    }, []);

    const hoy = hoyLocal();
    const productoElegido = productos?.find((producto) => String(producto.id) === productoId) ?? null;
    const unidad = productoElegido?.unidad_medida.nombre.toLowerCase();

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

        try {
            setGuardando(true);
            const lote = await crearLote({
                producto_id: productoElegido.id,
                fecha,
                cantidad: Number(cantidad),
            });
            setLoteRegistrado(lote);
            setCantidad('');
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
        </div>
    );
}
