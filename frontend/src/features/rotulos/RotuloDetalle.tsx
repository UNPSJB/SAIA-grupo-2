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
    crearExportacionRotulo,
    crearRotulo,
    getCompletitudRotulo,
    getExportacionRotulo,
    getExportacionesRotulo,
    getHistorialRotulo,
    getLotesRotulo,
    getRotuloProducto,
} from '../../services/rotulosServices';

import type { Producto } from '../../types/productos';
import type {
    CompletitudRotulo,
    ExportacionRotulo,
    HistorialCambioRotulo,
    Rotulo,
    RotuloDatos,
    RotuloLote,
    TablaNutricionalSnapshot,
} from '../../types/rotulos';

import { getLotes } from '../../services/lotesProduccionServices';
import type { LoteProduccion } from '../../types/lotesProduccion';
import type { Nutriente } from '../../types/datosNutricionales';
import type { SelloAdvertencia } from '../../types/parametrosNormativos';
import Boton from '../../components/Boton';
import { ETIQUETA_NUTRIENTE } from '../datosNutricionales/nutrientes';
import LeyendaPrecaucion from '../rotuladoFrontal/LeyendaPrecaucion';
import OctogonoAdvertencia from '../rotuladoFrontal/OctogonoAdvertencia';
import shared from '../../styles/shared.module.css';
import { exportarRotuloPdf } from '../../utils/exportarRotuloPdf';
import styles from './RotuloDetalle.module.css';

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

function etiquetaNutriente(nutriente: string): string {
    return ETIQUETA_NUTRIENTE[nutriente as Nutriente] ?? nutriente;
}

