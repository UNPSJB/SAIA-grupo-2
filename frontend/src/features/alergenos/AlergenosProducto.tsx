import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { Alergeno, DetalleAlergenosProducto, UnidadDuracion } from '../../types/alergenos';
import {
    getAlergenosProducto,
    guardarConservacion,
    guardarDeclaracionAlergenos,
} from '../../services/alergenosServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { formatearFechaHora, nombreCompleto } from '../datosNutricionales/nutrientes';
import { ETIQUETA_TIPO_PRODUCTO } from '../productos/formatoProducto';
import { ALERGENOS, AYUDA_ALERGENO, ETIQUETA_ALERGENO, leyendaAlergenos } from './etiquetas';
import estilos from './Alergenos.module.css';
import styles from '../../styles/shared.module.css';

interface Respuesta {
    clave: string;
    detalle: DetalleAlergenosProducto | null;
    error: string;
}

interface FormularioDeclaracion {
    contiene: Alergeno[];
    gluten: boolean;
    puedeContener: Alergeno[];
}

interface FormularioConservacion {
    minima: string;
    maxima: string;
    duracion: string;
    unidad: UnidadDuracion;
    instrucciones: string;
}

type Mensaje = { tipo: 'exito' | 'error'; texto: string } | null;

function declaracionDesde(detalle: DetalleAlergenosProducto): FormularioDeclaracion {
    if (detalle.declaracion) {
        return {
            contiene: detalle.declaracion.contiene,
            gluten: detalle.declaracion.contiene_gluten,
            puedeContener: detalle.declaracion.puede_contener,
        };
    }
    return propuestaComoFormulario(detalle, []);
}

function propuestaComoFormulario(detalle: DetalleAlergenosProducto, puedeContener: Alergeno[]): FormularioDeclaracion {
    return {
        contiene: detalle.propuesta.contiene.map((item) => item.alergeno),
        gluten: detalle.propuesta.contiene_gluten,
        puedeContener,
    };
}

function conservacionDesde(detalle: DetalleAlergenosProducto): FormularioConservacion {
    const datos = detalle.conservacion;
    const texto = (valor: number | null | undefined) => (valor === null || valor === undefined ? '' : String(valor));
    return {
        minima: texto(datos?.temperatura_minima),
        maxima: texto(datos?.temperatura_maxima),
        duracion: texto(datos?.duracion),
        unidad: datos?.unidad_duracion ?? 'dias',
        instrucciones: datos?.instrucciones ?? '',
    };
}

function mismosAlergenos(a: Alergeno[], b: Alergeno[]): boolean {
    return a.length === b.length && a.every((alergeno) => b.includes(alergeno));
}

function numeroOpcional(texto: string): number | null {
    const limpio = texto.trim().replace(',', '.');
    return limpio === '' ? null : Number(limpio);
}

