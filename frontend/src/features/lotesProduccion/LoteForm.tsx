import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import type { EstadoLoteDesdeReceta, InsumoUtilizadoPayload, LoteProduccion } from '../../types/lotesProduccion';
import type { EscaladoRecetaPayload } from '../../types/recetas';
import type { Producto } from '../../types/productos';
import type { Insumo } from '../../types/insumos';
import type { UnidadMedida } from '../../types/unidadesMedida';

import { crearLote } from '../../services/lotesProduccionServices';
import { getProductos } from '../../services/productosServices';
import { getInsumos } from '../../services/insumosServices';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';
import { escalarRecetaProducto, getRecetas } from '../../services/recetasServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import SearchableSelect from '../../components/SearchableSelect';
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

interface Escalado {
    cantidad: number | null;
    rendimientoGramos: number;
}

const estiloError = { borderColor: '#ef4444', outline: 'none' };

function insumosDesdeReceta(
    items: InsumoUtilizadoPayload[],
    catalogo: Insumo[],
    unidades: UnidadMedida[],
): InsumoLoteFormulario[] {
    return items.flatMap((item) => {
        const insumo = catalogo.find((i) => i.id === item.insumo_id);
        const unidad = unidades.find((u) => u.id === item.unidad_medida_id);
        if (!insumo || !unidad) return [];
        return [
            {
                insumo,
                cantidad: item.cantidad_utilizada,
                unidadMedidaId: unidad.id,
                unidadNombre: unidad.nombre,
                cantidadBase: convertirABase(item.cantidad_utilizada, unidad),
                cantidadReceta: item.cantidad_utilizada,
            },
        ];
    });
}

