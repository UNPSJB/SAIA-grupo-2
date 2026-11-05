import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { AlertaVencimiento, AlertasPorEmpleado, EstadoVencimiento } from '../../types/documentacion';
import { getAlertasDocumentacion } from '../../services/documentacionServices';
import { COLOR_ESTADO, ETIQUETA_ESTADO, ETIQUETA_TIPO, formatearFecha, textoVencimiento } from './estadoVencimiento';
import Boton from '../../components/Boton';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import TarjetasFiltro, { type Metrica } from '../../components/TarjetasFiltro';
import estilos from './AlertaVencimiento.module.css';
import styles from '../../styles/shared.module.css';

interface Respuesta {
    alertas: AlertaVencimiento[];
    error: boolean;
}

function agruparPorEmpleado(alertas: AlertaVencimiento[]): AlertasPorEmpleado[] {
    const grupos = new Map<number, AlertasPorEmpleado>();
    alertas.forEach((alerta) => {
        const grupo = grupos.get(alerta.empleado.id) ?? { empleado: alerta.empleado, documentos: [] };
        grupo.documentos.push(alerta);
        grupos.set(alerta.empleado.id, grupo);
    });
    return [...grupos.values()];
}

function plural(cantidad: number, singular: string, varios: string): string {
    return `${cantidad} ${cantidad === 1 ? singular : varios}`;
}

export default function AlertasDocumentacion() {
    const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
    const [filtroEstado, setFiltroEstado] = useState<EstadoVencimiento | ''>('');

    useEffect(() => {
        let cancelado = false;

        getAlertasDocumentacion()
            .then((datos) => {
                if (cancelado) return;
                setRespuesta({ alertas: datos.filter((alerta) => alerta.estado !== 'vigente'), error: false });
            })
            .catch((problema) => {
                console.error('Error al cargar las alertas de vencimiento:', problema);
                if (!cancelado) setRespuesta({ alertas: [], error: true });
            });

        return () => {
            cancelado = true;
        };
    }, []);

    const cargando = respuesta === null;
    const alertas = respuesta?.alertas ?? [];
    const vencidos = alertas.filter((alerta) => alerta.estado === 'vencido').length;
    const proximos = alertas.filter((alerta) => alerta.estado === 'proximo').length;
    const visibles = filtroEstado === '' ? alertas : alertas.filter((alerta) => alerta.estado === filtroEstado);
    const grupos = agruparPorEmpleado(visibles);
    const personas = agruparPorEmpleado(alertas).length;

    const metricas: Metrica[] = [
        { id: 'vencido', titulo: 'VENCIDOS', valor: vencidos, color: COLOR_ESTADO.vencido },
        { id: 'proximo', titulo: 'PRÓXIMOS A VENCER', valor: proximos, color: COLOR_ESTADO.proximo },
        { id: '', titulo: 'PERSONAS CON ALERTAS', valor: personas, color: '#3b82f6' },
    ];

    const descripcion = cargando
        ? 'Documentación del personal vencida o próxima a vencer.'
        : alertas.length === 0
          ? 'No hay documentación vencida ni próxima a vencer.'
          : `${plural(alertas.length, 'documento requiere', 'documentos requieren')} atención, de ${plural(personas, 'persona', 'personas')}. Los más urgentes, primero.`;

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Alertas de Vencimiento de Documentación"
                descripcion={descripcion}
                acciones={
                    <Link to="/vencimientos-documentacion">
                        <Boton variant="ver">Ver todos los vencimientos</Boton>
                    </Link>
                }
            />

            {respuesta?.error && (
                <p style={{ color: 'var(--rojo-texto)' }}>No se pudieron cargar las alertas de vencimiento.</p>
            )}

            {!cargando && alertas.length > 0 && (
                <TarjetasFiltro
                    metricas={metricas}
                    filtroActual={filtroEstado}
                    onFiltroChange={(estado) => setFiltroEstado(estado as EstadoVencimiento | '')}
                />
            )}

            <div className={estilos.lista}>
                {cargando && <p className={estilos.mensaje}>Cargando alertas…</p>}

                {!cargando && !respuesta?.error && grupos.length === 0 && (
                    <p className={estilos.mensaje}>
                        {alertas.length === 0
                            ? 'Toda la documentación del personal está al día.'
                            : 'No hay alertas con este filtro.'}
                    </p>
                )}

                {grupos.map((grupo) => (
                    <section key={grupo.empleado.id} className={estilos.persona}>
                        <header className={estilos.personaEncabezado}>
                            <div>
                                <h3>
                                    {grupo.empleado.apellido}, {grupo.empleado.nombre}
                                </h3>
                                <span className={estilos.legajo}>Legajo {grupo.empleado.legajo}</span>
                            </div>
                            <Link to={`/empleados/${grupo.empleado.id}/documentacion`} className={estilos.verDocumentacion}>
                                Ver su documentación
                                <i className="bi bi-arrow-right" aria-hidden="true"></i>
                            </Link>
                        </header>

                        <ul className={estilos.documentos}>
                            {grupo.documentos.map((documento) => (
                                <li key={documento.id} className={estilos.documento}>
                                    <span className={estilos.estado}>
                                        <span
                                            className={estilos.punto}
                                            style={{ backgroundColor: COLOR_ESTADO[documento.estado] }}
                                            aria-hidden="true"
                                        />
                                        {ETIQUETA_ESTADO[documento.estado]}
                                    </span>
                                    <span className={estilos.textos}>
                                        <span className={estilos.tipo}>{ETIQUETA_TIPO[documento.tipo]}</span>
                                        <span className={estilos.secundario}>{documento.descripcion}</span>
                                    </span>
                                    <span className={estilos.textos}>
                                        <span
                                            className={estilos.plazo}
                                            style={{ color: COLOR_ESTADO[documento.estado] }}
                                        >
                                            {textoVencimiento(documento.dias_restantes)}
                                        </span>
                                        <span className={estilos.secundario}>
                                            {formatearFecha(documento.fecha_vencimiento)}
                                        </span>
                                    </span>
                                    <Link
                                        to={`/empleados/${grupo.empleado.id}/documentacion/editar/${documento.id}`}
                                        className={estilos.accion}
                                    >
                                        <Boton variant="editar">Renovar</Boton>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </div>
    );
}
