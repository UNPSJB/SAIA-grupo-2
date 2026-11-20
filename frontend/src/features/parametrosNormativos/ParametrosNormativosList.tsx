import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { ConjuntoResumen, ModuloRotuladoFrontal } from '../../types/parametrosNormativos';
import {
    cambiarModuloRotuladoFrontal,
    crearBorradorParametros,
    getConjuntosParametros,
    getModuloRotuladoFrontal,
} from '../../services/parametrosNormativosServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import { formatearFecha, hoyLocal } from '../productos/formatoProducto';
import { formatearFechaHora, nombreCompleto } from '../datosNutricionales/nutrientes';
import estilos from './ParametrosNormativos.module.css';
import styles from '../../styles/shared.module.css';

interface Respuesta {
    conjuntos: ConjuntoResumen[];
    modulo: ModuloRotuladoFrontal | null;
    error: boolean;
}

interface Situacion {
    texto: string;
    clase: string;
}

function situacionDe(conjunto: ConjuntoResumen): Situacion {
    if (conjunto.estado === 'borrador') return { texto: 'Borrador', clase: estilos.pastillaBorrador };
    if (conjunto.vigente) return { texto: 'Vigente', clase: estilos.pastillaVigente };
    if (conjunto.fecha_vigencia > hoyLocal()) return { texto: 'Programada', clase: '' };
    return { texto: 'Reemplazada', clase: estilos.pastillaApagada };
}

