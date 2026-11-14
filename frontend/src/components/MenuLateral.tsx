import { useState } from 'react';
import { NavLink, matchPath, useLocation } from 'react-router-dom';

import styles from './MenuLateral.module.css';

interface Enlace {
    etiqueta: string;
    ruta: string;
    icono?: string;
    soloAdmin?: boolean;
    exacta?: boolean;
}

interface Grupo {
    clave: string;
    etiqueta: string;
    icono: string;
    soloAdmin?: boolean;
    enlaces: Enlace[];
}

interface Seccion {
    titulo: string;
    entradas: (Enlace | Grupo)[];
}

const SECCIONES: Seccion[] = [
    {
        titulo: 'Día a día',
        entradas: [
            { etiqueta: 'Inicio', ruta: '/', icono: 'grid-1x2', exacta: true },
            { etiqueta: 'Checklist del día', ruta: '/checklists/hoy', icono: 'check2-square' },
            { etiqueta: 'Registrar incidente', ruta: '/incidentes/nuevo', icono: 'exclamation-octagon' },
            { etiqueta: 'Registrar lote', ruta: '/lotes-produccion/nuevo', icono: 'box2' },
            { etiqueta: 'Documentos vigentes', ruta: '/documentos/vigentes', icono: 'file-earmark-check' },
            { etiqueta: 'Vencimientos', ruta: '/vencimientos', icono: 'calendar2-week', soloAdmin: true },
        ],
    },
    {
        titulo: 'Gestión',
        entradas: [
            {
                clave: 'personal',
                etiqueta: 'Personal',
                icono: 'people',
                soloAdmin: true,
                enlaces: [
                    { etiqueta: 'Empleados', ruta: '/empleados' },
                    { etiqueta: 'Capacidades', ruta: '/capacidades' },
                    { etiqueta: 'Vencimientos de personal', ruta: '/vencimientos-documentacion' },
                    { etiqueta: 'Alertas de vencimiento', ruta: '/alertas-documentacion' },
                ],
            },
            {
                clave: 'planta',
                etiqueta: 'Planta',
                icono: 'building',
                soloAdmin: true,
                enlaces: [
                    { etiqueta: 'Sectores', ruta: '/sectores' },
                    { etiqueta: 'Equipos', ruta: '/equipos' },
                ],
            },
            {
                clave: 'insumos',
                etiqueta: 'Insumos',
                icono: 'box-seam',
                soloAdmin: true,
                enlaces: [
                    { etiqueta: 'Insumos', ruta: '/insumos' },
                    { etiqueta: 'Unidades de medida', ruta: '/unidadesMedida' },
                ],
            },
            {
                clave: 'limpieza',
                etiqueta: 'Limpieza',
                icono: 'droplet',
                enlaces: [
                    { etiqueta: 'Planes de limpieza', ruta: '/planes', soloAdmin: true },
                    { etiqueta: 'Tareas de limpieza', ruta: '/tareas' },
                    { etiqueta: 'Productos de limpieza', ruta: '/productos_limpieza', soloAdmin: true },
                    { etiqueta: 'Elementos de limpieza', ruta: '/elementosLimpieza', soloAdmin: true, exacta: true },
                    { etiqueta: 'Alertas de recambio', ruta: '/elementosLimpieza/alertas' },
                    { etiqueta: 'Historial de checklists', ruta: '/checklists/historial', soloAdmin: true },
                    { etiqueta: 'Cumplimiento de limpieza', ruta: '/checklists/cumplimiento', soloAdmin: true },
                ],
            },
            {
                clave: 'produccion',
                etiqueta: 'Producción',
                icono: 'basket',
                soloAdmin: true,
                enlaces: [
                    { etiqueta: 'Productos', ruta: '/productos' },
                    { etiqueta: 'Historial de lotes', ruta: '/lotes-produccion', exacta: true },
                    { etiqueta: 'Datos nutricionales', ruta: '/datos-nutricionales' },
                ],
            },
            {
                clave: 'documentos',
                etiqueta: 'Documentos',
                icono: 'folder2-open',
                soloAdmin: true,
                enlaces: [{ etiqueta: 'Documentos versionados', ruta: '/documentos', exacta: true }],
            },
            {
                clave: 'incidentes',
                etiqueta: 'Incidentes',
                icono: 'clipboard-pulse',
                soloAdmin: true,
                enlaces: [
                    { etiqueta: 'Incidentes reportados', ruta: '/incidentes', exacta: true },
                    { etiqueta: 'Incidentes abiertos', ruta: '/incidentes/abiertos' },
                    { etiqueta: 'Estadísticas', ruta: '/incidentes/estadisticas' },
                ],
            },
            {
                clave: 'configuracion',
                etiqueta: 'Configuración',
                icono: 'gear',
                soloAdmin: true,
                enlaces: [
                    { etiqueta: 'Vista Pública', ruta: '/configuracion/vista-publica', exacta: true },
                ],
            },
        ],
    },
];