export default function AlergenosProducto() {
    const { id = '' } = useParams();
    const { usuario } = useAuth();
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
    const [declaracion, setDeclaracion] = useState<FormularioDeclaracion>({ contiene: [], gluten: false, puedeContener: [] });
    const [conservacion, setConservacion] = useState<FormularioConservacion>({
        minima: '',
        maxima: '',
        duracion: '',
        unidad: 'dias',
        instrucciones: '',
    });
    const [mensajeDeclaracion, setMensajeDeclaracion] = useState<Mensaje>(null);
    const [mensajeConservacion, setMensajeConservacion] = useState<Mensaje>(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let cancelado = false;

        getAlergenosProducto(id)
            .then((detalle) => {
                if (cancelado) return;
                setRespuesta({ clave: id, detalle, error: '' });
                setDeclaracion(declaracionDesde(detalle));
                setConservacion(conservacionDesde(detalle));
            })
            .catch((problema) => {
                console.error('Error al cargar los alérgenos del producto:', problema);
                if (!cancelado) {
                    setRespuesta({
                        clave: id,
                        detalle: null,
                        error: problema instanceof Error ? problema.message : 'No se pudo cargar el producto.',
                    });
                }
            });

        return () => {
            cancelado = true;
        };
    }, [id]);

    const actual = respuesta?.clave === id ? respuesta : null;
    const detalle = actual?.detalle ?? null;

    const volver = (
        <Link to="/alergenos">
            <Boton variant="volver">Volver al listado</Boton>
        </Link>
    );

    if (actual === null || detalle === null) {
        return (
            <div className={styles.contenedorPrincipal}>
                <EncabezadoPagina titulo="Alérgenos y Conservación" ancho="960px" />
                {actual === null ? (
                    <p className={styles.textMuted}>Cargando producto…</p>
                ) : (
                    <>
                        <p className={estilos.mensajeError}>{actual.error || 'No se encontró el producto.'}</p>
                        {volver}
                    </>
                )}
            </div>
        );
    }

    const { producto, propuesta } = detalle;
    const guardada = detalle.declaracion;
    const propuestos = propuesta.contiene.map((item) => item.alergeno);
    const difiereDeLaPropuesta =
        propuesta.tiene_receta &&
        (!mismosAlergenos(declaracion.contiene, propuestos) || declaracion.gluten !== propuesta.contiene_gluten);

    const alternar = (lista: Alergeno[], alergeno: Alergeno) =>
        lista.includes(alergeno) ? lista.filter((actualAlergeno) => actualAlergeno !== alergeno) : [...lista, alergeno];

    const cambiarDeclaracion = (cambio: Partial<FormularioDeclaracion>) => {
        setDeclaracion((anterior) => ({ ...anterior, ...cambio }));
        setMensajeDeclaracion(null);
    };

    const cambiarConservacion = (cambio: Partial<FormularioConservacion>) => {
        setConservacion((anterior) => ({ ...anterior, ...cambio }));
        setMensajeConservacion(null);
    };

    const actualizar = (nuevo: DetalleAlergenosProducto) => {
        setRespuesta({ clave: id, detalle: nuevo, error: '' });
    };

    const guardarDeclaracion = async (confirmar: boolean) => {
        if (!usuario) return;
        setGuardando(true);
        setMensajeDeclaracion(null);
        try {
            const nuevo = await guardarDeclaracionAlergenos(id, usuario.id, {
                contiene: declaracion.contiene,
                contiene_gluten: declaracion.gluten,
                puede_contener: declaracion.puedeContener.filter((alergeno) => !declaracion.contiene.includes(alergeno)),
                confirmar,
            });
            actualizar(nuevo);
            setDeclaracion(declaracionDesde(nuevo));
            setMensajeDeclaracion({
                tipo: 'exito',
                texto: confirmar ? 'Declaración confirmada.' : 'Declaración guardada, pendiente de confirmación.',
            });
        } catch (problema) {
            setMensajeDeclaracion({
                tipo: 'error',
                texto: problema instanceof Error ? problema.message : 'No se pudo guardar la declaración.',
            });
        } finally {
            setGuardando(false);
        }
    };

    const guardarCondiciones = async () => {
        if (!usuario) return;
        const minima = numeroOpcional(conservacion.minima);
        const maxima = numeroOpcional(conservacion.maxima);
        const duracion = numeroOpcional(conservacion.duracion);
        if ([minima, maxima, duracion].some((valor) => valor !== null && Number.isNaN(valor))) {
            setMensajeConservacion({ tipo: 'error', texto: 'Las temperaturas y la duración deben ser números.' });
            return;
        }
        if (duracion !== null && (!Number.isInteger(duracion) || duracion <= 0)) {
            setMensajeConservacion({ tipo: 'error', texto: 'La duración debe ser un número entero mayor a cero.' });
            return;
        }
        setGuardando(true);
        setMensajeConservacion(null);
        try {
            const nuevo = await guardarConservacion(id, usuario.id, {
                temperatura_minima: minima,
                temperatura_maxima: maxima,
                duracion,
                unidad_duracion: conservacion.unidad,
                instrucciones: conservacion.instrucciones.trim() || null,
            });
            actualizar(nuevo);
            setConservacion(conservacionDesde(nuevo));
            setMensajeConservacion({ tipo: 'exito', texto: 'Condiciones de conservación guardadas.' });
        } catch (problema) {
            setMensajeConservacion({
                tipo: 'error',
                texto: problema instanceof Error ? problema.message : 'No se pudieron guardar las condiciones.',
            });
        } finally {
            setGuardando(false);
        }
    };

    const estado =
        guardada?.estado === 'confirmada' ? (
            <span className={`${estilos.pastilla} ${estilos.pastillaConfirmada}`}>Confirmada</span>
        ) : (
            <span className={`${estilos.pastilla} ${estilos.pastillaSugerida}`}>Sugerida por el sistema</span>
        );

    const leyendaContiene = leyendaAlergenos('CONTIENE', declaracion.contiene);
    const leyendaPuedeContener = leyendaAlergenos(
        'PUEDE CONTENER',
        declaracion.puedeContener.filter((alergeno) => !declaracion.contiene.includes(alergeno)),
    );

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo={`Alérgenos y Conservación · ${producto.nombre}`}
                descripcion={`${ETIQUETA_TIPO_PRODUCTO[producto.tipo]}. Las declaraciones se ubican inmediatamente después de la lista de ingredientes, en mayúscula y negrita (art. 235 séptimo del CAA).`}
                ancho="960px"
                acciones={
                    <Link to={`/productos/${producto.id}`}>
                        <Boton variant="ver">Ver producto</Boton>
                    </Link>
                }
            />

            {detalle.propuesta_cambio && (
                <div className={estilos.aviso}>
                    <strong>La propuesta del sistema cambió</strong> desde la última vez que se guardó la declaración: cambió
                    la receta o las marcas de sus insumos. Revisala y volvé a confirmar.
                </div>
            )}

            <section className={`${styles.tarjetaEstatica} ${estilos.panel}`}>
                <div className={estilos.panelEncabezado}>
                    <div>
                        <h3>Declaración de alérgenos y gluten</h3>
                        <p className={estilos.ayuda}>
                            Queda como sugerida por el sistema hasta que una persona con permiso de administrar la confirme.
                        </p>
                    </div>
                    {estado}
                </div>

                {propuesta.tiene_receta ? (
                    <div className={estilos.propuesta}>
                        <strong>
                            <i className="bi bi-journal-text" aria-hidden="true"></i> Propuesta según la receta v
                            {propuesta.version_receta}
                        </strong>
                        {propuesta.contiene.length > 0 || propuesta.contiene_gluten ? (
                            <ul>
                                {propuesta.contiene.map((item) => (
                                    <li key={item.alergeno}>
                                        <strong>{ETIQUETA_ALERGENO[item.alergeno]}</strong>: {item.insumos.join(', ')}
                                    </li>
                                ))}
                                {propuesta.contiene_gluten && (
                                    <li>
                                        <strong>Gluten</strong>: {propuesta.insumos_con_gluten.join(', ')}
                                    </li>
                                )}
                            </ul>
                        ) : (
                            <p>Ningún insumo de la receta tiene alérgenos ni gluten marcados.</p>
                        )}
                        {propuesta.insumos_sin_revisar.length > 0 && (
                            <p className={estilos.advertencia}>
                                <i className="bi bi-exclamation-triangle" aria-hidden="true"></i> Sin revisar:{' '}
                                {propuesta.insumos_sin_revisar.map((insumo) => insumo.nombre).join(', ')}. Sus marcas se
                                cargan en <Link to="/alergenos/insumos">Marcas de insumos</Link>.
                            </p>
                        )}
                        {difiereDeLaPropuesta && (
                            <p>
                                <button
                                    type="button"
                                    className={estilos.botonTexto}
                                    onClick={() => cambiarDeclaracion(propuestaComoFormulario(detalle, declaracion.puedeContener))}
                                >
                                    <i className="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Volver a la propuesta
                                </button>
                            </p>
                        )}
                    </div>
                ) : (
                    <p className={estilos.ayuda} style={{ marginBottom: '14px' }}>
                        El producto no tiene una receta vigente, así que el sistema no puede proponer nada: marcá a mano lo
                        que corresponda.
                    </p>
                )}

                <div className={estilos.grupo}>
                    <strong>Contiene</strong>
                    <p>Alérgenos presentes como ingrediente o como parte de otro ingrediente.</p>
                    <div className={estilos.opciones}>
                        {ALERGENOS.map((alergeno) => (
                            <label
                                key={alergeno}
                                title={AYUDA_ALERGENO[alergeno]}
                                className={`${estilos.opcion} ${declaracion.contiene.includes(alergeno) ? estilos.opcionMarcada : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={declaracion.contiene.includes(alergeno)}
                                    onChange={() => cambiarDeclaracion({ contiene: alternar(declaracion.contiene, alergeno) })}
                                />
                                {ETIQUETA_ALERGENO[alergeno]}
                                {propuestos.includes(alergeno) && <span className={estilos.etiquetaSugerida}>receta</span>}
                            </label>
                        ))}
                    </div>
                </div>

                <div className={estilos.grupo}>
                    <strong>Gluten</strong>
                    <p>
                        Que no haya ingredientes con gluten no alcanza para rotular «Sin TACC»: eso requiere análisis y la
                        aprobación de la autoridad sanitaria (art. 1383 bis del CAA).
                    </p>
                    <label className={`${estilos.opcion} ${declaracion.gluten ? estilos.opcionMarcada : ''}`}>
                        <input
                            type="checkbox"
                            checked={declaracion.gluten}
                            onChange={() => cambiarDeclaracion({ gluten: !declaracion.gluten })}
                        />
                        Contiene gluten (TACC)
                        {propuesta.contiene_gluten && <span className={estilos.etiquetaSugerida}>receta</span>}
                    </label>
                </div>

                <div className={estilos.grupo}>
                    <strong>Puede contener (contaminación cruzada)</strong>
                    <p>
                        Sustancias que no son ingredientes pero pueden llegar al producto por contaminación accidental durante
                        la elaboración, aun aplicando las BPM. Se cargan a mano.
                    </p>
                    <div className={estilos.opciones}>
                        {ALERGENOS.filter((alergeno) => !declaracion.contiene.includes(alergeno)).map((alergeno) => (
                            <label
                                key={alergeno}
                                className={`${estilos.opcion} ${declaracion.puedeContener.includes(alergeno) ? estilos.opcionMarcada : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={declaracion.puedeContener.includes(alergeno)}
                                    onChange={() =>
                                        cambiarDeclaracion({ puedeContener: alternar(declaracion.puedeContener, alergeno) })
                                    }
                                />
                                {ETIQUETA_ALERGENO[alergeno]}
                            </label>
                        ))}
                    </div>
                </div>

                <div className={estilos.vistaPrevia}>
                    <span>Así quedaría en el rótulo</span>
                    {leyendaContiene || leyendaPuedeContener ? (
                        <>
                            {leyendaContiene && <p>{leyendaContiene}</p>}
                            {leyendaPuedeContener && <p>{leyendaPuedeContener}</p>}
                        </>
                    ) : (
                        <p className={estilos.textoNormal}>Sin declaraciones de alérgenos.</p>
                    )}
                </div>

                {guardada && (
                    <div className={estilos.meta}>
                        {guardada.estado === 'confirmada' && guardada.confirmado_por && guardada.fecha_confirmacion
                            ? `Confirmada por ${nombreCompleto(guardada.confirmado_por)} el ${formatearFechaHora(guardada.fecha_confirmacion)}`
                            : `Guardada por ${nombreCompleto(guardada.modificado_por)} el ${formatearFechaHora(guardada.fecha_modificacion)}, pendiente de confirmación`}
                        {guardada.version_receta !== null && ` · receta v${guardada.version_receta}`}
                        {guardada.modificada_respecto_de_la_propuesta && ' · modificada respecto de la propuesta'}.
                    </div>
                )}

                {mensajeDeclaracion && (
                    <p className={mensajeDeclaracion.tipo === 'error' ? estilos.mensajeError : estilos.mensajeExito}>
                        {mensajeDeclaracion.texto}
                    </p>
                )}

                <div className={estilos.acciones}>
                    <Boton variant="guardar" onClick={() => guardarDeclaracion(false)} disabled={guardando}>
                        Guardar sin confirmar
                    </Boton>
                    {usuario?.rol === 'admin' && (
                        <Boton variant="crear" onClick={() => guardarDeclaracion(true)} disabled={guardando}>
                            Confirmar declaración
                        </Boton>
                    )}
                </div>
            </section>

            <section className={`${styles.tarjetaEstatica} ${estilos.panel}`}>
                <div className={estilos.panelEncabezado}>
                    <div>
                        <h3>Condiciones de conservación</h3>
                        <p className={estilos.ayuda}>
                            Temperaturas en las que se debe conservar y tiempo en que se garantiza la durabilidad en esas
                            condiciones. Los campos que no apliquen se dejan vacíos.
                        </p>
                    </div>
                </div>

                <div className={estilos.formConservacion}>
                    <label className={estilos.campo}>
                        <span>Temperatura mínima (°C)</span>
                        <input
                            type="number"
                            step="any"
                            value={conservacion.minima}
                            onChange={(evento) => cambiarConservacion({ minima: evento.target.value })}
                        />
                    </label>
                    <label className={estilos.campo}>
                        <span>Temperatura máxima (°C)</span>
                        <input
                            type="number"
                            step="any"
                            value={conservacion.maxima}
                            onChange={(evento) => cambiarConservacion({ maxima: evento.target.value })}
                        />
                    </label>
                    <label className={estilos.campo}>
                        <span>Duración</span>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={conservacion.duracion}
                            onChange={(evento) => cambiarConservacion({ duracion: evento.target.value })}
                        />
                    </label>
                    <label className={estilos.campo}>
                        <span>Unidad</span>
                        <select
                            value={conservacion.unidad}
                            onChange={(evento) => cambiarConservacion({ unidad: evento.target.value as UnidadDuracion })}
                        >
                            <option value="dias">Días</option>
                            <option value="meses">Meses</option>
                        </select>
                    </label>
                    <label className={`${estilos.campo} ${estilos.completo}`}>
                        <span>Otras instrucciones</span>
                        <input
                            type="text"
                            maxLength={300}
                            placeholder="Ej.: Conservar en lugar fresco y seco. Una vez abierto, consumir dentro de las 48 horas."
                            value={conservacion.instrucciones}
                            onChange={(evento) => cambiarConservacion({ instrucciones: evento.target.value })}
                        />
                    </label>
                </div>

                <div className={estilos.vistaPrevia}>
                    <span>Leyenda guardada</span>
                    <p className={estilos.textoNormal}>{detalle.leyendas.conservacion ?? 'Todavía no se cargaron.'}</p>
                </div>

                {detalle.conservacion && (
                    <div className={estilos.meta}>
                        Última modificación: {formatearFechaHora(detalle.conservacion.fecha_modificacion)} por{' '}
                        {nombreCompleto(detalle.conservacion.modificado_por)}.
                    </div>
                )}

                {mensajeConservacion && (
                    <p className={mensajeConservacion.tipo === 'error' ? estilos.mensajeError : estilos.mensajeExito}>
                        {mensajeConservacion.texto}
                    </p>
                )}

                <div className={estilos.acciones}>
                    <Boton variant="guardar" onClick={guardarCondiciones} disabled={guardando}>
                        Guardar conservación
                    </Boton>
                </div>
            </section>

            <div className={estilos.acciones} style={{ width: '100%', maxWidth: '960px', justifyContent: 'flex-start' }}>
                {volver}
            </div>
        </div>
    );
}