function pedidoDeEscalado(producto: Producto, cantidad: number): EscaladoRecetaPayload | null {
    const unidadProducto = producto.unidad_medida;
    if (unidadProducto.magnitud === 'cantidad') return { unidades_objetivo: cantidad };
    if (unidadProducto.magnitud === 'masa') return { cantidad_objetivo: cantidad * unidadProducto.factor_base };
    return null;
}
const estiloMensaje = { color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' };

export default function LoteForm() {
    const location = useLocation();
    return <FormularioLote key={location.key} />;
}

function FormularioLote() {
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
    const [escalado, setEscalado] = useState<Escalado | null>(
        precargaReceta ? { cantidad: precargaReceta.cantidad, rendimientoGramos: precargaReceta.rendimiento_gramos } : null,
    );
    const [productosConReceta, setProductosConReceta] = useState<Set<number>>(new Set());
    const [calculandoReceta, setCalculandoReceta] = useState(false);
    const [errorReceta, setErrorReceta] = useState<string | null>(null);

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

        getRecetas()
            .then((recetas) => {
                if (!cancelado) setProductosConReceta(new Set(recetas.map((receta) => receta.producto_id)));
            })
            .catch((problema) => console.error('Error al cargar las recetas:', problema));

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
                    setInsumosAgregados(insumosDesdeReceta(precargaReceta.insumos, activos, datosUnidades));
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
        escalado?.cantidad != null &&
        recetaVersionId !== null &&
        cantidad.trim() !== '' &&
        !Number.isNaN(Number(cantidad)) &&
        Math.abs(Number(cantidad) - escalado.cantidad) > 0.0001;

    const tieneReceta = productoElegido !== null && productosConReceta.has(productoElegido.id);
    const seMideEnVolumen = productoElegido?.unidad_medida.magnitud === 'volumen';

    const calcularSegunReceta = async () => {
        if (!productoElegido) return;
        const cantidadNumero = Number(cantidad);
        if (cantidad.trim() === '' || Number.isNaN(cantidadNumero) || cantidadNumero <= 0) {
            setErrores((prev) => ({ ...prev, cantidad: 'Indicá la cantidad producida para calcular los insumos' }));
            return;
        }
        const pedido = pedidoDeEscalado(productoElegido, cantidadNumero);
        if (!pedido) return;

        setCalculandoReceta(true);
        setErrorReceta(null);
        try {
            const resultado = await escalarRecetaProducto(productoElegido.id, pedido);
            setRecetaId(resultado.receta_id);
            setRecetaVersionId(resultado.receta_version_id);
            setFactorEscalado(resultado.factor_aplicado);
            setEscalado({ cantidad: cantidadNumero, rendimientoGramos: resultado.rendimiento_esperado });
            setInsumosAgregados(
                insumosDesdeReceta(
                    resultado.renglones.map((renglon) => ({
                        insumo_id: renglon.insumo_id,
                        cantidad_utilizada: renglon.cantidad_escalada,
                        unidad_medida_id: renglon.unidad_medida_id,
                    })),
                    catalogoInsumos,
                    unidades,
                ),
            );
            setErrores((prev) => ({ ...prev, cantidad: undefined, insumos: undefined }));
        } catch (problema) {
            setErrorReceta(problema instanceof Error ? problema.message : 'No se pudo calcular la receta.');
        } finally {
            setCalculandoReceta(false);
        }
    };

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
            setEscalado(null);
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
        setEscalado(null);
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

                {factorEscalado != null && escalado && (
                    <div className={estilosInsumos.bannerReceta} role="status">
                        Insumos calculados con la receta vigente (<strong>factor x{factorEscalado}</strong> · rendimiento esperado:{' '}
                        <strong>{escalado.rendimientoGramos.toLocaleString('es-AR')} g</strong>).
                        Podés ajustar las cantidades antes de registrar el lote.
                    </div>
                )}

                <div className={styles.formGroup}>
                    <label htmlFor="lote-producto">Producto:</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                        <div style={{ flex: '1 1 260px' }}>
                            <SearchableSelect
                                id="lote-producto"
                                options={productos ?? []}
                                getOptionValue={(p) => String(p.id)}
                                getOptionLabel={(p) => p.nombre}
                                value={productoId}
                                onChange={(val) => {
                                    setProductoId(val ? String(val) : '');
                                    setRecetaId(null);
                                    setRecetaVersionId(null);
                                    setFactorEscalado(null);
                                    setEscalado(null);
                                    setErrorReceta(null);
                                }}
                                disabled={productos === null}
                                isInvalid={Boolean(errores.productoId)}
                                errorMessage={errores.productoId}
                                placeholder={productos === null ? 'Cargando productos...' : 'Seleccione un producto...'}
                            />
                        </div>
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
                                Difiere de la receta. Escalado: {escalado?.cantidad}{unidad ? ` ${unidad}` : ''}. Volvé a calcular los insumos si cambió lo producido.
                            </span>
                        )}
                    </div>
                </div>


                <section className={estilosInsumos.seccion} aria-labelledby="titulo-insumos-lote">
                    <div className={estilosInsumos.encabezadoSeccion}>
                        <h3 id="titulo-insumos-lote">Insumos utilizados</h3>
                        {tieneReceta && !seMideEnVolumen && (
                            <Boton
                                variant="ver"
                                onClick={calcularSegunReceta}
                                disabled={calculandoReceta || catalogoInsumos.length === 0}
                            >
                                {calculandoReceta
                                    ? 'Calculando...'
                                    : recetaVersionId !== null
                                      ? 'Recalcular según la receta'
                                      : 'Calcular insumos según la receta'}
                            </Boton>
                        )}
                    </div>
                    {tieneReceta && !seMideEnVolumen && recetaVersionId === null && (
                        <p className={estilosInsumos.nota}>
                            {productoElegido?.nombre} tiene receta: indicá la cantidad producida y el sistema calcula los
                            insumos escalando la versión vigente. Reemplaza los insumos que hayas agregado.
                        </p>
                    )}
                    {tieneReceta && seMideEnVolumen && (
                        <p className={estilosInsumos.nota}>
                            Este producto se mide en volumen y la receta en gramos: para usar la receta, escalala desde
                            Recetas o cargá los insumos a mano.
                        </p>
                    )}
                    {errorReceta && (
                        <p className={estilosInsumos.errorRenglon} role="alert">
                            {errorReceta}
                        </p>
                    )}
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