function TablaNutricional({ snapshot }: { snapshot: TablaNutricionalSnapshot | null }) {
    if (!snapshot || snapshot.items.length === 0) {
        return (
            <p className={styles.snapshotVacio}>
                No hay información nutricional disponible.
            </p>
        );
    }

    return (
        <div className={styles.tablaContenedor}>
            {snapshot.estado === 'incompleta' && (
                <p className={styles.avisoIncompleto}>
                    Tabla incompleta: faltan datos de {snapshot.faltantes.map((f) => f.insumo_nombre).join(', ')}.
                </p>
            )}
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
                    {snapshot.items.map((item) => (
                        <tr key={item.nutriente}>
                            <td><strong>{etiquetaNutriente(item.nutriente)}</strong></td>
                            <td>{item.valor_100g_expresado}</td>
                            <td>{item.valor_porcion_expresado}</td>
                            <td>{item.porcentaje_vd_expresado}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className={styles.snapshotResumen}>
                <span>
                    Porción: <strong>{snapshot.unidad_venta_gramos} g</strong>
                </span>
                {snapshot.medida_casera && (
                    <span>
                        Medida casera: <strong>{snapshot.medida_casera}</strong>
                    </span>
                )}
            </div>
        </div>
    );
}

const LEYENDAS: SelloAdvertencia[] = ['contiene_edulcorantes', 'contiene_cafeina'];

function ListaSellos({ sellos }: { sellos: SelloAdvertencia[] | null }) {
    if (sellos === null) {
        return (
            <p className={styles.snapshotVacio}>
                Sin datos: falta evaluar el rotulado frontal o calcular los sellos del producto.
            </p>
        );
    }

    if (sellos.length === 0) {
        return <p className={styles.snapshotVacio}>No le corresponden octógonos ni leyendas precautorias.</p>;
    }

    return (
        <div className={styles.listaSellos}>
            {sellos.filter((s) => !LEYENDAS.includes(s)).map((sello) => (
                <OctogonoAdvertencia key={sello} sello={sello} tamano="pequeno" />
            ))}
            {sellos.filter((s) => LEYENDAS.includes(s)).map((sello) => (
                <LeyendaPrecaucion key={sello} sello={sello} tamano="pequeno" />
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
    const [lotesProducto, setLotesProducto] = useState<LoteProduccion[]>([]);
    const [listaIngredientes, setListaIngredientes] = useState('');
    const [exportaciones, setExportaciones] = useState<ExportacionRotulo[]>([]);
    const [exportando, setExportando] = useState(false);
    const [historial, setHistorial] = useState<HistorialCambioRotulo[]>([]);
    const [completitud, setCompletitud] = useState<CompletitudRotulo | null>(null);

    const [numeroLote, setNumeroLote] = useState('');
    const [fechaDuracion, setFechaDuracion] = useState('');
    const [fechasLotes, setFechasLotes] = useState<Record<number, string>>({});

    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    const cargarDatos = useCallback(async () => {
        if (!productoId) return;

        setCargando(true);
        setError('');

        try {
            const [productoObtenido, rotuloObtenido, lotesObtenidosProducto] = await Promise.all([
                getProductoById(productoId),
                getRotuloProducto(productoId),
                getLotes({ productoId: Number(productoId) }),
            ]);

            setProducto(productoObtenido);
            setRotulo(rotuloObtenido);
            setLotesProducto(lotesObtenidosProducto);
            setListaIngredientes(rotuloObtenido?.lista_ingredientes ?? '');
            setDatos(
                rotuloObtenido
                    ? obtenerDatosFormulario(rotuloObtenido)
                    : { ...datosIniciales },
            );

            if (rotuloObtenido) {
                const [lotesObtenidos, historialObtenido, completitudObtenida, exportacionesObtenidas] =
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
            setMensaje('La lista de ingredientes, la tabla nutricional y los sellos se actualizaron desde la receta vigente.');
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

    const exportarBorrador = async () => {
        if (!rotulo || !usuario?.id) return;

        setExportando(true);
        setError('');
        setMensaje('');

        try {
            const exportacion = await crearExportacionRotulo(rotulo.id, usuario.id);
            exportarRotuloPdf(exportacion);
            setMensaje(`Se generó la exportación N.º ${exportacion.id} con su anexo de cálculo.`);
            setExportaciones(await getExportacionesRotulo(rotulo.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo generar el borrador PDF.');
        } finally {
            setExportando(false);
        }
    };

    const descargarExportacion = async (exportacionId: number) => {
        if (!rotulo) return;

        setExportando(true);
        setError('');
        setMensaje('');

        try {
            exportarRotuloPdf(await getExportacionRotulo(rotulo.id, exportacionId));
            setMensaje(`Se descargó nuevamente la exportación N.º ${exportacionId}, con los datos de ese momento.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo recuperar la exportación.');
        } finally {
            setExportando(false);
        }
    };

    const guardarListaIngredientes = async () => {
        if (!rotulo || !usuario?.id) return;

        setProcesando(true);
        setError('');
        setMensaje('');

        try {
            await actualizarRotulo(
                rotulo.id,
                { lista_ingredientes: listaIngredientes.trim() || null },
                usuario.id,
            );
            setMensaje('La lista de ingredientes se guardó y el cambio quedó registrado en el historial.');
            await cargarDatos();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudo guardar la lista de ingredientes.',
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
            <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box' }}>
                <div className={styles.encabezado}>
                <div>
                    <h1 className={styles.titulo}>Rótulo del producto</h1>
                    <p className={styles.subtitulo}>
                        {producto.nombre}
                    </p>
                </div>

                <div className={styles.accionesEncabezado}>
                    {rotulo && (
                        <Boton
                            variant="ver"
                            onClick={() => navigate(`/rotulos/producto/${productoId}/vista-previa`)}
                        >
                            Vista previa
                        </Boton>
                    )}
                    <Boton variant="volver" onClick={() => navigate('/rotulos')}>
                        Volver al listado
                    </Boton>
                </div>
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
                                <h2 className={styles.seccionTitulo}>Datos automáticos</h2>
                                <p className={styles.textoAyuda}>
                                    Lista de ingredientes, tabla nutricional y sellos tomados de la receta vigente y del rotulado frontal.
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
                            Receta: {rotulo.receta_id ? `#${rotulo.receta_id}` : 'Sin receta'}{' '}
                            {rotulo.receta_version !== null &&
                                `(versión ${rotulo.receta_version})`}
                        </p>

                        <div className={styles.listaIngredientesBloque}>
                            <h3>Lista de ingredientes</h3>
                            <p className={styles.textoAyuda}>
                                Generada a partir de la receta, en orden decreciente y con los aditivos por función.
                                Podés editarla: el cambio queda registrado en el historial.
                            </p>
                            <textarea
                                className={styles.textareaInstrucciones}
                                rows={3}
                                value={listaIngredientes}
                                onChange={(e) => setListaIngredientes(e.target.value)}
                                aria-label="Lista de ingredientes"
                            />
                            {rotulo.ingredientes_snapshot &&
                                rotulo.lista_ingredientes !== rotulo.ingredientes_snapshot.texto_rotulo && (
                                    <p className={styles.avisoIncompleto}>
                                        La lista fue editada y difiere de la generada por el sistema:{' '}
                                        <em>{rotulo.ingredientes_snapshot.texto_rotulo}</em>
                                    </p>
                                )}
                            <div className={shared.filaBotones}>
                                {rotulo.ingredientes_snapshot &&
                                    listaIngredientes !== rotulo.ingredientes_snapshot.texto_rotulo && (
                                    <Boton
                                        variant="limpiar"
                                        onClick={() => setListaIngredientes(rotulo.ingredientes_snapshot?.texto_rotulo ?? '')}
                                        disabled={procesando}
                                    >
                                        Usar la generada
                                    </Boton>
                                )}
                                <Boton
                                    variant="guardar"
                                    onClick={guardarListaIngredientes}
                                    disabled={procesando || listaIngredientes === (rotulo.lista_ingredientes ?? '')}
                                >
                                    Guardar lista
                                </Boton>
                            </div>
                        </div>

                        <div className={styles.snapshotGrid}>
                            <div>
                                <h3>Información nutricional</h3>
                                <TablaNutricional snapshot={rotulo.nutricion_snapshot} />
                            </div>

                            <div>
                                <h3>Sellos de advertencia</h3>
                                <ListaSellos sellos={rotulo.sellos_snapshot} />
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
                                <label htmlFor="numeroLote">Lote de producción</label>
                                <select
                                    id="numeroLote"
                                    value={numeroLote}
                                    onChange={(e) => setNumeroLote(e.target.value)}
                                    required
                                >
                                    <option value="">Elegí un lote</option>
                                    {lotesProducto
                                        .filter((lote) => !lotes.some((asociado) => asociado.nro_lote === lote.nro_lote))
                                        .map((lote) => (
                                            <option key={lote.nro_lote} value={lote.nro_lote}>
                                                Lote {lote.nro_lote} · {new Date(`${lote.fecha}T00:00:00`).toLocaleDateString('es-AR')}
                                            </option>
                                        ))}
                                </select>
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
                        <div className={styles.seccionEncabezado}>
                            <div>
                                <h2 className={styles.seccionTitulo}>Exportación del borrador</h2>
                                <p className={styles.textoAyuda}>
                                    Genera un PDF con el borrador del rótulo y un anexo con la receta, la composición,
                                    la tabla nutricional con sus fuentes y el cálculo de sellos. Cada exportación guarda
                                    una copia de los datos usados.
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

                        {completitud && !completitud.completo && (
                            <p className={styles.avisoIncompleto}>
                                El borrador todavía tiene datos pendientes: se exporta igual, con los faltantes indicados
                                en el PDF.
                            </p>
                        )}

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
                                            <strong>Receta:</strong> versión {exportacion.version_receta ?? 'sin receta'}
                                            {' · '}
                                            <strong>Parámetros normativos:</strong>{' '}
                                            {exportacion.version_parametros !== null
                                                ? `versión ${exportacion.version_parametros}`
                                                : 'sin cálculo de sellos'}
                                        </p>

                                        <Boton
                                            variant="descargar"
                                            onClick={() => descargarExportacion(exportacion.id)}
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
        </div>
    );
}