export default function ParametrosNormativosList() {
    const { usuario } = useAuth();
    const navigate = useNavigate();
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
    const [error, setError] = useState('');
    const [procesando, setProcesando] = useState(false);

    useEffect(() => {
        let cancelado = false;

        Promise.all([getConjuntosParametros(), getModuloRotuladoFrontal()])
            .then(([conjuntos, modulo]) => {
                if (!cancelado) setRespuesta({ conjuntos, modulo, error: false });
            })
            .catch((problema) => {
                console.error('Error al cargar los parámetros normativos:', problema);
                if (!cancelado) setRespuesta({ conjuntos: [], modulo: null, error: true });
            });

        return () => {
            cancelado = true;
        };
    }, []);

    const conjuntos = respuesta?.conjuntos ?? [];
    const modulo = respuesta?.modulo ?? null;
    const borrador = conjuntos.find((conjunto) => conjunto.estado === 'borrador');

    const nuevaVersion = async () => {
        if (!usuario) return;
        setProcesando(true);
        setError('');
        try {
            const creado = await crearBorradorParametros(usuario.id);
            navigate(`/configuracion/parametros-normativos/${creado.id}`);
        } catch (problema) {
            setError(problema instanceof Error ? problema.message : 'No se pudo crear la nueva versión.');
            setProcesando(false);
        }
    };

    const alternarModulo = async () => {
        if (!usuario || !modulo) return;
        setProcesando(true);
        setError('');
        try {
            const actualizado = await cambiarModuloRotuladoFrontal(!modulo.activo, usuario.id);
            setRespuesta((anterior) => (anterior ? { ...anterior, modulo: actualizado } : anterior));
        } catch (problema) {
            setError(problema instanceof Error ? problema.message : 'No se pudo cambiar el estado del módulo.');
        } finally {
            setProcesando(false);
        }
    };

    const columnas: Columna<ConjuntoResumen>[] = [
        {
            key: 'version',
            encabezado: 'Versión',
            ordenable: true,
            variant: 'titulo',
            valorOrdenamiento: (conjunto) => conjunto.version,
            render: (conjunto) => `v${conjunto.version}`,
        },
        {
            key: 'estado',
            encabezado: 'Estado',
            render: (conjunto) => {
                const situacion = situacionDe(conjunto);
                return <span className={`${estilos.pastilla} ${situacion.clase}`}>{situacion.texto}</span>;
            },
        },
        {
            key: 'norma_origen',
            encabezado: 'Norma de origen',
            render: (conjunto) => conjunto.norma_origen,
        },
        {
            key: 'fecha_vigencia',
            encabezado: 'Rige desde',
            ordenable: true,
            variant: 'fecha',
            render: (conjunto) => formatearFecha(conjunto.fecha_vigencia),
        },
        {
            key: 'fecha_publicacion',
            encabezado: 'Publicación',
            ordenable: true,
            valorOrdenamiento: (conjunto) => conjunto.fecha_publicacion ?? '',
            render: (conjunto) =>
                conjunto.fecha_publicacion ? (
                    <span>
                        {formatearFechaHora(conjunto.fecha_publicacion)}
                        {conjunto.publicado_por && (
                            <span className={estilos.condicion}>{nombreCompleto(conjunto.publicado_por)}</span>
                        )}
                    </span>
                ) : (
                    '—'
                ),
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones',
            render: (conjunto) => (
                <div className={styles.grupoBotonesTabla}>
                    <Link to={`/configuracion/parametros-normativos/${conjunto.id}`}>
                        {conjunto.estado === 'borrador' ? (
                            <Boton variant="editar" title="Editar el borrador" />
                        ) : (
                            <Boton variant="ver" title="Ver los parámetros de esta versión" />
                        )}
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Parámetros Normativos"
                descripcion="Umbrales, textos y reglas de aplicabilidad del rotulado frontal. Cada versión registra la norma de la que surge y desde cuándo rige; las versiones publicadas no se modifican, y cada evaluación guarda la versión con la que se hizo."
                acciones={
                    respuesta !== null &&
                    !respuesta.error &&
                    (borrador ? (
                        <Link to={`/configuracion/parametros-normativos/${borrador.id}`}>
                            <Boton variant="editar">Continuar borrador v{borrador.version}</Boton>
                        </Link>
                    ) : (
                        <Boton variant="crear" onClick={nuevaVersion} disabled={procesando || conjuntos.length === 0}>
                            Nueva versión
                        </Boton>
                    ))
                }
            />

            {respuesta?.error && (
                <p className={estilos.mensajeError}>No se pudieron cargar los parámetros normativos.</p>
            )}
            {error && <p className={estilos.mensajeError}>{error}</p>}

            {modulo && (
                <section className={`${styles.tarjetaEstatica} ${estilos.panel}`}>
                    <div className={estilos.interruptor}>
                        <div className={estilos.estadoModulo}>
                            <i
                                className={`bi ${modulo.activo ? 'bi-toggle-on' : 'bi-toggle-off'}`}
                                style={{ color: modulo.activo ? 'var(--verde-texto)' : 'var(--gris-texto)' }}
                                aria-hidden="true"
                            ></i>
                            <div>
                                <strong>
                                    Módulo de rotulado frontal {modulo.activo ? 'activado' : 'desactivado'}
                                </strong>
                                <span>
                                    {modulo.activo
                                        ? 'Las evaluaciones de sellos y leyendas están disponibles.'
                                        : 'No se evalúan ni se muestran sellos. El resto del sistema sigue funcionando igual.'}
                                    {modulo.fecha_cambio &&
                                        ` Último cambio: ${formatearFechaHora(modulo.fecha_cambio)}${modulo.cambiado_por ? ` por ${nombreCompleto(modulo.cambiado_por)}` : ''}.`}
                                </span>
                            </div>
                        </div>
                        <Boton
                            variant={modulo.activo ? 'pausar' : 'reanudar'}
                            onClick={alternarModulo}
                            disabled={procesando}
                        >
                            {modulo.activo ? 'Desactivar módulo' : 'Activar módulo'}
                        </Boton>
                    </div>
                </section>
            )}

            <TablaPaginada
                datos={conjuntos}
                columnas={columnas}
                gridTemplateColumns="0.6fr 0.9fr 2.6fr 0.9fr 1.3fr 0.7fr"
                itemsPorPagina={10}
                mensajeVacio={
                    respuesta === null ? 'Cargando versiones…' : 'Todavía no hay versiones de parámetros cargadas.'
                }
                columnaOrdenInicial="version"
                ordenAscInicial={false}
                tituloExportacion="parametros_normativos"
            />
        </div>
    );
}
