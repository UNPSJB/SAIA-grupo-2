import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { getProductoById } from '../../services/productosServices';
import {
    actualizarLoteRotulo,
    actualizarRotulo,
    actualizarSnapshots,
    crearLoteRotulo,
    crearRotulo,
    getCompletitudRotulo,
    getHistorialRotulo,
    getLotesRotulo,
    getRotuloProducto,
    crearExportacionRotulo,
    getExportacionRotulo,
    getExportacionesRotulo,
} from '../../services/rotulosServices';

import type { Producto } from '../../types/productos';
import type {
    CompletitudRotulo,
    HistorialCambioRotulo,
    Rotulo,
    RotuloDatos,
    RotuloLote,
    ExportacionRotulo,
} from '../../types/rotulos';

import Boton from '../../components/Boton';
import shared from '../../styles/shared.module.css';
import styles from './RotuloDetalle.module.css';
import { exportarRotuloPdf } from '../../utils/exportarRotuloPdf';

const datosIniciales: RotuloDatos = {
    denominacion_venta: '',
    contenido_neto: null,
    unidad_contenido_neto: '',
    rnpa_rppa: '',
    razon_social: '',
    domicilio: '',
    es_importado: false,
    razon_social_importador: '',
    domicilio_importador: '',
    pais_origen: '',
    instrucciones_uso: '',
    instrucciones_conservacion: '',
};

function obtenerDatosFormulario(rotulo: Rotulo): RotuloDatos {
    return {
        denominacion_venta: rotulo.denominacion_venta ?? '',
        contenido_neto: rotulo.contenido_neto,
        unidad_contenido_neto: rotulo.unidad_contenido_neto ?? '',
        rnpa_rppa: rotulo.rnpa_rppa ?? '',
        razon_social: rotulo.razon_social ?? '',
        domicilio: rotulo.domicilio ?? '',
        es_importado: rotulo.es_importado,
        razon_social_importador: rotulo.razon_social_importador ?? '',
        domicilio_importador: rotulo.domicilio_importador ?? '',
        pais_origen: rotulo.pais_origen ?? '',
        instrucciones_uso: rotulo.instrucciones_uso ?? '',
        instrucciones_conservacion: rotulo.instrucciones_conservacion ?? '',
    };
}

type RegistroSnapshot = Record<string, unknown>;

function esRegistro(valor: unknown): valor is RegistroSnapshot {
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function obtenerLista(
    registro: RegistroSnapshot | null,
    clave: string,
): RegistroSnapshot[] {
    const valor = registro?.[clave];

    if (!Array.isArray(valor)) return [];

    return valor.filter(esRegistro);
}

function mostrarValor(valor: unknown): string {
    if (valor === null || valor === undefined || valor === '') return '—';
    return String(valor);
}

function formatearValorHistorial(valor: string | null): string {
    if (valor === null || valor === '') return 'Sin valor';

    try {
        const parseado: unknown = JSON.parse(valor);

        if (typeof parseado === 'string') return parseado;

        if (typeof parseado === 'object' && parseado !== null) {
            return JSON.stringify(parseado, null, 2);
        }

        return String(parseado);
    } catch {
        return valor;
    }
}

function mostrarFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-AR');
}


