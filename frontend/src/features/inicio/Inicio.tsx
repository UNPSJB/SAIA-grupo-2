import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { getChecklistHoy, getHistorialChecklists } from '../../services/checklistsServices';
import { getVencimientosConsolidados } from '../../services/vencimientosServices';
import { getIncidentes, getIncidentesAbiertos } from '../../services/incidentesServices';
import { getAlertasRecambio } from '../../services/elementosLimpiezaServices';
import { getDocumentosVersionados } from '../../services/documentosVersionadosServices';
import type { ChecklistItem, HistorialChecklistResumen } from '../../types/checklists';
import type { ResumenVencimientos } from '../../types/vencimientos';
import type { Incidente } from '../../types/incidentes';
import type { ElementoLimpieza } from '../../types/elementosLimpieza';
import type { DocumentoVersionado } from '../../types/documentosVersionados';
import { rutaDeVencimiento, textoDiasRestantes } from '../../utils/vencimientos';
import styles from './Inicio.module.css';
import shared from '../../styles/shared.module.css';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import GraficoProduccion from '../tablero/GraficoProduccion';

type Resultado<T> = { ok: true; datos: T } | { ok: false };

interface DatosTablero {
    checklist: Resultado<ChecklistItem[]>;
    recambios: Resultado<ElementoLimpieza[]>;
    vencimientos?: Resultado<ResumenVencimientos>;
    incidentes?: Resultado<Incidente[]>;
    historial?: Resultado<HistorialChecklistResumen>;
    todosLosIncidentes?: Resultado<Incidente[]>;
    documentos?: Resultado<DocumentoVersionado[]>;
}

const MAXIMO_FILAS = 6;
const MAXIMO_EVENTOS = 10;

function fechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function saludoSegunHora(hora: number): string {
    if (hora >= 5 && hora < 12) return 'Buenos días';
    if (hora >= 12 && hora < 20) return 'Buenas tardes';
    return 'Buenas noches';
}

function aResultado<T>(respuesta: PromiseSettledResult<T>): Resultado<T> {
    return respuesta.status === 'fulfilled' ? { ok: true, datos: respuesta.value } : { ok: false };
}

function plural(cantidad: number, singular: string, varios: string): string {
    return `${cantidad} ${cantidad === 1 ? singular : varios}`;
}

function Medidor({ porcentaje }: { porcentaje: number }) {
    return (
        <div className={styles.medidor} role="presentation">
            <div className={styles.medidorRelleno} style={{ width: `${Math.max(0, Math.min(100, porcentaje))}%` }} />
        </div>
    );
}

function TarjetaIndicador({
    ruta,
    titulo,
    icono,
    children,
}: {
    ruta: string;
    titulo: string;
    icono: string;
    children: React.ReactNode;
}) {
    return (
        <Link to={ruta} className={styles.indicador}>
            <span className={styles.indicadorEncabezado}>
                {titulo}
                <span className={styles.indicadorIcono}>
                    <i className={`bi bi-${icono}`} aria-hidden="true"></i>
                </span>
            </span>
            {children}
        </Link>
    );
}