function esGrupo(entrada: Enlace | Grupo): entrada is Grupo {
    return 'enlaces' in entrada;
}

function coincide(enlace: Enlace, ruta: string): boolean {
    return matchPath({ path: enlace.ruta, end: enlace.exacta ?? false }, ruta) !== null;
}

interface MenuLateralProps {
    esAdmin: boolean;
    onNavegar?: () => void;
}

export default function MenuLateral({ esAdmin, onNavegar }: MenuLateralProps) {
    const { pathname } = useLocation();

    const visible = (elemento: { soloAdmin?: boolean }) => esAdmin || !elemento.soloAdmin;

    const secciones = SECCIONES.map((seccion) => ({
        ...seccion,
        entradas: seccion.entradas
            .filter(visible)
            .map((entrada) =>
                esGrupo(entrada) ? { ...entrada, enlaces: entrada.enlaces.filter(visible) } : entrada,
            )
            .filter((entrada) => !esGrupo(entrada) || entrada.enlaces.length > 0),
    })).filter((seccion) => seccion.entradas.length > 0);

    const grupoDeLaRuta =
        secciones
            .flatMap((seccion) => seccion.entradas)
            .filter(esGrupo)
            .find((grupo) => grupo.enlaces.some((enlace) => coincide(enlace, pathname)))?.clave ?? null;

    const [rutaVista, setRutaVista] = useState(pathname);
    const [grupoAbierto, setGrupoAbierto] = useState<string | null>(grupoDeLaRuta);

    if (rutaVista !== pathname) {
        setRutaVista(pathname);
        if (grupoDeLaRuta) setGrupoAbierto(grupoDeLaRuta);
    }

    const claseItem = ({ isActive }: { isActive: boolean }) =>
        `${styles.item} ${isActive ? styles.itemActivo : ''}`;
    const claseSubitem = ({ isActive }: { isActive: boolean }) =>
        `${styles.subitem} ${isActive ? styles.subitemActivo : ''}`;

    const renderEnlace = (enlace: Enlace, icono: string) => (
        <NavLink
            key={enlace.ruta}
            to={enlace.ruta}
            end={enlace.exacta}
            className={claseItem}
            onClick={onNavegar}
        >
            <i className={`bi bi-${icono} ${styles.icono}`} aria-hidden="true"></i>
            <span className={styles.texto}>{enlace.etiqueta}</span>
        </NavLink>
    );

    return (
        <div className={styles.menu}>
            {secciones.map((seccion) => (
                <div key={seccion.titulo} className={styles.seccion}>
                    <span className={styles.seccionTitulo}>{seccion.titulo}</span>

                    {seccion.entradas.map((entrada) => {
                        if (!esGrupo(entrada)) return renderEnlace(entrada, entrada.icono ?? 'dot');

                        if (entrada.enlaces.length === 1) return renderEnlace(entrada.enlaces[0], entrada.icono);

                        const abierto = grupoAbierto === entrada.clave;
                        const contieneActivo = grupoDeLaRuta === entrada.clave;
                        const idLista = `menu-grupo-${entrada.clave}`;

                        return (
                            <div key={entrada.clave}>
                                <button
                                    type="button"
                                    className={`${styles.grupoBoton} ${contieneActivo ? styles.grupoContieneActivo : ''}`}
                                    aria-expanded={abierto}
                                    aria-controls={idLista}
                                    onClick={() => setGrupoAbierto(abierto ? null : entrada.clave)}
                                >
                                    <i className={`bi bi-${entrada.icono} ${styles.icono}`} aria-hidden="true"></i>
                                    <span className={styles.texto}>{entrada.etiqueta}</span>
                                    <i
                                        className={`bi bi-chevron-down ${styles.chevron} ${abierto ? styles.chevronAbierto : ''}`}
                                        aria-hidden="true"
                                    ></i>
                                </button>

                                {abierto && (
                                    <div id={idLista} className={styles.subitems}>
                                        {entrada.enlaces.map((enlace) => (
                                            <NavLink
                                                key={enlace.ruta}
                                                to={enlace.ruta}
                                                end={enlace.exacta}
                                                className={claseSubitem}
                                                onClick={onNavegar}
                                            >
                                                {enlace.etiqueta}
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