function TablaIngredientes({ snapshot }: { snapshot: unknown }) {
    const registro = esRegistro(snapshot) ? snapshot : null;
    const ingredientes = obtenerLista(registro, 'ingredientes');
    const aditivos = obtenerLista(registro, 'aditivos');

    const filas: (RegistroSnapshot & { categoria: string })[] = [
        ...ingredientes.map((item): RegistroSnapshot & { categoria: string } => ({
            ...item,
            categoria: 'Ingrediente',
        })),
        ...aditivos.map((item): RegistroSnapshot & { categoria: string } => ({
            ...item,
            categoria: 'Aditivo',
        })),
    ];

    if (filas.length === 0) {
        return <p className={styles.snapshotVacio}>No hay ingredientes disponibles.</p>;
    }

    return (
        <div className={styles.tablaContenedor}>
            <table className={styles.tablaSnapshot}>
                <thead>
                    <tr>
                        <th>Ingrediente</th>
                        <th>Cantidad</th>
                        <th>Porcentaje</th>
                    </tr>
                </thead>
                <tbody>
                    {filas.map((item, indice) => (
                        <tr key={`${String(item.insumo_id ?? item.nombre_insumo ?? indice)}-${indice}`}>
                            <td>
                                <strong>
                                    {mostrarValor(item.nombre_insumo ?? item.nombre)}
                                </strong>
                                <small>{item.categoria}</small>
                            </td>
                            <td>
                                {mostrarValor(item.cantidad_gramos)} g
                            </td>
                            <td>
                                {item.porcentaje !== undefined
                                    ? `${mostrarValor(item.porcentaje)}%`
                                    : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {registro && (
                <div className={styles.snapshotResumen}>
                    {registro.total_gramos !== undefined && (
                        <span>
                            **Total:** {mostrarValor(registro.total_gramos)} g
                        </span>
                    )}
                    {registro.suma_porcentajes !== undefined && (
                        <span>
                            **Suma de porcentajes:** {mostrarValor(registro.suma_porcentajes)}%
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}


function TablaNutricional({ snapshot }: { snapshot: unknown }) {
    const registro = esRegistro(snapshot) ? snapshot : null;
    const items = obtenerLista(registro, 'items');

    if (items.length === 0) {
        return (
            <p className={styles.snapshotVacio}>
                No hay información nutricional disponible.
            </p>
        );
    }

    return (
        <div className={styles.tablaContenedor}>
            <table className={styles.tablaSnapshot}>
                <thead>
                    <tr>
                        <th>Nutriente</th>
                        <th>Por 100 g</th>
                        <th>Por porción</th>
                        <th>% VD</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, indice) => (
                        <tr key={`${String(item.nutriente ?? indice)}-${indice}`}>
                            <td><strong>{mostrarValor(item.nutriente)}</strong></td>
                            <td>
                                {mostrarValor(item.valor_100g_expresado ?? item.valor_100g_raw)}
                            </td>
                            <td>
                                {mostrarValor(item.valor_porcion_expresado ?? item.valor_porcion_raw)}
                            </td>
                            <td>
                                {mostrarValor(item.porcentaje_vd_expresado ?? item.porcentaje_vd)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {registro && (
                <div className={styles.snapshotResumen}>
                    {registro.rendimiento_final_gramos !== undefined && (
                        <span>
                            Rendimiento: <strong>{mostrarValor(registro.rendimiento_final_gramos)} g</strong>
                        </span>
                    )}
                    {registro.unidad_venta_gramos !== undefined && (
                        <span>
                            Porción: <strong>{mostrarValor(registro.unidad_venta_gramos)} g</strong>
                        </span>
                    )}
                    {registro.medida_casera !== undefined && (
                        <span>
                            Medida casera: <strong>{mostrarValor(registro.medida_casera)}</strong>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

function ListaSellos({ snapshot }: { snapshot: unknown }) {
    if (!Array.isArray(snapshot) || snapshot.length === 0) {
        return <p className={styles.snapshotVacio}>El producto no tiene sellos registrados.</p>;
    }

    return (
        <div className={styles.listaSellos}>
            {snapshot.map((sello, indice) => (
                <span className={styles.sello} key={`${String(sello)}-${indice}`}>
                    {typeof sello === 'string' ? sello : JSON.stringify(sello)}
                </span>
            ))}
        </div>
    );
}

export default function RotuloDetalle() {
    const { productoId } = useParams<{ productoId: string }>();
    const navigate = useNavigate();
    const { usuario } = useAuth();

    const [producto, setProducto] = useState<Producto | null>(null);
    const [rotulo, setRotulo] = useState<Rotulo | null>(null);
    const [datos, setDatos] = useState<RotuloDatos>(datosIniciales);

    const [lotes, setLotes] = useState<RotuloLote[]>([]);
    const [historial, setHistorial] = useState<HistorialCambioRotulo[]>([]);
    const [completitud, setCompletitud] = useState<CompletitudRotulo | null>(null);

    const [numeroLote, setNumeroLote] = useState('');
    const [fechaDuracion, setFechaDuracion] = useState('');
    const [fechasLotes, setFechasLotes] = useState<Record<number, string>>({});

    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    const [exportaciones, setExportaciones] = useState<ExportacionRotulo[]>([]);
    const [exportando, setExportando] = useState(false);

    const cargarDatos = useCallback(async () => {
        if (!productoId) return;

        setCargando(true);
        setError('');

        try {
            const [productoObtenido, rotuloObtenido] = await Promise.all([
                getProductoById(productoId),
                getRotuloProducto(productoId),
            ]);

            setProducto(productoObtenido);
            setRotulo(rotuloObtenido);
            setDatos(
                rotuloObtenido
                    ? obtenerDatosFormulario(rotuloObtenido)
                    : { ...datosIniciales },
            );

            if (rotuloObtenido) {
                const [lotesObtenidos, historialObtenido, completitudObtenida, exportacionesObtenidas,] =
                    await Promise.all([
                        getLotesRotulo(rotuloObtenido.id),
                        getHistorialRotulo(rotuloObtenido.id),
                        getCompletitudRotulo(rotuloObtenido.id),
                        getExportacionesRotulo(rotuloObtenido.id),
                    ]);

                setLotes(lotesObtenidos);
                setHistorial(historialObtenido);
                setCompletitud(completitudObtenida);
                setExportaciones(exportacionesObtenidas);

                const fechas: Record<number, string> = {};
                lotesObtenidos.forEach((lote) => {
                    fechas[lote.id] = lote.fecha_duracion ?? '';
                });
                setFechasLotes(fechas);
            } else {
                setLotes([]);
                setHistorial([]);
                setCompletitud(null);
                setExportaciones([]);
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudo cargar la información del producto.',
            );
        } finally {
            setCargando(false);
        }
    }, [productoId]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const cambiarDato = (
        campo: keyof RotuloDatos,
        valor: string | number | boolean | null,
    ) => {
        setDatos((actuales) => ({
            ...actuales,
            [campo]: valor,
        }));
    };

    const guardarRotulo = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!productoId || !usuario?.id) {
            setError('No se pudo identificar al usuario o al producto.');
            return;
        }

        setProcesando(true);
        setError('');
        setMensaje('');

        try {
            const datosParaGuardar: RotuloDatos = {
                ...datos,
                contenido_neto:
                    datos.contenido_neto === null ||
                    datos.contenido_neto === undefined ||
                    datos.contenido_neto === ('' as unknown as number)
                        ? null
                        : Number(datos.contenido_neto),
            };

            let resultado: Rotulo;

            if (rotulo) {
                resultado = await actualizarRotulo(
                    rotulo.id,
                    datosParaGuardar,
                    usuario.id,
                );
                setMensaje('Los datos del rótulo se actualizaron correctamente.');
            } else {
                resultado = await crearRotulo(
                    {
                        producto_id: Number(productoId),
                        ...datosParaGuardar,
                    },
                    usuario.id,
                );
                setMensaje('Se creó el borrador del rótulo correctamente.');
            }

            setRotulo(resultado);
            await cargarDatos();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudieron guardar los datos del rótulo.',
            );
        } finally {
            setProcesando(false);
        }
    };

    const guardarSnapshots = async () => {
        if (!rotulo || !usuario?.id) return;

        setProcesando(true);
        setError('');
        setMensaje('');

        try {
            await actualizarSnapshots(rotulo.id, usuario.id);
            setMensaje('Los datos de ingredientes, nutrición y sellos se actualizaron.');
            await cargarDatos();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudieron actualizar los datos precargados.',
            );
        } finally {
            setProcesando(false);
        }
    };

    const asociarLote = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!rotulo || !usuario?.id || !numeroLote.trim()) return;

        const numero = Number(numeroLote);

        if (!Number.isInteger(numero) || numero < 0) {
            setError('El número de lote debe ser un número entero válido.');
            return;
        }

        setProcesando(true);
        setError('');
        setMensaje('');

        try {
            await crearLoteRotulo(
                rotulo.id,
                {
                    nro_lote: numero,
                    fecha_duracion: fechaDuracion || null,
                },
                usuario.id,
            );

            setNumeroLote('');
            setFechaDuracion('');
            setMensaje('El lote se asoció correctamente al rótulo.');
            await cargarDatos();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudo asociar el lote.',
            );
        } finally {
            setProcesando(false);
        }
    };

    const guardarFechaLote = async (loteId: number) => {
        if (!usuario?.id) return;

        setProcesando(true);
        setError('');
        setMensaje('');

        try {
            await actualizarLoteRotulo(
                loteId,
                {
                    fecha_duracion: fechasLotes[loteId] || null,
                },
                usuario.id,
            );

            setMensaje('La fecha de duración del lote se actualizó correctamente.');
            await cargarDatos();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudo actualizar la fecha del lote.',
            );
        } finally {
            setProcesando(false);
        }
    };

    const exportarBorrador = async () => {
        if (!rotulo || !usuario?.id) {
            setError('No se pudo identificar el rótulo o el usuario.');
            return;
        }

        setExportando(true);
        setError('');
        setMensaje('');

        try {
            const exportacion = await crearExportacionRotulo(
                rotulo.id,
                usuario.id,
            );

            const detalle = await getExportacionRotulo(
                rotulo.id,
                exportacion.id,
            );

            exportarRotuloPdf(detalle);

            setMensaje('El borrador PDF se generó correctamente.');
            const historialActualizado = await getExportacionesRotulo(rotulo.id);
            setExportaciones(historialActualizado);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudo generar el borrador PDF.',
            );
        } finally {
            setExportando(false);
        }
    };

    const descargarExportacionAnterior = async (exportacionId: number) => {
        if (!rotulo) return;

        setExportando(true);
        setError('');
        setMensaje('');

        try {
            const detalle = await getExportacionRotulo(
                rotulo.id,
                exportacionId,
            );

            exportarRotuloPdf(detalle);
            setMensaje(`Se descargó nuevamente la exportación N.º ${exportacionId}.`);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudo recuperar la exportación.',
            );
        } finally {
            setExportando(false);
        }
    };

    if (cargando) {
        return (
            <div className={shared.contenedorPrincipal}>
                <p className={shared.emptyMensaje}>Cargando información del rótulo...</p>
            </div>
        );
    }

    if (!producto) {
        return (
            <div className={shared.contenedorPrincipal}>
                <p className={shared.textDanger}>
                    {error || 'No se encontró el producto solicitado.'}
                </p>
                <Boton variant="volver" onClick={() => navigate('/rotulos')}>
                    Volver a rótulos
                </Boton>
            </div>
        );
    }

    return (
        <div className={shared.contenedorPrincipal}>
            <div className={styles.encabezado}>
                <div>
                    <h1 className={styles.titulo}>Rótulo del producto</h1>
                    <p className={styles.subtitulo}>
                        {producto.nombre}
                    </p>
                </div>

                <Boton variant="volver" onClick={() => navigate('/rotulos')}>
                    Volver al listado
                </Boton>
            </div>

            {error && (
                <div className={styles.mensajeError}>
                    {error}
                </div>
            )}

            {mensaje && (
                <div className={styles.mensajeExito}>
                    {mensaje}
                </div>
            )}

            {completitud && (
                <section className={shared.tarjetaEstatica}>
                    <div className={styles.completitudEncabezado}>
                        <div>
                            <h2 className={styles.seccionTitulo}>Completitud del rótulo</h2>
                            <p className={styles.textoAyuda}>
                                Indicador de los datos obligatorios que ya fueron cargados.
                            </p>
                        </div>

                        <strong className={styles.porcentaje}>
                            {completitud.porcentaje_completitud.toFixed(2)}%
                        </strong>
                    </div>

                    <div className={styles.barraFondo}>
                        <div
                            className={styles.barraProgreso}
                            style={{
                                width: `${Math.min(
                                    100,
                                    Math.max(0, completitud.porcentaje_completitud),
                                )}%`,
                            }}
                        />
                    </div>

                    {completitud.completo ? (
                        <p className={styles.textoCompleto}>
                            El rótulo tiene todos los datos obligatorios.
                        </p>
                    ) : (
                        <div className={styles.faltantes}>
                            <strong>Datos pendientes:</strong>
                            <ul>
                                {completitud.faltantes.map((faltante, indice) => (
                                    <li key={`${faltante}-${indice}`}>{faltante}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>
            )}

            <form
                className={`${shared.tarjetaEstatica} ${styles.formulario}`}
                onSubmit={guardarRotulo}
            >
                <h2 className={styles.seccionTitulo}>Datos del rótulo</h2>

                <div className={styles.formGrid}>
                    <div className={shared.formGroup}>
                        <label htmlFor="denominacion">Denominación de venta</label>
                        <input
                            id="denominacion"
                            type="text"
                            value={datos.denominacion_venta ?? ''}
                            onChange={(e) => cambiarDato('denominacion_venta', e.target.value)}
                        />
                    </div>

                    <div className={shared.formGroup}>
                        <label htmlFor="contenidoNeto">Contenido neto</label>
                        <input
                            id="contenidoNeto"
                            type="number"
                            min="0"
                            step="any"
                            value={datos.contenido_neto ?? ''}
                            onChange={(e) =>
                                cambiarDato(
                                    'contenido_neto',
                                    e.target.value === '' ? null : Number(e.target.value),
                                )
                            }
                        />
                    </div>

                    <div className={shared.formGroup}>
                        <label htmlFor="unidadContenido">Unidad del contenido neto</label>
                        <input
                            id="unidadContenido"
                            type="text"
                            placeholder="Ej.: g, kg, ml, l"
                            value={datos.unidad_contenido_neto ?? ''}
                            onChange={(e) =>
                                cambiarDato('unidad_contenido_neto', e.target.value)
                            }
                        />
                    </div>

                    <div className={shared.formGroup}>
                        <label htmlFor="rnpa">RNPA / RPPA</label>
                        <input
                            id="rnpa"
                            type="text"
                            value={datos.rnpa_rppa ?? ''}
                            onChange={(e) => cambiarDato('rnpa_rppa', e.target.value)}
                        />
                    </div>

                    <div className={shared.formGroup}>
                        <label htmlFor="razonSocial">Razón social</label>
                        <input
                            id="razonSocial"
                            type="text"
                            value={datos.razon_social ?? ''}
                            onChange={(e) => cambiarDato('razon_social', e.target.value)}
                        />
                    </div>

                    <div className={shared.formGroup}>
                        <label htmlFor="domicilio">Domicilio</label>
                        <input
                            id="domicilio"
                            type="text"
                            value={datos.domicilio ?? ''}
                            onChange={(e) => cambiarDato('domicilio', e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.separador}>
                    <label className={styles.checkboxImportado}>
                        <input
                            type="checkbox"
                            checked={datos.es_importado ?? false}
                            onChange={(e) => cambiarDato('es_importado', e.target.checked)}
                        />
                        El producto es importado
                    </label>
                </div>

                {datos.es_importado && (
                    <>
                        <h3 className={styles.subtituloSeccion}>Datos del importador</h3>

                        <div className={styles.formGrid}>
                            <div className={shared.formGroup}>
                                <label htmlFor="razonImportador">Razón social del importador</label>
                                <input
                                    id="razonImportador"
                                    type="text"
                                    value={datos.razon_social_importador ?? ''}
                                    onChange={(e) =>
                                        cambiarDato('razon_social_importador', e.target.value)
                                    }
                                />
                            </div>

                            <div className={shared.formGroup}>
                                <label htmlFor="domicilioImportador">Domicilio del importador</label>
                                <input
                                    id="domicilioImportador"
                                    type="text"
                                    value={datos.domicilio_importador ?? ''}
                                    onChange={(e) =>
                                        cambiarDato('domicilio_importador', e.target.value)
                                    }
                                />
                            </div>

                            <div className={shared.formGroup}>
                                <label htmlFor="paisOrigen">País de origen</label>
                                <input
                                    id="paisOrigen"
                                    type="text"
                                    value={datos.pais_origen ?? ''}
                                    onChange={(e) => cambiarDato('pais_origen', e.target.value)}
                                />
                            </div>
                        </div>
                    </>
                )}

                <h3 className={styles.subtituloSeccion}>Instrucciones</h3>

                <div className={styles.formGrid}>
                    <div className={shared.formGroup}>
                        <label htmlFor="instruccionesUso">Instrucciones de uso</label>
                        <textarea
                            id="instruccionesUso"
                            className={styles.textareaInstrucciones}
                            rows={3}
                            value={datos.instrucciones_uso ?? ''}
                            onChange={(e) => cambiarDato('instrucciones_uso', e.target.value)}
                        />
                    </div>

                    <div className={shared.formGroup}>
                        <label htmlFor="instruccionesConservacion">
                            Instrucciones de conservación
                        </label>
                        <textarea
                            id="instruccionesConservacion"
                            className={styles.textareaInstrucciones}
                            rows={3}
                            value={datos.instrucciones_conservacion ?? ''}
                            onChange={(e) =>
                                cambiarDato('instrucciones_conservacion', e.target.value)
                            }
                        />
                    </div>
                </div>

                <div className={shared.filaBotones}>
                    <Boton
                        variant="guardar"
                        type="submit"
                        disabled={procesando}
                    >
                        {procesando
                            ? 'Guardando...'
                            : rotulo
                                ? 'Guardar cambios'
                                : 'Crear borrador'}
                    </Boton>
                </div>
            </form>

            {rotulo && (
                <>
                    <section className={`${shared.tarjetaEstatica} ${styles.seccion}`}>
                        <div className={styles.seccionEncabezado}>
                            <div>
                                <h2 className={styles.seccionTitulo}>Exportación del borrador</h2>
                                <p className={styles.textoAyuda}>
                                    Generá un PDF con el rótulo y su anexo técnico.
                                    La exportación conserva una copia de los datos utilizados.
                                </p>
                            </div>

                            <Boton
                                variant="descargar"
                                onClick={exportarBorrador}
                                disabled={exportando || procesando}
                            >
                                {exportando ? 'Generando PDF...' : 'Exportar borrador PDF'}
                            </Boton>
                        </div>

                        <h3 className={styles.subtituloSeccion}>Historial de exportaciones</h3>

                        {exportaciones.length === 0 ? (
                            <p className={shared.emptyMensaje}>
                                Todavía no hay exportaciones registradas.
                            </p>
                        ) : (
                            <div className={styles.historial}>
                                {exportaciones.map((exportacion) => (
                                    <article className={styles.cambio} key={exportacion.id}>
                                        <div className={styles.cambioEncabezado}>
                                            <strong>Exportación N.º {exportacion.id}</strong>
                                            <span>{mostrarFecha(exportacion.fecha_exportacion)}</span>
                                        </div>

                                        <p className={styles.empleadoCambio}>
                                            <strong>Generada por:</strong>{' '}
                                            {exportacion.empleado_nombre || exportacion.empleado_apellido
                                                ? `${exportacion.empleado_nombre ?? ''} ${exportacion.empleado_apellido ?? ''}`.trim()
                                                : `Empleado ${exportacion.empleado_id}`}
                                        </p>

                                        <p className={styles.empleadoCambio}>
                                            <strong>Versión de receta:</strong>{' '}
                                            {exportacion.version_receta ?? 'No disponible'}
                                        </p>

                                        <Boton
                                            variant="descargar"
                                            onClick={() => descargarExportacionAnterior(exportacion.id)}
                                            disabled={exportando}
                                        >
                                            Descargar nuevamente
                                        </Boton>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                    <section className={`${shared.tarjetaEstatica} ${styles.seccion}`}>
                        <div className={styles.seccionEncabezado}>
                            <div>
                                <h2 className={styles.seccionTitulo}>Datos de receta</h2>
                                <p className={styles.textoAyuda}>
                                    Información precargada desde la receta del producto.
                                </p>
                            </div>

                            <Boton
                                variant="editar"
                                onClick={guardarSnapshots}
                                disabled={procesando}
                            >
                                Actualizar datos
                            </Boton>
                        </div>

                        <p className={styles.textoAyuda}>
                            Receta: {rotulo.receta_id ?? 'Sin receta'}{' '}
                            {rotulo.receta_version !== null &&
                                `(versión ${rotulo.receta_version})`}
                        </p>

                        <div className={styles.snapshotGrid}>
                            <div>
                                <h3>Ingredientes</h3>
                                <TablaIngredientes snapshot={rotulo.ingredientes_snapshot} />
                            </div>

                            <div>
                                <h3>Información nutricional</h3>
                                <TablaNutricional snapshot={rotulo.nutricion_snapshot} />
                            </div>

                            <div>
                                <h3>Sellos de advertencia</h3>
                                <ListaSellos snapshot={rotulo.sellos_snapshot} />
                            </div>
                        </div>
                    </section>

                    <section className={`${shared.tarjetaEstatica} ${styles.seccion}`}>
                        <h2 className={styles.seccionTitulo}>Lotes y fecha de duración</h2>

                        <p className={styles.textoAyuda}>
                            Asociá los lotes de producción para registrar la fecha de duración
                            correspondiente a cada uno.
                        </p>

                        <form className={styles.formLote} onSubmit={asociarLote}>
                            <div className={shared.formGroup}>
                                <label htmlFor="numeroLote">Número de lote</label>
                                <input
                                    id="numeroLote"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={numeroLote}
                                    onChange={(e) => setNumeroLote(e.target.value)}
                                    required
                                />
                            </div>

                            <div className={shared.formGroup}>
                                <label htmlFor="fechaDuracion">Fecha de duración</label>
                                <input
                                    id="fechaDuracion"
                                    type="date"
                                    value={fechaDuracion}
                                    onChange={(e) => setFechaDuracion(e.target.value)}
                                />
                            </div>

                            <Boton
                                variant="crear"
                                type="submit"
                                disabled={procesando}
                            >
                                Asociar lote
                            </Boton>
                        </form>

                        {lotes.length === 0 ? (
                            <p className={shared.emptyMensaje}>
                                Todavía no hay lotes asociados a este rótulo.
                            </p>
                        ) : (
                            <div className={styles.listaLotes}>
                                {lotes.map((lote) => (
                                    <div className={styles.filaLote} key={lote.id}>
                                        <strong>Lote {lote.nro_lote}</strong>

                                        <div className={styles.fechaLote}>
                                            <label htmlFor={`fecha-${lote.id}`}>
                                                Fecha de duración
                                            </label>
                                            <input
                                                id={`fecha-${lote.id}`}
                                                type="date"
                                                value={fechasLotes[lote.id] ?? ''}
                                                onChange={(e) =>
                                                    setFechasLotes((actuales) => ({
                                                        ...actuales,
                                                        [lote.id]: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>

                                        <Boton
                                            variant="guardar"
                                            onClick={() => guardarFechaLote(lote.id)}
                                            disabled={procesando}
                                        >
                                            Guardar fecha
                                        </Boton>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className={`${shared.tarjetaEstatica} ${styles.seccion}`}>
                        <h2 className={styles.seccionTitulo}>Historial de modificaciones</h2>

                        {historial.length === 0 ? (
                            <p className={shared.emptyMensaje}>
                                Todavía no hay modificaciones registradas.
                            </p>
                        ) : (
                            <div className={styles.historial}>
                                {historial.map((cambio) => (
                                    <article className={styles.cambio} key={cambio.id}>
                                        <div className={styles.cambioEncabezado}>
                                            <strong>{cambio.campo}</strong>
                                            <span>{mostrarFecha(cambio.fecha_cambio)}</span>
                                        </div>

                                        <div className={styles.valoresCambio}>
                                            <p>
                                                <strong>Anterior:</strong>
                                                <span>{formatearValorHistorial(cambio.valor_original)}</span>
                                            </p>
                                            <p>
                                                <strong>Nuevo:</strong>
                                                <span>{formatearValorHistorial(cambio.valor_nuevo)}</span>
                                            </p>
                                        </div>

                                        <p className={styles.empleadoCambio}>
                                            <strong>Modificado por:</strong>{' '}
                                            {cambio.empleado_nombre || cambio.empleado_apellido
                                                ? `${cambio.empleado_nombre ?? ''} ${cambio.empleado_apellido ?? ''}`.trim()
                                                : 'Empleado no disponible'}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}