function ChecklistDeHoy({ resultado, titulo }: { resultado: Resultado<ChecklistItem[]>; titulo: string }) {
    const tareas = resultado.ok ? resultado.datos : [];
    const pendientes = tareas.filter((tarea) => tarea.estado === 'pendiente');
    const realizadas = tareas.length - pendientes.length;

    return (
        <section className={styles.tarjeta}>
            <div className={styles.tarjetaEncabezado}>
                <h3>{titulo}</h3>
                {resultado.ok && tareas.length > 0 && (
                    <span className={styles.tarjetaAyuda}>
                        {realizadas} de {tareas.length} realizadas
                    </span>
                )}
            </div>

            {!resultado.ok ? (
                <p className={styles.error}>No se pudo cargar el checklist de hoy.</p>
            ) : tareas.length === 0 ? (
                <p className={styles.vacio}>No hay tareas programadas para hoy.</p>
            ) : pendientes.length === 0 ? (
                <p className={`${styles.vacio} ${styles.vacioOk}`}>
                    <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
                    Todas las tareas de hoy están hechas.
                </p>
            ) : (
                <ul className={styles.lista}>
                    {pendientes.slice(0, MAXIMO_FILAS).map((tarea) => (
                        <li key={`${tarea.tarea_id}-${tarea.plan_id}`}>
                            <Link to="/checklists/hoy" className={styles.fila}>
                                <span className={`${styles.punto} ${styles.pendiente}`} aria-hidden="true" />
                                <span className={styles.filaTexto}>
                                    <span className={styles.filaTitulo}>{tarea.titulo_tarea}</span>
                                    <span className={styles.filaSubtitulo}>{tarea.sector_nombre}</span>
                                </span>
                                <span className={styles.filaDato}>Pendiente</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            <div className={styles.pie}>
                <Link to="/checklists/hoy" className={styles.verTodo}>
                    Ir al checklist del día <i className="bi bi-arrow-right" aria-hidden="true"></i>
                </Link>
            </div>
        </section>
    );
}

function TableroAdmin({ datos }: { datos: DatosTablero }) {
    const tareas = datos.checklist.ok ? datos.checklist.datos : [];
    const realizadasHoy = tareas.filter((tarea) => tarea.estado === 'realizada').length;
    const porcentajeHoy = tareas.length > 0 ? (realizadasHoy / tareas.length) * 100 : 0;

    const vencimientos = datos.vencimientos?.ok ? datos.vencimientos.datos : null;
    const urgentes = (vencimientos?.items ?? [])
        .filter((item) => item.estado !== 'vigente')
        .sort((a, b) => a.dias_restantes - b.dias_restantes);

    const incidentes = datos.incidentes?.ok ? datos.incidentes.datos : null;
    const masAntiguo = incidentes && incidentes.length > 0 ? incidentes[0] : null;

    const recambios = datos.recambios.ok
        ? datos.recambios.datos.filter((elemento) => elemento.estado_recambio === 'vencido' || elemento.estado_recambio === 'proximo')
        : null;
    const recambiosVencidos = recambios?.filter((elemento) => elemento.estado_recambio === 'vencido').length ?? 0;

    const historial = datos.historial?.ok ? datos.historial.datos : null;

    return (
        <>
            <div className={styles.indicadores}>
                <TarjetaIndicador ruta="/checklists/hoy" titulo="Checklist de hoy" icono="check2-square">
                    {datos.checklist.ok ? (
                        <>
                            <span className={styles.indicadorValor}>
                                {realizadasHoy}
                                <small>de {tareas.length}</small>
                            </span>
                            <Medidor porcentaje={porcentajeHoy} />
                            <span className={styles.indicadorDetalle}>
                                {tareas.length === 0
                                    ? 'Sin tareas programadas'
                                    : tareas.length === realizadasHoy
                                      ? 'Todo realizado'
                                      : plural(tareas.length - realizadasHoy, 'pendiente', 'pendientes')}
                            </span>
                        </>
                    ) : (
                        <span className={styles.indicadorDetalle}>No disponible</span>
                    )}
                </TarjetaIndicador>

                <TarjetaIndicador ruta="/vencimientos" titulo="Vencimientos" icono="calendar2-week">
                    {vencimientos ? (
                        <>
                            <span className={styles.indicadorValor}>
                                {vencimientos.vencidos}
                                <small>{vencimientos.vencidos === 1 ? 'vencido' : 'vencidos'}</small>
                            </span>
                            <span className={styles.indicadorDetalle}>
                                {plural(vencimientos.proximos, 'próximo a vencer', 'próximos a vencer')}
                            </span>
                        </>
                    ) : (
                        <span className={styles.indicadorDetalle}>No disponible</span>
                    )}
                </TarjetaIndicador>

                <TarjetaIndicador ruta="/incidentes/abiertos" titulo="Incidentes abiertos" icono="clipboard-pulse">
                    {incidentes ? (
                        <>
                            <span className={styles.indicadorValor}>{incidentes.length}</span>
                            <span className={styles.indicadorDetalle}>
                                {masAntiguo && masAntiguo.dias_abierto !== null
                                    ? `El más antiguo, hace ${plural(masAntiguo.dias_abierto, 'día', 'días')}`
                                    : 'Ninguno pendiente'}
                            </span>
                        </>
                    ) : (
                        <span className={styles.indicadorDetalle}>No disponible</span>
                    )}
                </TarjetaIndicador>

                <TarjetaIndicador ruta="/elementosLimpieza/alertas" titulo="Recambios" icono="arrow-repeat">
                    {recambios ? (
                        <>
                            <span className={styles.indicadorValor}>
                                {recambios.length}
                                <small>{recambios.length === 1 ? 'elemento' : 'elementos'}</small>
                            </span>
                            <span className={styles.indicadorDetalle}>
                                {recambios.length === 0
                                    ? 'Nada para cambiar'
                                    : plural(recambiosVencidos, 'con el recambio vencido', 'con el recambio vencido')}
                            </span>
                        </>
                    ) : (
                        <span className={styles.indicadorDetalle}>No disponible</span>
                    )}
                </TarjetaIndicador>
            </div>

            <div className={styles.columnas}>
                <section className={styles.tarjeta}>
                    <div className={styles.tarjetaEncabezado}>
                        <h3>Requieren atención</h3>
                        <span className={styles.tarjetaAyuda}>Vencidos y próximos a vencer</span>
                    </div>

                    {!vencimientos ? (
                        <p className={styles.error}>No se pudieron cargar los vencimientos.</p>
                    ) : urgentes.length === 0 ? (
                        <p className={`${styles.vacio} ${styles.vacioOk}`}>
                            <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
                            Nada vencido ni por vencer.
                        </p>
                    ) : (
                        <ul className={styles.lista}>
                            {urgentes.slice(0, MAXIMO_FILAS).map((item) => (
                                <li key={item.id}>
                                    <Link to={rutaDeVencimiento(item)} className={styles.fila}>
                                        <span className={styles.estado}>
                                            <span className={`${styles.punto} ${styles[item.estado]}`} aria-hidden="true" />
                                            {item.estado === 'vencido' ? 'Vencido' : 'Próximo'}
                                        </span>
                                        <span className={styles.filaTexto}>
                                            <span className={styles.filaTitulo}>{item.titulo}</span>
                                            <span className={styles.filaSubtitulo}>
                                                {[item.categoria_label, item.referencia].filter(Boolean).join(' · ')}
                                            </span>
                                        </span>
                                        <span className={styles.filaDato}>{textoDiasRestantes(item.dias_restantes)}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className={styles.pie}>
                        <Link to="/vencimientos" className={styles.verTodo}>
                            {urgentes.length > MAXIMO_FILAS
                                ? `Ver los ${urgentes.length} vencimientos`
                                : 'Ver todos los vencimientos'}{' '}
                            <i className="bi bi-arrow-right" aria-hidden="true"></i>
                        </Link>
                    </div>
                </section>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <section className={styles.tarjeta}>
                        <div className={styles.tarjetaEncabezado}>
                            <h3>Limpieza, últimos 7 días</h3>
                            {historial && (
                                <span className={styles.tarjetaAyuda}>
                                    {historial.total_realizadas} de {historial.total_esperadas} tareas
                                </span>
                            )}
                        </div>
                        {historial ? (
                            <div className={styles.resumenLimpieza}>
                                <span className={styles.resumenPorcentaje}>
                                    {historial.porcentaje_cumplimiento.toLocaleString('es-AR')}%
                                </span>
                                <Medidor porcentaje={historial.porcentaje_cumplimiento} />
                            </div>
                        ) : (
                            <p className={styles.error}>No se pudo cargar el cumplimiento.</p>
                        )}
                        <div className={styles.pie}>
                            <Link to="/checklists/historial" className={styles.verTodo}>
                                Ver el historial <i className="bi bi-arrow-right" aria-hidden="true"></i>
                            </Link>
                        </div>
                    </section>

                    <ChecklistDeHoy resultado={datos.checklist} titulo="Pendiente hoy" />
                </div>
            </div>

            <ActividadDePlanta
                historial={datos.historial}
                incidentes={datos.todosLosIncidentes}
                documentos={datos.documentos}
            />
            
            <GraficoProduccion />

        </>
    );
}

interface Evento {
    clave: string;
    momento: Date;
    icono: string;
    quien: string;
    accion: string;
    objeto: string;
    detalle: string;
    ruta: string;
}

function sinLegajo(nombre: string): string {
    return nombre.replace(/\s*\([^)]*\)\s*$/, '');
}

function haceCuanto(momento: Date, ahora: Date): string {
    const minutos = Math.floor((ahora.getTime() - momento.getTime()) / 60000);
    if (minutos < 1) return 'recién';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24 && momento.getDate() === ahora.getDate()) return `hace ${horas} h`;
    const hora = momento.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const ayer = new Date(ahora);
    ayer.setDate(ahora.getDate() - 1);
    if (momento.toDateString() === ayer.toDateString()) return `ayer ${hora}`;
    return `${momento.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} ${hora}`;
}

function nombreDe(persona?: { nombre: string; apellido: string } | null): string {
    return persona ? `${persona.nombre} ${persona.apellido}` : 'Alguien';
}

function construirEventos(
    historial: HistorialChecklistResumen | null,
    incidentes: Incidente[] | null,
    documentos: DocumentoVersionado[] | null,
    desde: Date,
): Evento[] {
    const eventos: Evento[] = [];

    const tareasPorPersonaYDia = new Map<string, { quien: string; momento: Date; titulos: string[]; sectores: Set<string> }>();
    historial?.registros
        .filter((registro) => registro.realizada && registro.fecha_hora_completada)
        .forEach((registro) => {
            const quien = sinLegajo(registro.nombre_empleado ?? 'Alguien');
            const momento = new Date(String(registro.fecha_hora_completada));
            const clave = `${quien}|${registro.fecha_programada}`;
            const grupo = tareasPorPersonaYDia.get(clave) ?? { quien, momento, titulos: [], sectores: new Set<string>() };
            if (momento > grupo.momento) grupo.momento = momento;
            grupo.titulos.push(registro.titulo_tarea);
            grupo.sectores.add(registro.sector_nombre);
            tareasPorPersonaYDia.set(clave, grupo);
        });
    tareasPorPersonaYDia.forEach((grupo, clave) => {
        eventos.push({
            clave: `tareas-${clave}`,
            momento: grupo.momento,
            icono: 'check2-circle',
            quien: grupo.quien,
            accion: 'completó',
            objeto: grupo.titulos.length === 1 ? grupo.titulos[0] : `${grupo.titulos.length} tareas de limpieza`,
            detalle: [...grupo.sectores].join(' · '),
            ruta: '/checklists/historial',
        });
    });

    incidentes?.forEach((incidente) => {
        eventos.push({
            clave: `incidente-${incidente.id}`,
            momento: new Date(incidente.fecha_hora_reporte),
            icono: 'exclamation-octagon',
            quien: `${incidente.empleado.nombre} ${incidente.empleado.apellido}`,
            accion: 'reportó',
            objeto: incidente.descripcion,
            detalle: 'Incidente nuevo',
            ruta: `/incidentes/${incidente.id}`,
        });
        incidente.movimientos.forEach((movimiento) => {
            eventos.push({
                clave: `movimiento-${movimiento.id}`,
                momento: new Date(movimiento.fecha_hora),
                icono: movimiento.tipo === 'cierre' ? 'check2-all' : 'arrow-counterclockwise',
                quien: `${movimiento.empleado.nombre} ${movimiento.empleado.apellido}`,
                accion: movimiento.tipo === 'cierre' ? 'cerró' : 'reabrió',
                objeto: incidente.descripcion,
                detalle: movimiento.tipo === 'cierre' ? 'Incidente cerrado' : 'Incidente reabierto',
                ruta: `/incidentes/${incidente.id}`,
            });
        });
    });

    documentos?.forEach((documento) => {
        const vigente = documento.version_vigente;
        if (!vigente) return;
        const objeto = `versión ${vigente.version} de ${documento.nombre}`;
        if (vigente.fecha_subida) {
            eventos.push({
                clave: `version-${documento.id}-${vigente.version}`,
                momento: new Date(vigente.fecha_subida),
                icono: 'file-earmark-arrow-up',
                quien: nombreDe(vigente.subido_por),
                accion: 'subió la',
                objeto,
                detalle: vigente.version === 1 ? 'Documento nuevo' : 'Nueva versión vigente',
                ruta: '/documentos',
            });
        }
        if (vigente.fecha_modificacion) {
            eventos.push({
                clave: `vigencia-${documento.id}-${vigente.version}`,
                momento: new Date(vigente.fecha_modificacion),
                icono: 'file-earmark-check',
                quien: nombreDe(vigente.modificado_por),
                accion: 'marcó vigente la',
                objeto,
                detalle: 'Cambio de versión vigente',
                ruta: '/documentos',
            });
        }
    });

    return eventos
        .filter((evento) => !Number.isNaN(evento.momento.getTime()) && evento.momento >= desde)
        .sort((a, b) => b.momento.getTime() - a.momento.getTime());
}

function ActividadDePlanta({
    historial,
    incidentes,
    documentos,
}: {
    historial?: Resultado<HistorialChecklistResumen>;
    incidentes?: Resultado<Incidente[]>;
    documentos?: Resultado<DocumentoVersionado[]>;
}) {
    const ahora = new Date();
    const desde = new Date(ahora);
    desde.setDate(ahora.getDate() - 7);
    const disponible = historial?.ok || incidentes?.ok || documentos?.ok;
    const eventos = construirEventos(
        historial?.ok ? historial.datos : null,
        incidentes?.ok ? incidentes.datos : null,
        documentos?.ok ? documentos.datos : null,
        desde,
    ).slice(0, MAXIMO_EVENTOS);

    return (
        <section className={styles.tarjeta}>
            <div className={styles.tarjetaEncabezado}>
                <h3>Actividad de planta</h3>
                <span className={styles.tarjetaAyuda}>Limpieza, incidentes y documentos · últimos 7 días</span>
            </div>

            {!disponible ? (
                <p className={styles.error}>No se pudo cargar la actividad.</p>
            ) : eventos.length === 0 ? (
                <p className={styles.vacio}>No hubo actividad en los últimos 7 días.</p>
            ) : (
                <ul className={`${styles.lista} ${styles.actividad}`}>
                    {eventos.map((evento) => (
                        <li key={evento.clave}>
                            <Link to={evento.ruta} className={styles.evento}>
                                <span className={styles.eventoIcono}>
                                    <i className={`bi bi-${evento.icono}`} aria-hidden="true"></i>
                                </span>
                                <span className={styles.filaTexto}>
                                    <span
                                        className={styles.eventoTexto}
                                        title={`${evento.quien} ${evento.accion} ${evento.objeto}`}
                                    >
                                        <strong>{evento.quien}</strong> {evento.accion}{' '}
                                        <span className={styles.eventoObjeto}>{evento.objeto}</span>
                                    </span>
                                    <span className={styles.filaSubtitulo}>{evento.detalle}</span>
                                </span>
                                <span className={styles.filaDato}>{haceCuanto(evento.momento, ahora)}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function TableroOperario({ datos }: { datos: DatosTablero }) {
    const recambios = datos.recambios.ok
        ? datos.recambios.datos.filter((elemento) => elemento.estado_recambio === 'vencido' || elemento.estado_recambio === 'proximo').length
        : null;

    return (
        <>
            <ChecklistDeHoy resultado={datos.checklist} titulo="Tu checklist de hoy" />

            <div className={styles.acciones}>
                <Link to="/incidentes/nuevo" className={styles.accion}>
                    <span className={styles.indicadorIcono}>
                        <i className="bi bi-exclamation-octagon" aria-hidden="true"></i>
                    </span>
                    <span>
                        Registrar incidente
                        <small>Algo se rompió, una plaga, una devolución</small>
                    </span>
                </Link>
                <Link to="/documentos/vigentes" className={styles.accion}>
                    <span className={styles.indicadorIcono}>
                        <i className="bi bi-file-earmark-check" aria-hidden="true"></i>
                    </span>
                    <span>
                        Documentos vigentes
                        <small>Procedimientos antes de operar</small>
                    </span>
                </Link>
                <Link to="/elementosLimpieza/alertas" className={styles.accion}>
                    <span className={styles.indicadorIcono}>
                        <i className="bi bi-arrow-repeat" aria-hidden="true"></i>
                    </span>
                    <span>
                        Alertas de recambio
                        <small>
                            {recambios === null
                                ? 'Cepillos, trapos y otros elementos'
                                : recambios === 0
                                  ? 'Nada para cambiar'
                                  : plural(recambios, 'elemento para cambiar', 'elementos para cambiar')}
                        </small>
                    </span>
                </Link>
            </div>
        </>
    );
}

export default function Inicio() {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'admin';
    const usuarioId = usuario?.id;
    const [datos, setDatos] = useState<DatosTablero | null>(null);

    useEffect(() => {
        let cancelado = false;
        const hoy = new Date();
        const haceSeisDias = new Date();
        haceSeisDias.setDate(hoy.getDate() - 6);

        const comunes = [getChecklistHoy(usuarioId), getAlertasRecambio()] as const;

        if (esAdmin) {
            Promise.allSettled([
                ...comunes,
                getVencimientosConsolidados(),
                getIncidentesAbiertos(),
                getHistorialChecklists(fechaLocal(haceSeisDias), fechaLocal(hoy)),
                getIncidentes(),
                getDocumentosVersionados(),
            ]).then(([checklist, recambios, vencimientos, incidentes, historial, todosLosIncidentes, documentos]) => {
                if (cancelado) return;
                setDatos({
                    checklist: aResultado(checklist),
                    recambios: aResultado(recambios),
                    vencimientos: aResultado(vencimientos),
                    incidentes: aResultado(incidentes),
                    historial: aResultado(historial),
                    todosLosIncidentes: aResultado(todosLosIncidentes),
                    documentos: aResultado(documentos),
                });
            });
        } else {
            Promise.allSettled(comunes).then(([checklist, recambios]) => {
                if (cancelado) return;
                setDatos({ checklist: aResultado(checklist), recambios: aResultado(recambios) });
            });
        }

        return () => {
            cancelado = true;
        };
    }, [esAdmin, usuarioId]);

    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className={shared.contenedorPrincipal}>
            <div className={styles.tablero}>
                <EncabezadoPagina
                    titulo={`${saludoSegunHora(ahora.getHours())}${usuario?.nombre ? `, ${usuario.nombre}` : ''}`}
                    descripcion={fecha}
                    ancho="100%"
                />

                {datos === null ? (
                    <p style={{ color: 'var(--text-muted)' }}>Cargando el tablero…</p>
                ) : esAdmin ? (
                    <TableroAdmin datos={datos} />
                ) : (
                    <TableroOperario datos={datos} />
                )}
            </div>
        </div>
    );
}
