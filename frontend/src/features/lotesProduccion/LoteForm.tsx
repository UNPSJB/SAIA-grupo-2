import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import type { EstadoLoteDesdeReceta, LoteProduccion } from '../../types/lotesProduccion';
import type { Producto } from '../../types/productos';
import type { Insumo } from '../../types/insumos';
import type { UnidadMedida } from '../../types/unidadesMedida';

import { crearLote } from '../../services/lotesProduccionServices';
import { getProductos } from '../../services/productosServices';
import { getInsumos } from '../../services/insumosServices';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import NuevoProductoModal from '../productos/NuevoProductoModal';
import { ETIQUETA_TIPO_PRODUCTO, hoyLocal } from '../productos/formatoProducto';
import { convertirABase, formatearStock } from '../insumos/cantidades';
import LoteDetalleModal from './LoteDetalleModal';
import AgregarInsumoLote, { type InsumoElegido } from './AgregarInsumoLote';
import ListaInsumosLote from './ListaInsumosLote';
import estilosInsumos from './InsumosLote.module.css';
import styles from '../../styles/shared.module.css';

interface InsumoLoteFormulario extends InsumoElegido{
    unidadNombre: string;
    cantidadReceta?: number;
}

interface Errores {
    productoId?: string;
    fecha?: string;
    cantidad?: string;
    insumos?: string;
}

