import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Boton from '../../components/Boton';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { getAditivos } from '../../services/aditivosServices';
import { getInsumos } from '../../services/insumosServices';
import {
    getRecetaById,
    getVersionVigenteReceta,
    RecetasApiError,
} from '../../services/recetasServices';
import type { Aditivo } from '../../types/aditivos';
import type { Insumo } from '../../types/insumos';
import type { Receta, VersionReceta } from '../../types/receta';
import EscalarReceta from './EscalarReceta';
import styles from '../../styles/shared.module.css';

interface RespuestaDetalle {
    clave: string;
    receta: Receta | null;
    version: VersionReceta | null;
    insumos: Insumo[];
    aditivos: Aditivo[];
    error: string | null;
}

function formatearGramos(valor: number): string {
    return `${new Intl.NumberFormat('es-AR', {
        maximumFractionDigits: 2,
    }).format(valor)} g`;
}

function formatearFecha(fecha: string | null): string {
    if (!fecha) return 'Sin especificar';
    const partes = fecha.slice(0, 10).split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fecha;
}

export default function RecetaDetail() {
    const { id = '' } = useParams();
    const [respuesta, setRespuesta] = useState<RespuestaDetalle | null>(null);

    useEffect(() => {
        let cancelado = false;

        const cargarDetalle = async () => {
            try {
                const [receta, insumos, aditivos] = await Promise.all([
                    getRecetaById(id),
                    getInsumos(),
                    getAditivos(),
                ]);

                let version: VersionReceta | null = null;
                try {
                    version = await getVersionVigenteReceta(id);
                } catch (problema) {
                    if (
                        problema instanceof RecetasApiError
                        && problema.status !== 404
                    ) {
                        throw problema;
                    }
                }

                if (!cancelado) {
                    setRespuesta({
                        clave: id,
                        receta,
                        version,
                        insumos,
                        aditivos,
                        error: null,
                    });
                }
            } catch (problema) {
                console.error('Error al cargar el detalle de la receta:', problema);
                if (!cancelado) {
                    setRespuesta({
                        clave: id,
                        receta: null,
                        version: null,
                        insumos: [],
                        aditivos: [],
                        error: problema instanceof Error
                            ? problema.message
                            : 'No se pudo cargar el detalle de la receta.',
                    });
                }
            }
        };

        void cargarDetalle();
        return () => {
            cancelado = true;
        };
    }, [id]);

    const actual = respuesta?.clave === id ? respuesta : null;
    const receta = actual?.receta ?? null;
    const version = actual?.version ?? null;

    const insumosPorId = useMemo(
        () => new Map((actual?.insumos ?? []).map((insumo) => [insumo.id, insumo])),
        [actual?.insumos],
    );
    const aditivosPorId = useMemo(
        () => new Map((actual?.aditivos ?? []).map((aditivo) => [aditivo.id, aditivo])),
        [actual?.aditivos],
    );

    if (actual === null) {
        return (
            <div className={styles.contenedorPrincipal}>
                <EncabezadoPagina titulo="Detalle de la Receta" ancho="900px" />
                <p className={styles.textMuted}>Cargando receta…</p>
            </div>
        );
    }

    if (actual.error || receta === null) {
        return (
            <div className={styles.contenedorPrincipal}>
                <EncabezadoPagina titulo="Detalle de la Receta" ancho="900px" />
                <p className={styles.textDanger} role="alert">
                    {actual.error ?? 'No se encontró la receta.'}
                </p>
                <Link to="/recetas">
                    <Boton variant="volver">Volver a la lista</Boton>
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo={receta.producto.nombre}
                descripcion="Contenido de la versión vigente de la receta."
                ancho="900px"
            />

            <div
                className={styles.tarjetaEstatica}
                style={{ maxWidth: '900px', width: '100%', boxSizing: 'border-box' }}
            >
                {!version ? (
                    <p className={styles.textMuted}>
                        Esta receta todavía no tiene una versión vigente activa.
                    </p>
                ) : (
                    <>
                        <h2 style={{ marginTop: 0 }}>
                            Versión vigente: v{version.version}
                        </h2>

                        <div className={styles.formGrid}>
                            <p>
                                <strong>Rendimiento final:</strong>{' '}
                                {formatearGramos(version.rendimiento_final_gramos)}
                            </p>
                            <p>
                                <strong>Unidad de venta:</strong>{' '}
                                {formatearGramos(version.unidad_venta_gramos)}
                            </p>
                            <p>
                                <strong>Medida casera:</strong>{' '}
                                {version.medida_casera || '—'}
                            </p>
                            <p>
                                <strong>Fecha de vigencia:</strong>{' '}
                                {formatearFecha(version.fecha_vigencia)}
                            </p>
                            <p style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                                <strong>Motivo del cambio:</strong>{' '}
                                {version.motivo_cambio || '—'}
                            </p>
                        </div>

                        <section className={styles.bloqueDetalle} aria-labelledby="receta-detalles">
                            <h3 id="receta-detalles">Ingredientes y aditivos</h3>
                            {version.detalles.length === 0 ? (
                                <p className={styles.textMuted}>
                                    La versión vigente no tiene ingredientes ni aditivos cargados.
                                </p>
                            ) : (
                                <ul>
                                    {version.detalles
                                        .toSorted((a, b) => a.renglon - b.renglon)
                                        .map((detalle) => {
                                            const insumo = insumosPorId.get(detalle.insumo_id);
                                            const aditivo = detalle.aditivo_id
                                                ? aditivosPorId.get(detalle.aditivo_id)
                                                : null;

                                            return (
                                                <li
                                                    key={`${detalle.receta_id}-${detalle.nro_version}-${detalle.renglon}`}
                                                >
                                                    <strong>
                                                        {insumo?.nombre ?? `Insumo #${detalle.insumo_id}`}
                                                    </strong>
                                                    {' — '}
                                                    {formatearGramos(detalle.cantidad_gramos)}
                                                    {' · '}
                                                    {detalle.tipo_uso === 'ingrediente'
                                                        ? 'Ingrediente'
                                                        : 'Aditivo'}
                                                    {aditivo
                                                        ? ` · ${aditivo.nombre_completo}${aditivo.numero_ins ? ` (INS ${aditivo.numero_ins})` : ''}`
                                                        : ''}
                                                </li>
                                            );
                                        })}
                                </ul>
                            )}
                        </section>

                        <section className={styles.bloqueDetalle} aria-labelledby="receta-pasos">
                            <h3 id="receta-pasos">Pasos de elaboración</h3>
                            {version.pasos.length === 0 ? (
                                <p className={styles.textMuted}>
                                    La versión vigente no tiene pasos de elaboración cargados.
                                </p>
                            ) : (
                                <ol>
                                    {version.pasos
                                        .toSorted((a, b) => a.orden - b.orden)
                                        .map((paso) => (
                                            <li key={paso.id} style={{ marginBottom: '16px' }}>
                                                <strong>{paso.nombre_paso}</strong>
                                                {paso.es_punto_control && (
                                                    <span> · Punto de control</span>
                                                )}
                                                <p style={{ whiteSpace: 'pre-wrap', marginBottom: '6px' }}>
                                                    {paso.procedimiento}
                                                </p>
                                                <p className={styles.textMuted} style={{ marginTop: 0 }}>
                                                    {paso.equipo
                                                        ? `Equipo: ${paso.equipo.nombre}`
                                                        : 'Sin equipo asociado'}
                                                    {paso.tiempo_minutos !== null
                                                        ? ` · ${paso.tiempo_minutos} min`
                                                        : ''}
                                                    {paso.temperatura_celsius !== null
                                                        ? ` · ${paso.temperatura_celsius} °C`
                                                        : ''}
                                                </p>
                                            </li>
                                        ))}
                                </ol>
                            )}
                        </section>

                        <section className={styles.bloqueDetalle} aria-labelledby="titulo-escalar-receta">
                            <EscalarReceta productoId={receta.producto_id} />
                        </section>
                    </>
                )}

                <div className={styles.bloqueDetalle}>
                    <Link to="/recetas">
                        <Boton variant="volver">Volver a la lista</Boton>
                    </Link>
                </div>
            </div>
        </div>
    );
}
