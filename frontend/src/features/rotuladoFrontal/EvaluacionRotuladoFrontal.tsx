import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { Agregado, ConjuntoDetalle } from '../../types/parametrosNormativos';
import type {
    EstadoRotuladoProducto,
    EvaluacionRotulado,
    MarcasAgregados,
    PropuestaMarcas,
    RespuestasAplicabilidad,
    ResultadoCalculoSellos,
} from '../../types/rotuladoFrontal';
import { getModuloRotuladoFrontal, getParametrosVigentes } from '../../services/parametrosNormativosServices';
import {
    calcularSellos,
    evaluarRotulado,
    getCalculoSellos,
    getHistorialRotulado,
    getPropuestaMarcas,
    getRotuladoProducto,
} from '../../services/rotuladoFrontalServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import { formatearFechaHora, nombreCompleto } from '../datosNutricionales/nutrientes';
import { ETIQUETA_TIPO_PRODUCTO, formatearFecha } from '../productos/formatoProducto';
import {
    AGREGADOS,
    CAMPO_AGREGADO,
    ETIQUETA_AGREGADO,
    ETIQUETA_AGREGADO_CORTA,
    ETIQUETA_SELLO_CORTA,
    RESULTADO,
    origenDeMarcas,
} from '../parametrosNormativos/etiquetas';
import ModuloDesactivado from './ModuloDesactivado';
import ResultadoRotulado from './ResultadoRotulado';
import OctogonoAdvertencia from './OctogonoAdvertencia';
import LeyendaPrecaucion from './LeyendaPrecaucion';
import TablaCalculoPasoAPaso from './TablaCalculoPasoAPaso';
import estilos from './RotuladoFrontal.module.css';
import styles from '../../styles/shared.module.css';

interface Datos {
    estado: EstadoRotuladoProducto;
    historial: EvaluacionRotulado[];
    parametros: ConjuntoDetalle | null;
    propuesta: PropuestaMarcas | null;
    calculoSellos: ResultadoCalculoSellos | null;
}

interface Respuesta {
    clave: string;
    activo: boolean;
    datos: Datos | null;
    error: string;
}

interface Formulario {
    envasado: boolean | null;
    excepcion: string;
    marcas: Record<Agregado, boolean>;
}

const AYUDA_AGREGADO: Record<Agregado, string> = {
    azucares: 'Azúcar, miel, jarabes u otros ingredientes con azúcares libres.',
    grasas: 'Manteca, aceites, margarina u otras grasas agregadas.',
    sodio: 'Sal u otros ingredientes o aditivos con sodio.',
    edulcorantes: 'Algún ingrediente o aditivo de clase edulcorante.',
    cafeina: 'Café, té, guaraná u otra fuente de cafeína.',
};

function marcasDe(origen: MarcasAgregados | null): Record<Agregado, boolean> {
    return Object.fromEntries(
        AGREGADOS.map((agregado) => [agregado, origen ? origen[CAMPO_AGREGADO[agregado]] : false]),
    ) as Record<Agregado, boolean>;
}

function formularioDesde(evaluacion: EvaluacionRotulado | null, propuesta: PropuestaMarcas | null): Formulario {
    const recetaVigente = propuesta?.tiene_receta ? propuesta : null;
    return {
        envasado: evaluacion ? evaluacion.envasado_en_ausencia_del_cliente : null,
        excepcion: evaluacion?.excepcion ?? '',
        marcas: marcasDe(evaluacion ?? recetaVigente),
    };
}

async function cargar(productoId: string): Promise<Omit<Respuesta, 'clave'>> {
    const modulo = await getModuloRotuladoFrontal();
    if (!modulo.activo) return { activo: false, datos: null, error: '' };
    const [estado, historial] = await Promise.all([getRotuladoProducto(productoId), getHistorialRotulado(productoId)]);
    const [parametros, propuesta, calculoSellos] = await Promise.all([
        getParametrosVigentes().catch(() => null),
        getPropuestaMarcas(productoId).catch(() => null),
        getCalculoSellos(productoId).catch(() => null),
    ]);
    return { activo: true, datos: { estado, historial, parametros, propuesta, calculoSellos }, error: '' };
}