const estiloError = { borderColor: '#ef4444', outline: 'none' };
const estiloMensaje = { color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' };

export default function LoteForm() {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'admin';
    const navigate = useNavigate();
    const location = useLocation();
    const [parametros] = useSearchParams();
    const precargaReceta = (location.state as EstadoLoteDesdeReceta | null) ?? null;
    const precargaAplicadaRef = useRef(false);

    const [productos, setProductos] = useState<Producto[] | null>(null);
    const [errorCarga, setErrorCarga] = useState(false);
    const [productoId, setProductoId] = useState(
        precargaReceta ? String(precargaReceta.producto_id) : parametros.get('producto') ?? ''
    );
    const [fecha, setFecha] = useState(hoyLocal);
    const [cantidad, setCantidad] = useState(
        precargaReceta?.cantidad != null ? String(precargaReceta.cantidad) : ''
    );

    const [recetaId, setRecetaId] = useState<number | null>(precargaReceta?.receta_id ?? null);
    const [recetaVersionId, setRecetaVersionId] = useState<number | null>(precargaReceta?.receta_version_id ?? null);
    const [factorEscalado, setFactorEscalado] = useState<number | null>(precargaReceta?.factor_escalado ?? null);

    const [errores, setErrores] = useState<Errores>({});
    const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [creandoProducto, setCreandoProducto] = useState(false);
    const [loteRegistrado, setLoteRegistrado] = useState<LoteProduccion | null>(null);

    const [catalogoInsumos, setCatalogoInsumos] = useState<Insumo[]>([]);
    const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
    const [insumosAgregados, setInsumosAgregados] = useState<InsumoLoteFormulario[]>([]);
    const [versionInsumos, setVersionInsumos] = useState(0);


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

    useEffect(() => {
        let cancelado = false;
        Promise.all([getInsumos(), getUnidadesMedida()])
            .then(([datosInsumos, datosUnidades]) => {
                if (cancelado) return;
                const activos = datosInsumos.filter((insumo) => insumo.activo);
                setCatalogoInsumos(activos);
                setUnidades(datosUnidades);

                if (precargaReceta && !precargaAplicadaRef.current) {
                    precargaAplicadaRef.current = true;
                    const itemsPrecargados: InsumoLoteFormulario[] = [];

                    for (const item of precargaReceta.insumos){
                        const insumo = activos.find((i) => i.id === item.insumo_id);
                        const unidad = datosUnidades.find((u) => u.id === item.unidad_medida_id);
                        if (!insumo || !unidad) continue;

                        itemsPrecargados.push({
                            insumo,
                            cantidad: item.cantidad_utilizada,
                            unidadMedidaId: unidad.id,
                            unidadNombre: unidad.nombre,
                            cantidadBase: convertirABase(item.cantidad_utilizada, unidad),
                            cantidadReceta: item.cantidad_utilizada
                        });
                    }
                    setInsumosAgregados(itemsPrecargados);
                }
            })
            .catch((problema) => console.error('Error al cargar insumos:', problema));
        return () => {
            cancelado = true;
        };
    }, [versionInsumos, precargaReceta]);

    const hoy = hoyLocal();
    const productoElegido = productos?.find((producto) => String(producto.id) === productoId) ?? null;
    const unidad = productoElegido?.unidad_medida.nombre.toLowerCase();

    const cantidadProductoDifiere = 
        precargaReceta?.cantidad != null &&
        recetaVersionId !== null &&
        cantidad.trim() !== '' &&
        !Number.isNaN(Number(cantidad)) &&
        Math.abs(Number(cantidad) - precargaReceta.cantidad) > 0.0001;

    const cambiarCantidadInsumo = (insumoId: number, nuevaCantidad: number) => {
        setInsumosAgregados((actuales) =>
            actuales.map((item) => {
                if (item.insumo.id !== insumoId) return item;
                const unidadItem = unidades.find((u) => u.id === item.unidadMedidaId);
                const cantidadValida = Number.isFinite(nuevaCantidad) && nuevaCantidad >= 0 ? nuevaCantidad : 0;
                return {
                    ...item,
                    cantidad: cantidadValida,
                    cantidadBase: unidadItem ? convertirABase(cantidadValida, unidadItem) : cantidadValida
                };
            }),    
        );
        setErrores((prev) => ({ ...prev, insumos: undefined}));
    };


    const quitarInsumo = (insumoId: number) => {
        setInsumosAgregados((actuales) => actuales.filter((item) => item.insumo.id !== insumoId));
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

        const insumoInvalido = insumosAgregados.find(
            (item) => !(item.cantidad > 0) || item.cantidadBase > item.insumo.cantidad
        );
        if (insumoInvalido){
            if(!(insumoInvalido.cantidad > 0)){
                nuevos.insumos= `La cantidad de ${insumoInvalido.insumo.nombre} debe ser mayor a 0`;
            } else {
                nuevos.insumos = `No hay stock suficiente de ${insumoInvalido.insumo.nombre}. Disponible: ${formatearStock(
                    insumoInvalido.insumo.cantidad,
                    insumoInvalido.insumo.unidad_medida.magnitud
                )}`;
            }
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
                receta_id: recetaId,
                receta_version_id: recetaVersionId,
                factor_escalado: recetaVersionId != null ? factorEscalado : null,
                insumos: insumosAgregados.map((item) => ({
                    insumo_id: item.insumo.id,
                    cantidad_utilizada: item.cantidad,
                    unidad_medida_id: item.unidadMedidaId,
            
                })),
            });
            setLoteRegistrado(lote);
            setCantidad('');
            setRecetaId(null);
            setRecetaVersionId(null);
            setFactorEscalado(null);
            setInsumosAgregados([]);
            setVersionInsumos((v) => v + 1);
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
        setRecetaId(null);
        setRecetaVersionId(null);
        setFactorEscalado(null);
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

                {factorEscalado != null && (
                    <div className={estilosInsumos.bannerReceta} role="status">
                        Precargado desde receta escalada (<strong>factor x{factorEscalado}</strong> · rendimiento esperado:{' '}
                        <strong>{precargaReceta?.rendimiento_gramos} g</strong>).
                        Podés ajustar las cantidades antes de registrar el lote.
                    </div>
                )}

                <div className={styles.formGroup}>
                    <label htmlFor="lote-producto">Producto:</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                        <select
                            id="lote-producto"
                            value={productoId}
                            onChange={(evento) => {
                                setProductoId(evento.target.value);
                                setRecetaId(null);
                                setRecetaVersionId(null);
                                setFactorEscalado(null);
                            }}
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

                        {cantidadProductoDifiere && (
                            <span className={estilosInsumos.avisoDiferencia} style={{ marginTop: '4px' }} role="status">
                                Difiere de la receta. Escalado: {precargaReceta?.cantidad}{unidad ? ` ${unidad}` : ''}
                            </span>
                        )}
                    </div>
                </div>


                <section className={estilosInsumos.seccion} aria-labelledby="titulo-insumos-lote">
                    <div className={estilosInsumos.encabezadoSeccion}>
                        <h3 id="titulo-insumos-lote">Insumos utilizados</h3>
                    </div>
                    <AgregarInsumoLote
                        insumos={catalogoInsumos}
                        unidades={unidades}
                        yaAgregados={insumosAgregados.map((item) => item.insumo.id)}
                        onAgregar={(elegido) => {
                            const unidadElegida = unidades.find((u) => u.id === elegido.unidadMedidaId);
                            setInsumosAgregados((actuales) => [
                                ...actuales,
                                {
                                    ...elegido,
                                    unidadNombre: unidadElegida?.nombre ?? ''
                                },
                            ]);
                        }}
                    />
                    <ListaInsumosLote
                        items={insumosAgregados.map((item) => ({
                            insumoId: item.insumo.id,
                            nombre: item.insumo.nombre,
                            cantidadBase: item.cantidadBase,
                            magnitud: item.insumo.unidad_medida.magnitud,
                            editable: item.cantidadReceta !== undefined,
                            cantidad: item.cantidad,
                            cantidadReceta: item.cantidadReceta,
                            unidadNombre: item.unidadNombre,
                            stockDisponibleBase: item.insumo.cantidad,
                        }))}
                        mensajeVacio="Opcional: agregá los insumos que se usaron. Se descuentan del stock al registrar el lote."
                        onCambiarCantidad={cambiarCantidadInsumo}
                        onQuitar={quitarInsumo}
                    />
                    {errores.insumos && (
                        <p className={estilosInsumos.errorRenglon} style={{ marginTop: '8px' }} role="alert">
                            {errores.insumos}
                        </p>
                    )}
                    {insumosAgregados.length > 0 && (
                        <p className={estilosInsumos.nota}>
                            Al registrar el lote se descuentan del stock. El consumo se puede corregir hasta cerrar el lote
                            (como máximo, al terminar el día); después queda fijo.
                        </p>
                    )}
                </section>

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
                    onActualizado={() => setVersionInsumos((v) => v + 1)}
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
