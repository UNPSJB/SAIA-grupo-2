import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import type {
    Agregado,
    BorradorUpdate,
    ConjuntoDetalle,
    CriterioSello,
    SelloAdvertencia,
} from '../../types/parametrosNormativos';
import type { TipoProducto } from '../../types/productos';
import {
    descartarBorradorParametros,
    getClasesFuncionalesAditivo,
    getConjuntoParametros,
    modificarBorradorParametros,
    publicarParametros,
} from '../../services/parametrosNormativosServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import ModalConfirmacion from '../../components/confirmacion';
import { NUTRIENTES, formatearFechaHora, nombreCompleto } from '../datosNutricionales/nutrientes';
import { ETIQUETA_TIPO_PRODUCTO, formatearFecha } from '../productos/formatoProducto';
import {
    AGREGADOS,
    ETIQUETA_AGREGADO,
    ETIQUETA_SELLO,
    ETIQUETA_SELLO_CORTA,
    SELLOS,
    describirCondicion,
    describirCriterio,
    formatearNumero,
} from './etiquetas';
import estilos from './ParametrosNormativos.module.css';
import styles from '../../styles/shared.module.css';

interface Formulario {
    norma: string;
    fecha: string;
    notas: string;
    criterios: Record<number, { limite: string; factor: string }>;
    textos: Record<string, string>;
    reglas: string[];
    clases: Record<Agregado, string[]>;
    excepciones: string[];
    generales: Record<string, string>;
}

interface Respuesta {
    clave: string;
    conjunto: ConjuntoDetalle | null;
    error: boolean;
}

const TIPOS: TipoProducto[] = ['alimento', 'bebida'];

function claveRegla(agregado: Agregado, sello: SelloAdvertencia): string {
    return `${agregado}:${sello}`;
}

function formularioDesde(conjunto: ConjuntoDetalle): Formulario {
    return {
        norma: conjunto.norma_origen,
        fecha: conjunto.fecha_vigencia,
        notas: conjunto.notas ?? '',
        criterios: Object.fromEntries(
            conjunto.criterios.map((criterio) => [
                criterio.id,
                { limite: String(criterio.limite), factor: criterio.factor_energetico === null ? '' : String(criterio.factor_energetico) },
            ]),
        ),
        textos: Object.fromEntries(conjunto.textos.map((texto) => [texto.sello, texto.texto])),
        reglas: conjunto.sellos_por_agregado.map((regla) => claveRegla(regla.agregado, regla.sello)),
        clases: Object.fromEntries(
            AGREGADOS.map((agregado) => [
                agregado,
                conjunto.clases_aditivo.filter((clase) => clase.agregado === agregado).map((clase) => clase.clase_funcional),
            ]),
        ) as Record<Agregado, string[]>,
        excepciones: conjunto.excepciones.map((excepcion) => excepcion.descripcion),
        generales: Object.fromEntries(conjunto.parametros_generales.map((parametro) => [parametro.clave, String(parametro.valor)])),
    };
}

function numero(texto: string): number {
    const valor = Number(texto.replace(',', '.'));
    if (texto.trim() === '' || Number.isNaN(valor) || valor <= 0) {
        throw new Error('Los umbrales, factores y parámetros deben ser números mayores a cero.');
    }
    return valor;
}

function cambiosDesde(conjunto: ConjuntoDetalle, formulario: Formulario): BorradorUpdate {
    return {
        norma_origen: formulario.norma,
        fecha_vigencia: formulario.fecha,
        notas: formulario.notas.trim() || null,
        criterios: conjunto.criterios.map((criterio) => ({
            id: criterio.id,
            limite: numero(formulario.criterios[criterio.id].limite),
            factor_energetico:
                criterio.factor_energetico === null ? null : numero(formulario.criterios[criterio.id].factor),
        })),
        textos: conjunto.textos.map((texto) => ({ sello: texto.sello, texto: formulario.textos[texto.sello] ?? '' })),
        reglas: AGREGADOS.map((agregado) => ({
            agregado,
            sellos: SELLOS.filter((sello) => formulario.reglas.includes(claveRegla(agregado, sello))),
        })),
        clases_aditivo: AGREGADOS.map((agregado) => ({ agregado, clases: formulario.clases[agregado] })),
        excepciones: formulario.excepciones,
        parametros_generales: conjunto.parametros_generales.map((parametro) => ({
            clave: parametro.clave,
            valor: numero(formulario.generales[parametro.clave]),
        })),
    };
}