export default function EvaluacionRotuladoFrontal() {
    const { id = '' } = useParams();
    const { usuario } = useAuth();
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
    const [formulario, setFormulario] = useState<Formulario>(formularioDesde(null, null));
    const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [calculoSellos, setCalculoSellos] = useState<ResultadoCalculoSellos | null>(null);
    const [calculandoSellos, setCalculandoSellos] = useState(false);
    const [mostrarDesglose, setMostrarDesglose] = useState(false);

    useEffect(() => {
        let cancelado = false;

        cargar(id)
            .then((resultado) => {
                if (cancelado) return;
                setRespuesta({ clave: id, ...resultado });
                setCalculoSellos(resultado.datos?.calculoSellos ?? null);
                setFormulario(
                    formularioDesde(resultado.datos?.estado.evaluacion ?? null, resultado.datos?.propuesta ?? null),
                );
            })
            .catch((problema) => {
                console.error('Error al cargar el rotulado frontal del producto:', problema);
                if (!cancelado) {
                    setRespuesta({
                        clave: id,
                        activo: true,
                        datos: null,
                        error: problema instanceof Error ? problema.message : 'No se pudo cargar el producto.',
                    });
                }
            });

        return () => {
            cancelado = true;
        };
    }, [id]);

    const actual = respuesta?.clave === id ? respuesta : null;
    const datos = actual?.datos ?? null;
    const producto = datos?.estado.producto ?? null;
    const evaluacion = datos?.estado.evaluacion ?? null;
    const parametros = datos?.parametros ?? null;
    const propuesta = datos?.propuesta?.tiene_receta ? datos.propuesta : null;
    const marcasPropuestas = propuesta ? marcasDe(propuesta) : null;
    const difiereDeLaReceta =
        marcasPropuestas !== null && AGREGADOS.some((agregado) => marcasPropuestas[agregado] !== formulario.marcas[agregado]);

    const cambiar = (cambio: Partial<Formulario>) => {
        setFormulario((anterior) => ({ ...anterior, ...cambio }));
        setMensaje(null);
    };

    const guardar = async () => {
        if (!usuario || !datos || formulario.envasado === null) return;
        setGuardando(true);
        setMensaje(null);
        const respuestas: RespuestasAplicabilidad = {
            envasado_en_ausencia_del_cliente: formulario.envasado,
            excepcion: formulario.envasado && formulario.excepcion ? formulario.excepcion : null,
            agrega_azucares: formulario.marcas.azucares,
            agrega_grasas: formulario.marcas.grasas,
            agrega_sodio: formulario.marcas.sodio,
            contiene_edulcorantes: formulario.marcas.edulcorantes,
            contiene_cafeina: formulario.marcas.cafeina,
        };
        try {
            const nueva = await evaluarRotulado(id, usuario.id, respuestas);
            setRespuesta({
                clave: id,
                activo: true,
                error: '',
                datos: { ...datos, estado: { ...datos.estado, evaluacion: nueva }, historial: [nueva, ...datos.historial] },
            });
            setFormulario(formularioDesde(nueva, datos.propuesta));
            setMensaje({ tipo: 'exito', texto: 'Evaluación guardada.' });
        } catch (problema) {
            setMensaje({ tipo: 'error', texto: problema instanceof Error ? problema.message : 'No se pudo guardar la evaluación.' });
        } finally {
            setGuardando(false);
        }
    };

    const ejecutarCalculoSellos = async () => {
        if (!usuario) return;
        try {
            setCalculandoSellos(true);
            const resultado = await calcularSellos(id, usuario.id);
            setCalculoSellos(resultado);
            setMostrarDesglose(true);
        } catch (problema) {
            console.error('Error al calcular sellos:', problema);
            setMensaje({
                tipo: 'error',
                texto: problema instanceof Error ? problema.message : 'No se pudo calcular los sellos de advertencia.',
            });
        } finally {
            setCalculandoSellos(false);
        }
    };

    const columnasHistorial: Columna<EvaluacionRotulado>[] = [
        {
            key: 'fecha',
            encabezado: 'Fecha',
            ordenable: true,
            variant: 'fecha',
            render: (item) => formatearFechaHora(item.fecha),
        },
        {
            key: 'resultado',
            encabezado: 'Resultado',
            render: (item) => RESULTADO[item.resultado].titulo,
        },
        {
            key: 'sellos',
            encabezado: 'Sellos y leyendas',
            render: (item) => {
                const sellos = [...item.sellos_a_evaluar, ...item.leyendas];
                return sellos.length === 0 ? '—' : sellos.map((sello) => ETIQUETA_SELLO_CORTA[sello.sello]).join(', ');
            },
        },
        {
            key: 'marcas',
            encabezado: 'Marcas',
            render: (item) => origenDeMarcas(item),
        },
        {
            key: 'parametros',
            encabezado: 'Parámetros',
            render: (item) => `v${item.parametros.version}`,
        },
        {
            key: 'evaluado_por',
            encabezado: 'Evaluado por',
            render: (item) => nombreCompleto(item.evaluado_por),
        },
    ];

    const volver = (
        <Link to="/rotulado-frontal">
            <Boton variant="volver">Volver al listado</Boton>
        </Link>
    );

    if (actual === null) {
        return (
            <div className={styles.contenedorPrincipal}>
                <EncabezadoPagina titulo="Rotulado Frontal" ancho="900px" />
                <p className={styles.textMuted}>Cargando producto…</p>
            </div>
        );
    }

    if (!actual.activo) {
        return (
            <div className={styles.contenedorPrincipal}>
                <EncabezadoPagina titulo="Rotulado Frontal" ancho="900px" />
                <ModuloDesactivado />
                {volver}
            </div>
        );
    }

    if (producto === null) {
        return (
            <div className={styles.contenedorPrincipal}>
                <EncabezadoPagina titulo="Rotulado Frontal" ancho="900px" />
                <p className={estilos.mensajeError}>{actual.error || 'No se encontró el producto.'}</p>
                {volver}
            </div>
        );
    }

    const sinCategoria = formulario.envasado === true && formulario.excepcion === '';

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo={`Rotulado Frontal · ${producto.nombre}`}
                descripcion={`${ETIQUETA_TIPO_PRODUCTO[producto.tipo]}. Respondé las preguntas para saber si le corresponde el sistema de advertencias y qué sellos o leyendas hay que evaluar.`}
                ancho="900px"
                acciones={
                    <Link to={`/productos/${producto.id}`}>
                        <Boton variant="ver">Ver producto</Boton>
                    </Link>
                }
            />

            {evaluacion && (
                <section className={`${styles.tarjetaEstatica} ${estilos.panel}`}>
                    <h3>Resultado actual</h3>
                    <p className={estilos.ayuda}>Según la última evaluación guardada.</p>
                    <ResultadoRotulado evaluacion={evaluacion} />
                </section>
            )}

            {evaluacion && (
                <section className={`${styles.tarjetaEstatica} ${estilos.panel}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>Cálculo de Sellos de Advertencia (Ley 27.642)</h3>
                            <p className={estilos.ayuda} style={{ marginTop: '0.25rem' }}>
                                Evaluación matemática de nutrientes críticos sobre la versión de receta vigente.
                            </p>
                        </div>
                        {usuario && (
                            <Boton
                                variant="crear"
                                onClick={ejecutarCalculoSellos}
                                disabled={calculandoSellos}
                            >
                                {calculandoSellos ? 'Calculando...' : 'Calcular / Recalcular sellos'}
                            </Boton>
                        )}
                    </div>

                    {calculoSellos?.provisorio && (
                        <div
                            style={{
                                backgroundColor: 'rgba(234, 179, 8, 0.15)',
                                border: '1px solid #eab308',
                                color: '#facc15',
                                borderRadius: '6px',
                                padding: '10px 14px',
                                margin: '1rem 0',
                                fontSize: '0.88rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            <i className="bi bi-exclamation-triangle-fill"></i>
                            <span>
                                CÁLCULO PROVISORIO:{' '}
                                {calculoSellos.motivo_aplicabilidad ?? 'La receta vigente tiene insumos con datos nutricionales incompletos.'}
                            </span>
                        </div>
                    )}

                    {calculoSellos && evaluacion && evaluacion.fecha > (calculoSellos.fecha_calculo ?? '') && (
                        <p className={estilos.mensajeError}>
                            La evaluación cambió después del último cálculo: recalculá los sellos para actualizar el resultado.
                        </p>
                    )}

                    {calculoSellos && !calculoSellos.provisorio && calculoSellos.motivo_aplicabilidad && (
                        <p className={estilos.ayuda}>{calculoSellos.motivo_aplicabilidad}</p>
                    )}

                    {calculoSellos && (
                        <div style={{ marginTop: '1rem' }}>
                            <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                                <div>
                                    <strong>Versión de Parámetros:</strong> v{calculoSellos.parametros.version}, vigente desde el{' '}
                                    {formatearFecha(calculoSellos.parametros.fecha_vigencia)} ({calculoSellos.parametros.norma_origen})
                                </div>
                                {calculoSellos.version_receta && (
                                    <div>
                                        <strong>Versión de Receta:</strong> v{calculoSellos.version_receta}
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-h)' }}>Sellos y Advertencias Resultantes</h4>
                                {calculoSellos.sellos_obtenidos.length === 0 && calculoSellos.leyendas_obtenidas.length === 0 ? (
                                    <p className={styles.textMuted} style={{ fontStyle: 'italic' }}>
                                        ✓ No le corresponden sellos de exceso ni leyendas precautorias.
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '0.5rem' }}>
                                        {calculoSellos.sellos_obtenidos.map((s) => (
                                            <OctogonoAdvertencia key={s.sello} sello={s.sello} texto={s.texto} />
                                        ))}
                                        {calculoSellos.leyendas_obtenidas.map((l) => (
                                            <LeyendaPrecaucion key={l.sello} sello={l.sello} texto={l.texto} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {calculoSellos.pasos_calculo.length > 0 && (
                                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                    <button
                                        type="button"
                                        className={estilos.botonTexto}
                                        onClick={() => setMostrarDesglose(!mostrarDesglose)}
                                        style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--accent)' }}
                                    >
                                        <i className={`bi ${mostrarDesglose ? 'bi-chevron-up' : 'bi-chevron-down'}`} style={{ marginRight: '6px' }}></i>
                                        {mostrarDesglose ? 'Ocultar desglose matemático paso a paso' : 'Ver desglose matemático paso a paso por nutriente'}
                                    </button>

                                    {mostrarDesglose && (
                                        <TablaCalculoPasoAPaso pasos={calculoSellos.pasos_calculo} />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}

            <section className={`${styles.tarjetaEstatica} ${estilos.panel}`}>
                <h3>{evaluacion ? 'Corregir la evaluación' : 'Evaluar el producto'}</h3>
                <p className={estilos.ayuda}>
                    {parametros
                        ? `Se aplican los parámetros vigentes v${parametros.version} (rigen desde el ${formatearFecha(parametros.fecha_vigencia)}). Cada cambio queda registrado como una evaluación nueva.`
                        : 'No hay parámetros normativos vigentes: no se puede evaluar hasta publicar una versión.'}
                </p>

                <div className={estilos.pregunta}>
                    <strong>¿El producto se vende envasado en ausencia del cliente?</strong>
                    <div className={estilos.opciones}>
                        {[true, false].map((valor) => (
                            <label
                                key={String(valor)}
                                className={`${estilos.opcion} ${formulario.envasado === valor ? estilos.opcionMarcada : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="envasado"
                                    checked={formulario.envasado === valor}
                                    onChange={() => cambiar({ envasado: valor })}
                                />
                                {valor ? 'Sí, se envasa antes de la venta' : 'No, se vende suelto o se envasa frente al cliente'}
                            </label>
                        ))}
                    </div>
                </div>

                {formulario.envasado === true && parametros && (
                    <div className={estilos.pregunta}>
                        <strong>¿Pertenece a alguna categoría exceptuada?</strong>
                        <select
                            value={formulario.excepcion}
                            onChange={(evento) => cambiar({ excepcion: evento.target.value })}
                        >
                            <option value="">No, ninguna</option>
                            {parametros.excepciones.map((excepcion) => (
                                <option key={excepcion.id} value={excepcion.descripcion}>
                                    {excepcion.descripcion}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {sinCategoria && (
                    <div className={estilos.pregunta}>
                        <strong>¿Qué tiene agregado el producto?</strong>
                        {propuesta ? (
                            <div className={estilos.propuesta}>
                                <div className={estilos.propuestaEncabezado}>
                                    <span>
                                        <i className="bi bi-journal-text" aria-hidden="true"></i> Propuesta desde la receta
                                        v{propuesta.version_receta}
                                    </span>
                                    {difiereDeLaReceta && (
                                        <button
                                            type="button"
                                            className={estilos.botonTexto}
                                            onClick={() => cambiar({ marcas: marcasDe(propuesta) })}
                                        >
                                            <i className="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Volver a la
                                            propuesta
                                        </button>
                                    )}
                                </div>
                                {propuesta.origenes.length > 0 ? (
                                    <ul className={estilos.origenes}>
                                        {propuesta.origenes.map((origen) => (
                                            <li key={`${origen.agregado}-${origen.insumo}-${origen.aditivo ?? ''}`}>
                                                <strong>{ETIQUETA_AGREGADO_CORTA[origen.agregado]}</strong>:{' '}
                                                {origen.aditivo
                                                    ? `aditivo ${origen.aditivo} (clase ${origen.clase_funcional})`
                                                    : `insumo ${origen.insumo}`}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>Ningún insumo ni aditivo de la receta marca agregados.</p>
                                )}
                                {propuesta.insumos_sin_revisar.length > 0 && (
                                    <p className={estilos.advertencia}>
                                        <i className="bi bi-exclamation-triangle" aria-hidden="true"></i> Sin revisar:{' '}
                                        {propuesta.insumos_sin_revisar.map((insumo) => insumo.nombre).join(', ')}. Sus
                                        marcas se cargan en <Link to="/rotulado-frontal/insumos">Marcas de insumos</Link>.
                                    </p>
                                )}
                                {difiereDeLaReceta && (
                                    <p className={estilos.advertencia}>
                                        <i className="bi bi-pencil" aria-hidden="true"></i> Las marcas difieren de la receta:
                                        la evaluación queda registrada como corregida a mano.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className={estilos.ayuda}>
                                El producto no tiene una receta vigente: marcá según los ingredientes y aditivos de la
                                elaboración. Si no tiene ninguno, queda exceptuado.
                            </p>
                        )}
                        <div className={estilos.opciones}>
                            {AGREGADOS.map((agregado) => (
                                <label
                                    key={agregado}
                                    className={`${estilos.opcion} ${formulario.marcas[agregado] ? estilos.opcionMarcada : ''}`}
                                    title={AYUDA_AGREGADO[agregado]}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formulario.marcas[agregado]}
                                        onChange={() =>
                                            cambiar({
                                                marcas: { ...formulario.marcas, [agregado]: !formulario.marcas[agregado] },
                                            })
                                        }
                                    />
                                    {ETIQUETA_AGREGADO[agregado]}
                                    {marcasPropuestas?.[agregado] && <span className={estilos.etiquetaReceta}>receta</span>}
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {mensaje && (
                    <p className={mensaje.tipo === 'error' ? estilos.mensajeError : estilos.mensajeExito}>{mensaje.texto}</p>
                )}

                <div className={estilos.acciones}>
                    {volver}
                    <Boton
                        variant="guardar"
                        onClick={guardar}
                        disabled={guardando || formulario.envasado === null || parametros === null}
                    >
                        Guardar evaluación
                    </Boton>
                </div>
            </section>

            {datos && datos.historial.length > 0 && (
                <section className={`${styles.tarjetaEstatica} ${estilos.panel}`}>
                    <h3>Historial de evaluaciones</h3>
                    <p className={estilos.ayuda}>Cada evaluación conserva la versión de parámetros con la que se hizo.</p>
                    <TablaPaginada
                        datos={datos.historial}
                        columnas={columnasHistorial}
                        gridTemplateColumns="1.1fr 1.2fr 1.7fr 1.3fr 0.9fr 1.1fr"
                        itemsPorPagina={5}
                        columnaOrdenInicial="fecha"
                        ordenAscInicial={false}
                        permitirExportar={false}
                    />
                </section>
            )}
        </div>
    );
}