function etiquetaNutriente(criterio: CriterioSello): string {
    return NUTRIENTES.find((nutriente) => nutriente.id === criterio.nutriente)?.etiqueta ?? criterio.nutriente;
}

export default function ParametrosNormativosDetalle() {
    const { id = '' } = useParams();
    const { usuario } = useAuth();
    const navigate = useNavigate();
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
    const [formulario, setFormulario] = useState<Formulario | null>(null);
    const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
    const [procesando, setProcesando] = useState(false);
    const [confirmarPublicacion, setConfirmarPublicacion] = useState(false);
    const [confirmarDescarte, setConfirmarDescarte] = useState(false);
    const [catalogoClases, setCatalogoClases] = useState<string[]>([]);
    const [nuevaClase, setNuevaClase] = useState<Partial<Record<Agregado, string>>>({});

    useEffect(() => {
        let cancelado = false;

        getClasesFuncionalesAditivo()
            .then((clases) => {
                if (!cancelado) setCatalogoClases(clases.map((clase) => clase.nombre));
            })
            .catch((problema) => console.error('Error al cargar las clases funcionales de aditivos:', problema));

        return () => {
            cancelado = true;
        };
    }, []);

    useEffect(() => {
        let cancelado = false;

        getConjuntoParametros(id)
            .then((conjunto) => {
                if (cancelado) return;
                setRespuesta({ clave: id, conjunto, error: false });
                setFormulario(formularioDesde(conjunto));
            })
            .catch((problema) => {
                console.error('Error al cargar la versión de parámetros:', problema);
                if (!cancelado) setRespuesta({ clave: id, conjunto: null, error: true });
            });

        return () => {
            cancelado = true;
        };
    }, [id]);

    const actual = respuesta?.clave === id ? respuesta : null;
    const conjunto = actual?.conjunto ?? null;
    const editable = conjunto?.estado === 'borrador';

    const cambiar = (cambio: Partial<Formulario>) => {
        setFormulario((anterior) => (anterior ? { ...anterior, ...cambio } : anterior));
        setMensaje(null);
    };

    const guardar = async (): Promise<ConjuntoDetalle | null> => {
        if (!conjunto || !formulario) return null;
        setProcesando(true);
        setMensaje(null);
        try {
            const guardado = await modificarBorradorParametros(conjunto.id, cambiosDesde(conjunto, formulario));
            setRespuesta({ clave: id, conjunto: guardado, error: false });
            setFormulario(formularioDesde(guardado));
            return guardado;
        } catch (problema) {
            setMensaje({ tipo: 'error', texto: problema instanceof Error ? problema.message : 'No se pudieron guardar los cambios.' });
            return null;
        } finally {
            setProcesando(false);
        }
    };

    const guardarBorrador = async () => {
        if (await guardar()) setMensaje({ tipo: 'exito', texto: 'Borrador guardado.' });
    };

    const publicar = async () => {
        setConfirmarPublicacion(false);
        if (!usuario) return;
        const guardado = await guardar();
        if (!guardado) return;
        setProcesando(true);
        try {
            const publicado = await publicarParametros(guardado.id, usuario.id);
            setRespuesta({ clave: id, conjunto: publicado, error: false });
            setFormulario(formularioDesde(publicado));
            setMensaje({ tipo: 'exito', texto: `Versión ${publicado.version} publicada.` });
        } catch (problema) {
            setMensaje({ tipo: 'error', texto: problema instanceof Error ? problema.message : 'No se pudo publicar la versión.' });
        } finally {
            setProcesando(false);
        }
    };

    const agregarClase = (agregado: Agregado) => {
        if (!formulario) return;
        const clase = (nuevaClase[agregado] ?? '').trim().toLowerCase();
        if (!clase || formulario.clases[agregado].includes(clase)) return;
        cambiar({ clases: { ...formulario.clases, [agregado]: [...formulario.clases[agregado], clase] } });
        setNuevaClase((anterior) => ({ ...anterior, [agregado]: '' }));
    };

    const quitarClase = (agregado: Agregado, clase: string) => {
        if (!formulario) return;
        cambiar({ clases: { ...formulario.clases, [agregado]: formulario.clases[agregado].filter((actual) => actual !== clase) } });
    };

    const descartar = async () => {
        setConfirmarDescarte(false);
        if (!conjunto) return;
        setProcesando(true);
        try {
            await descartarBorradorParametros(conjunto.id);
            navigate('/configuracion/parametros-normativos');
        } catch (problema) {
            setMensaje({ tipo: 'error', texto: problema instanceof Error ? problema.message : 'No se pudo descartar el borrador.' });
            setProcesando(false);
        }
    };

    if (actual === null) {
        return (
            <div className={styles.contenedorPrincipal}>
                <EncabezadoPagina titulo="Parámetros Normativos" />
                <p className={styles.textMuted}>Cargando versión…</p>
            </div>
        );
    }

    if (conjunto === null || formulario === null) {
        return (
            <div className={styles.contenedorPrincipal}>
                <EncabezadoPagina titulo="Parámetros Normativos" />
                <p className={estilos.mensajeError}>No se encontró la versión de parámetros.</p>
                <Link to="/configuracion/parametros-normativos">
                    <Boton variant="volver">Volver a las versiones</Boton>
                </Link>
            </div>
        );
    }

    const kcalSinAporte = conjunto.parametros_generales.find(
        (parametro) => parametro.clave === 'kcal_bebida_sin_aporte_energetico',
    )?.valor;

    const situacion = editable ? (
        <span className={`${estilos.pastilla} ${estilos.pastillaBorrador}`}>Borrador</span>
    ) : conjunto.vigente ? (
        <span className={`${estilos.pastilla} ${estilos.pastillaVigente}`}>Vigente</span>
    ) : (
        <span className={estilos.pastilla}>Publicada</span>
    );

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo={
                    <>
                        Parámetros Normativos · v{conjunto.version} {situacion}
                    </>
                }
                descripcion={
                    editable
                        ? 'Borrador de una nueva versión. Los cambios no afectan a la versión vigente hasta que se publique.'
                        : 'Versión publicada: es de solo lectura. Para cambiar un valor, creá una nueva versión desde el listado.'
                }
            />

            {editable && (
                <div className={`${estilos.aviso} ${estilos.avisoBorrador}`}>
                    <strong>Al publicar</strong>, esta versión rige desde la fecha indicada para las evaluaciones nuevas. Las
                    evaluaciones ya hechas conservan la versión con la que se calcularon.
                </div>
            )}

            <section className={`${styles.tarjetaEstatica} ${estilos.panel}`}>
                <div className={estilos.panelEncabezado}>
                    <div>
                        <h3>Datos de la versión</h3>
                        <p>Norma de la que surgen los valores y fecha desde la que rigen.</p>
                    </div>
                </div>
                <div className={estilos.datosGenerales}>
                    <label className={estilos.campo}>
                        <span>Norma de origen</span>
                        {editable ? (
                            <input
                                type="text"
                                value={formulario.norma}
                                maxLength={300}
                                onChange={(evento) => cambiar({ norma: evento.target.value })}
                            />
                        ) : (
                            <span className={estilos.valorLectura}>{conjunto.norma_origen}</span>
                        )}
                    </label>
                    <label className={estilos.campo}>
                        <span>Rige desde</span>
                        {editable ? (
                            <input
                                type="date"
                                value={formulario.fecha}
                                onChange={(evento) => cambiar({ fecha: evento.target.value })}
                            />
                        ) : (
                            <span className={estilos.valorLectura}>{formatearFecha(conjunto.fecha_vigencia)}</span>
                        )}
                    </label>
                    <label className={`${estilos.campo} ${estilos.completo}`}>
                        <span>Notas</span>
                        {editable ? (
                            <textarea
                                value={formulario.notas}
                                onChange={(evento) => cambiar({ notas: evento.target.value })}
                            />
                        ) : (
                            <span className={estilos.valorLectura}>{conjunto.notas || '—'}</span>
                        )}
                    </label>
                    <div className={estilos.campo}>
                        <span>Creada</span>
                        <span className={estilos.valorLectura}>
                            {formatearFechaHora(conjunto.fecha_creacion)}
                            {conjunto.creado_por ? ` · ${nombreCompleto(conjunto.creado_por)}` : ' · carga inicial'}
                        </span>
                    </div>
                    <div className={estilos.campo}>
                        <span>Publicada</span>
                        <span className={estilos.valorLectura}>
                            {conjunto.fecha_publicacion
                                ? `${formatearFechaHora(conjunto.fecha_publicacion)}${conjunto.publicado_por ? ` · ${nombreCompleto(conjunto.publicado_por)}` : ''}`
                                : 'Todavía no'}
                        </span>
                    </div>
                </div>
            </section>

            <section className={`${styles.tarjetaEstatica} ${estilos.panel}`}>
                <div className={estilos.panelEncabezado}>
                    <div>
                        <h3>Umbrales de los sellos de exceso</h3>
                        <p>Se alcanza el sello cuando el producto iguala o supera el límite.</p>
                    </div>
                </div>
                {TIPOS.map((tipo) => (
                    <div key={tipo} className={estilos.desplazable} style={{ marginBottom: '18px' }}>
                        <table className={estilos.tabla}>
                            <thead>
                                <tr>
                                    <th>{ETIQUETA_TIPO_PRODUCTO[tipo]}</th>
                                    <th>Nutriente</th>
                                    <th>Límite</th>
                                    <th>Criterio</th>
                                    <th>Factor (kcal/g)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {conjunto.criterios
                                    .filter((criterio) => criterio.tipo_producto === tipo)
                                    .map((criterio) => {
                                        const valores = formulario.criterios[criterio.id];
                                        const condicion = describirCondicion(criterio.condicion, kcalSinAporte);
                                        return (
                                            <tr key={criterio.id}>
                                                <td>
                                                    {ETIQUETA_SELLO[criterio.sello]}
                                                    {condicion && <span className={estilos.condicion}>{condicion}</span>}
                                                </td>
                                                <td>{etiquetaNutriente(criterio)}</td>
                                                <td>
                                                    {editable ? (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            aria-label={`Límite de ${ETIQUETA_SELLO[criterio.sello]}`}
                                                            value={valores.limite}
                                                            onChange={(evento) =>
                                                                cambiar({
                                                                    criterios: {
                                                                        ...formulario.criterios,
                                                                        [criterio.id]: { ...valores, limite: evento.target.value },
                                                                    },
                                                                })
                                                            }
                                                        />
                                                    ) : (
                                                        `≥ ${formatearNumero(criterio.limite)}`
                                                    )}
                                                </td>
                                                <td>{editable ? criterio.unidad : describirCriterio(criterio)}</td>
                                                <td>
                                                    {criterio.factor_energetico === null ? (
                                                        '—'
                                                    ) : editable ? (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            aria-label={`Factor energético de ${ETIQUETA_SELLO[criterio.sello]}`}
                                                            value={valores.factor}
                                                            onChange={(evento) =>
                                                                cambiar({
                                                                    criterios: {
                                                                        ...formulario.criterios,
                                                                        [criterio.id]: { ...valores, factor: evento.target.value },
                                                                    },
                                                                })
                                                            }
                                                        />
                                                    ) : (
                                                        formatearNumero(criterio.factor_energetico)
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                ))}
                {conjunto.parametros_generales.map((parametro) => (
                    <div key={parametro.clave} className={estilos.campo} style={{ maxWidth: '420px' }}>
                        <span>{parametro.descripcion}</span>
                        {editable ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    style={{ width: '110px', margin: 0 }}
                                    value={formulario.generales[parametro.clave]}
                                    onChange={(evento) =>
                                        cambiar({
                                            generales: {
                                                ...formulario.generales,
                                                [parametro.clave]: evento.target.value,
                                            },
                                        })
                                    }
                                />
                                <span className={styles.textMuted}>{parametro.unidad}</span>
                            </div>
                        ) : (
                            <span className={estilos.valorLectura}>
                                {formatearNumero(parametro.valor)} {parametro.unidad}
                            </span>
                        )}
                    </div>
                ))}
            </section>

            <section className={`${styles.tarjetaEstatica} ${estilos.panel}`}>
                <div className={estilos.panelEncabezado}>
                    <div>
                        <h3>Textos de sellos y leyendas</h3>
                        <p>Lo que se imprime en cada octógono y en las leyendas precautorias.</p>
                    </div>
                </div>
                <table className={estilos.tabla}>
                    <tbody>
                        {conjunto.textos.map((texto) => (
                            <tr key={texto.sello}>
                                <td style={{ width: '220px' }}>{ETIQUETA_SELLO[texto.sello]}</td>
                                <td>
                                    {editable ? (
                                        <input
                                            type="text"
                                            maxLength={120}
                                            aria-label={`Texto de ${ETIQUETA_SELLO[texto.sello]}`}
                                            value={formulario.textos[texto.sello] ?? ''}
                                            onChange={(evento) =>
                                                cambiar({ textos: { ...formulario.textos, [texto.sello]: evento.target.value } })
                                            }
                                        />
                                    ) : (
                                        texto.texto
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section className={`${styles.tarjetaEstatica} ${estilos.panel}`}>
                <div className={estilos.panelEncabezado}>
                    <div>
                        <h3>Reglas de aplicabilidad</h3>
                        <p>
                            Qué sellos o leyendas se evalúan según lo que tenga agregado el producto. Si no tiene
                            ninguno, queda exceptuado.
                        </p>
                    </div>
                </div>
                <div className={estilos.desplazable}>
                    <table className={`${estilos.tabla} ${estilos.matriz}`}>
                        <thead>
                            <tr>
                                <th>Si el producto…</th>
                                {SELLOS.map((sello) => (
                                    <th key={sello} className={estilos.centrado}>
                                        {ETIQUETA_SELLO_CORTA[sello]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {AGREGADOS.map((agregado) => (
                                <tr key={agregado}>
                                    <td>{ETIQUETA_AGREGADO[agregado]}</td>
                                    {SELLOS.map((sello) => {
                                        const clave = claveRegla(agregado, sello);
                                        const marcada = formulario.reglas.includes(clave);
                                        return (
                                            <td key={sello} className={estilos.centrado}>
                                                {editable ? (
                                                    <input
                                                        type="checkbox"
                                                        aria-label={`${ETIQUETA_AGREGADO[agregado]}: ${ETIQUETA_SELLO[sello]}`}
                                                        checked={marcada}
                                                        onChange={() =>
                                                            cambiar({
                                                                reglas: marcada
                                                                    ? formulario.reglas.filter((regla) => regla !== clave)
                                                                    : [...formulario.reglas, clave],
                                                            })
                                                        }
                                                    />
                                                ) : marcada ? (
                                                    <i className={`bi bi-check-lg ${estilos.marca}`} aria-label="Sí"></i>
                                                ) : (
                                                    <span className={styles.textMuted}>·</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className={estilos.subseccion}>
                    <h4>Clases de aditivo que marcan al producto</h4>
                    <p>
                        Si la receta vigente usa un aditivo de alguna de estas clases funcionales, se propone la marca
                        correspondiente al evaluar el producto.
                    </p>
                    <table className={estilos.tabla}>
                        <tbody>
                            {AGREGADOS.map((agregado) => (
                                <tr key={agregado}>
                                    <td style={{ width: '200px' }}>{ETIQUETA_AGREGADO[agregado]}</td>
                                    <td>
                                        <div className={estilos.clases}>
                                            {formulario.clases[agregado].map((clase) => (
                                                <span key={clase} className={estilos.pastilla}>
                                                    {clase}
                                                    {editable && (
                                                        <button
                                                            type="button"
                                                            className={estilos.quitarClase}
                                                            aria-label={`Quitar la clase ${clase}`}
                                                            onClick={() => quitarClase(agregado, clase)}
                                                        >
                                                            <i className="bi bi-x" aria-hidden="true"></i>
                                                        </button>
                                                    )}
                                                </span>
                                            ))}
                                            {!editable && formulario.clases[agregado].length === 0 && (
                                                <span className={styles.textMuted}>—</span>
                                            )}
                                            {editable && (
                                                <span className={estilos.agregarClase}>
                                                    <input
                                                        type="text"
                                                        list="catalogo-clases-aditivo"
                                                        maxLength={100}
                                                        placeholder="Clase funcional"
                                                        aria-label={`Nueva clase para ${ETIQUETA_AGREGADO[agregado]}`}
                                                        value={nuevaClase[agregado] ?? ''}
                                                        onChange={(evento) =>
                                                            setNuevaClase((anterior) => ({
                                                                ...anterior,
                                                                [agregado]: evento.target.value,
                                                            }))
                                                        }
                                                        onKeyDown={(evento) => {
                                                            if (evento.key === 'Enter') agregarClase(agregado);
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className={estilos.botonTexto}
                                                        onClick={() => agregarClase(agregado)}
                                                    >
                                                        <i className="bi bi-plus-lg" aria-hidden="true"></i> Agregar
                                                    </button>
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <datalist id="catalogo-clases-aditivo">
                        {catalogoClases.map((clase) => (
                            <option key={clase} value={clase} />
                        ))}
                    </datalist>
                </div>
            </section>

            <section className={`${styles.tarjetaEstatica} ${estilos.panel}`}>
                <div className={estilos.panelEncabezado}>
                    <div>
                        <h3>Productos exceptuados</h3>
                        <p>Categorías que no llevan rotulado frontal aunque se envasen en ausencia del cliente.</p>
                    </div>
                </div>
                {editable ? (
                    <>
                        {formulario.excepciones.map((excepcion, posicion) => (
                            <div key={posicion} className={estilos.filaExcepcion}>
                                <input
                                    type="text"
                                    maxLength={300}
                                    aria-label={`Excepción ${posicion + 1}`}
                                    value={excepcion}
                                    onChange={(evento) =>
                                        cambiar({
                                            excepciones: formulario.excepciones.map((actualTexto, indice) =>
                                                indice === posicion ? evento.target.value : actualTexto,
                                            ),
                                        })
                                    }
                                />
                                <button
                                    type="button"
                                    className={estilos.botonQuitar}
                                    title="Quitar excepción"
                                    onClick={() =>
                                        cambiar({ excepciones: formulario.excepciones.filter((_, indice) => indice !== posicion) })
                                    }
                                >
                                    <i className="bi bi-x-lg" aria-hidden="true"></i>
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            className={estilos.botonTexto}
                            onClick={() => cambiar({ excepciones: [...formulario.excepciones, ''] })}
                        >
                            <i className="bi bi-plus-lg" aria-hidden="true"></i> Agregar excepción
                        </button>
                    </>
                ) : (
                    <ol className={estilos.excepciones}>
                        {conjunto.excepciones.map((excepcion) => (
                            <li key={excepcion.id}>{excepcion.descripcion}</li>
                        ))}
                    </ol>
                )}
            </section>

            {mensaje && (
                <p
                    className={mensaje.tipo === 'error' ? estilos.mensajeError : styles.textSuccess}
                    style={{ maxWidth: '1100px', width: '100%', textAlign: 'right' }}
                >
                    {mensaje.texto}
                </p>
            )}

            <div className={estilos.acciones}>
                <Link to="/configuracion/parametros-normativos" style={{ marginRight: 'auto' }}>
                    <Boton variant="volver">Volver a las versiones</Boton>
                </Link>
                {editable && (
                    <>
                        <Boton variant="eliminar" onClick={() => setConfirmarDescarte(true)} disabled={procesando}>
                            Descartar borrador
                        </Boton>
                        <Boton variant="guardar" onClick={guardarBorrador} disabled={procesando}>
                            Guardar borrador
                        </Boton>
                        <Boton variant="crear" onClick={() => setConfirmarPublicacion(true)} disabled={procesando}>
                            Publicar versión
                        </Boton>
                    </>
                )}
            </div>

            <ModalConfirmacion
                isOpen={confirmarDescarte}
                titulo="Descartar borrador"
                mensaje={`Se va a eliminar el borrador v${conjunto.version} con todos sus cambios. La versión vigente no se modifica.`}
                onConfirm={descartar}
                onCancel={() => setConfirmarDescarte(false)}
            />

            {confirmarPublicacion && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>Publicar versión {conjunto.version}</h3>
                        <p>
                            Una vez publicada no se puede modificar. Rige desde el{' '}
                            {formulario.fecha ? formatearFecha(formulario.fecha) : '—'} para las evaluaciones nuevas.
                        </p>
                        <div className={styles.filaBotones}>
                            <Boton variant="volver" onClick={() => setConfirmarPublicacion(false)}>
                                Cancelar
                            </Boton>
                            <Boton variant="crear" onClick={publicar}>
                                Publicar
                            </Boton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
