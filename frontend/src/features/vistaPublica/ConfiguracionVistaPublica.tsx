import { useEffect, useState } from 'react';
import {
    getConfiguracionesVistaPublica,
    createConfiguracionVistaPublica,
    updateConfiguracionVistaPublicaById,
    deleteConfiguracionVistaPublicaById,
    getVistaPublicaByToken
} from '../../services/vistaPublicaServices';
import type { ConfiguracionVistaPublica, VistaPublicaResumen } from '../../types/vistaPublica';
import { QRCodeSVG } from 'qrcode.react';
import styles from '../../styles/shared.module.css';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import ModalConfirmacion from '../../components/confirmacion';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import VistaPublicaContenido from './VistaPublicaContenido';
import { abiertoDesdeEstaPc, direccionesDeRed, urlVistaPublica } from '../../utils/vistaPublicaUrl';
import { LARGO_CONTACTO, LARGO_PRESENTACION, LARGO_TITULO_PUBLICO } from './presentacion';

const REDES = direccionesDeRed();
const DESDE_ESTA_PC = abiertoDesdeEstaPc();

export default function ConfiguracionVistaPublica() {
    const [configuraciones, setConfiguraciones] = useState<ConfiguracionVistaPublica[]>([]);
    const [configSeleccionada, setConfigSeleccionada] = useState<ConfiguracionVistaPublica | null>(null);
    const [resumenPrevia, setResumenPrevia] = useState<VistaPublicaResumen | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const [modalCrearAbierto, setModalCrearAbierto] = useState<boolean>(false);
    const [nuevoNombre, setNuevoNombre] = useState<string>('');
    const [errorNuevoNombre, setErrorNuevoNombre] = useState<string>('');

    const [modalEditarAbierto, setModalEditarAbierto] = useState<boolean>(false);
    const [nombreEditar, setNombreEditar] = useState<string>('');
    const [activaEditar, setActivaEditar] = useState<boolean>(false);
    const [limpiezaEditar, setLimpiezaEditar] = useState<boolean>(true);
    const [sectoresEditar, setSectoresEditar] = useState<boolean>(false);
    const [equiposEditar, setEquiposEditar] = useState<boolean>(true);
    const [poesEditar, setPoesEditar] = useState<boolean>(false);
    const [incidentesEditar, setIncidentesEditar] = useState<boolean>(false);
    const [capacitacionesEditar, setCapacitacionesEditar] = useState<boolean>(false);
    const [trazabilidadEditar, setTrazabilidadEditar] = useState<boolean>(false);
    const [erroresPresentacion, setErroresPresentacion] = useState({ titulo: '', presentacion: '', contacto: '' });
    const [errorNombreEditar, setErrorNombreEditar] = useState<string>('');
    const [tituloEditar, setTituloEditar] = useState<string>('');
    const [presentacionEditar, setPresentacionEditar] = useState<string>('');
    const [contactoEditar, setContactoEditar] = useState<string>('');
    const [red, setRed] = useState<string | null>(REDES[0] ?? null);

    const [modalVerQrConf, setModalVerQrConf] = useState<ConfiguracionVistaPublica | null>(null);
    const [modalEliminarId, setModalEliminarId] = useState<number | null>(null);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const lista = await getConfiguracionesVistaPublica();
            setConfiguraciones(lista);

            if (lista.length > 0) {
                const actual = configSeleccionada
                    ? (lista.find(c => c.id === configSeleccionada.id) || lista[0])
                    : lista[0];
                setConfigSeleccionada(actual);
                if (actual.token && actual.activa) {
                    cargarPrevia(actual.token);
                } else {
                    setResumenPrevia(null);
                }
            } else {
                setConfigSeleccionada(null);
                setResumenPrevia(null);
            }
        } catch (err) {
            console.error("Error cargando vistas públicas:", err);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error',
                mensaje: 'Ocurrió un error al cargar las configuraciones de la vista pública.'
            });
        } finally {
            setLoading(false);
        }
    };

    const cargarPrevia = async (tok: string) => {
        try {
            const res = await getVistaPublicaByToken(tok);
            setResumenPrevia(res);
        } catch (err) {
            console.error("Error cargando vista previa:", err);
            setResumenPrevia(null);
        }
    };

    const handleCrearNuevo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nuevoNombre.trim()) {
            setErrorNuevoNombre('El nombre del QR es obligatorio.');
            return;
        }
        setErrorNuevoNombre('');

        try {
            setLoading(true);
            const creada = await createConfiguracionVistaPublica(nuevoNombre.trim());
            setNuevoNombre('');
            setModalCrearAbierto(false);
            await cargarDatos();
            abrirConfiguracionModal(creada);
        } catch (err) {
            console.error("Error creando vista pública:", err);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error',
                mensaje: 'No se pudo crear el nuevo código QR.'
            });
        } finally {
            setLoading(false);
        }
    };

    const abrirConfiguracionModal = (conf: ConfiguracionVistaPublica) => {
        setConfigSeleccionada(conf);
        setNombreEditar(conf.nombre);
        setActivaEditar(conf.activa);
        setLimpiezaEditar(conf.mostrar_cumplimiento_limpieza);
        setSectoresEditar(conf.mostrar_desglose_sectores ?? false);
        setEquiposEditar(conf.mostrar_equipos_calibrados);
        setPoesEditar(conf.mostrar_poes_vigentes ?? false);
        setIncidentesEditar(conf.mostrar_desglose_incidentes ?? false);
        setCapacitacionesEditar(conf.mostrar_capacitaciones ?? false);
        setTrazabilidadEditar(conf.mostrar_trazabilidad_lotes ?? false);
        setTituloEditar(conf.titulo_publico ?? '');
        setPresentacionEditar(conf.presentacion ?? '');
        setContactoEditar(conf.contacto ?? '');
        setErroresPresentacion({ titulo: '', presentacion: '', contacto: '' });
        setErrorNombreEditar('');

        if (conf.token && conf.activa) {
            cargarPrevia(conf.token);
        } else {
            setResumenPrevia(null);
        }
        setModalEditarAbierto(true);
    };

    const handleGuardarEdicionModal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!configSeleccionada) return;

        if (!nombreEditar.trim()) {
            setErrorNombreEditar('El nombre del QR es obligatorio.');
            return;
        }
        setErrorNombreEditar('');

        const errores = {
            titulo: tituloEditar.trim() ? '' : 'El nombre a mostrar es obligatorio.',
            presentacion: presentacionEditar.trim() ? '' : 'El mensaje de presentación es obligatorio.',
            contacto: contactoEditar.trim() ? '' : 'El contacto es obligatorio.',
        };
        setErroresPresentacion(errores);
        if (errores.titulo || errores.presentacion || errores.contacto) return;

        try {
            setLoading(true);
            const payload = {
                nombre: nombreEditar.trim(),
                activa: activaEditar,
                mostrar_cumplimiento_limpieza: limpiezaEditar,
                mostrar_desglose_sectores: sectoresEditar,
                mostrar_equipos_calibrados: equiposEditar,
                mostrar_capacitaciones: capacitacionesEditar,
                mostrar_poes_vigentes: poesEditar,
                mostrar_desglose_incidentes: incidentesEditar,
                mostrar_trazabilidad_lotes: trazabilidadEditar,
                titulo_publico: tituloEditar.trim(),
                presentacion: presentacionEditar.trim(),
                contacto: contactoEditar.trim()
            };
            const actualizada = await updateConfiguracionVistaPublicaById(configSeleccionada.id, payload);
            setModalEditarAbierto(false);
            await cargarDatos();
            setConfigSeleccionada(actualizada);
        } catch (err) {
            console.error("Error al guardar cambios:", err);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error',
                mensaje: err instanceof Error ? err.message : 'Ocurrió un error al guardar los cambios del código QR.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleEstadoTabla = async (conf: ConfiguracionVistaPublica) => {
        try {
            const actualizada = await updateConfiguracionVistaPublicaById(conf.id, { activa: !conf.activa });
            setConfiguraciones(prev => prev.map(c => c.id === conf.id ? actualizada : c));
            if (configSeleccionada?.id === conf.id) {
                setConfigSeleccionada(actualizada);
            }
        } catch (err) {
            console.error("Error al cambiar estado:", err);
            setModalAlerta({
                isOpen: true,
                titulo: 'No se pudo activar',
                mensaje: err instanceof Error ? err.message : 'No se pudo cambiar el estado del código QR.'
            });
        }
    };

    const handleEliminar = async () => {
        if (!modalEliminarId) return;
        try {
            setLoading(true);
            await deleteConfiguracionVistaPublicaById(modalEliminarId);
            setModalEliminarId(null);
            if (configSeleccionada?.id === modalEliminarId) {
                setConfigSeleccionada(null);
            }
            await cargarDatos();
        } catch (err) {
            console.error("Error eliminando vista pública:", err);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error',
                mensaje: 'Ocurrió un error al eliminar el código QR.'
            });
        } finally {
            setLoading(false);
        }
    };

    const fallbackCopiar = (url: string) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = url;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const exitoso = document.execCommand('copy');
            textArea.remove();
            if (exitoso) {
                setModalAlerta({
                    isOpen: true,
                    titulo: 'Enlace Copiado',
                    mensaje: 'El enlace de la vista pública ha sido copiado al portapapeles.'
                });
            } else {
                throw new Error("execCommand no exitoso");
            }
        } catch (e) {
            console.error("Error copiando enlace:", e);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error',
                mensaje: 'No se pudo copiar automáticamente. Puedes copiar la URL manualmente.'
            });
        }
    };

    const copiarEnlace = (tokenStr: string | null) => {
        if (!tokenStr) return;
        const url = urlVistaPublica(tokenStr, red);

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url)
                .then(() => {
                    setModalAlerta({
                        isOpen: true,
                        titulo: 'Enlace Copiado',
                        mensaje: 'El enlace de la vista pública ha sido copiado al portapapeles.'
                    });
                })
                .catch(() => fallbackCopiar(url));
        } else {
            fallbackCopiar(url);
        }
    };

    const columnas: Columna<ConfiguracionVistaPublica>[] = [
        {
            key: 'nombre',
            encabezado: 'Nombre de la Vista / QR',
            ordenable: true,
            render: (c) => <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>{c.nombre}</span>
        },
        {
            key: 'activa',
            encabezado: 'Estado',
            ordenable: true,
            render: (c) => (
                <span style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    display: 'inline-block',
                    backgroundColor: c.activa ? '#dcfce7' : '#f1f5f9',
                    color: c.activa ? '#166534' : '#64748b'
                }}>
                    {c.activa ? 'Activo' : 'Inactivo'}
                </span>
            )
        },
        {
            key: 'indicadores',
            encabezado: 'Indicadores Visibles',
            render: (c) => {
                const activos = [];
                if (c.mostrar_cumplimiento_limpieza) activos.push('Limpieza');
                if (c.mostrar_desglose_sectores) activos.push('Sectores');
                if (c.mostrar_equipos_calibrados) activos.push('Equipos');
                if (c.mostrar_poes_vigentes) activos.push('POES');
                if (c.mostrar_desglose_incidentes) activos.push('Desvíos');
                if (c.mostrar_capacitaciones) activos.push('Capacitaciones');
                if (c.mostrar_trazabilidad_lotes) activos.push('Trazabilidad');

                if (activos.length === 0) return <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>Ninguno</span>;
                return (
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {activos.map(act => (
                            <span key={act} style={{ padding: '0.2rem 0.55rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.78rem' }}>
                                {act}
                            </span>
                        ))}
                    </div>
                );
            }
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones',
            render: (c) => (
                <>
                    <Boton
                        onClick={() => setModalVerQrConf(c)}
                        variant="ver"
                        title="Ver Código QR"
                    />
                    <Boton
                        onClick={() => abrirConfiguracionModal(c)}
                        variant="editar"
                        title="Configurar QR"
                    />
                    <Boton
                        onClick={() => handleToggleEstadoTabla(c)}
                        variant={c.activa ? "pausar" : "reanudar"}
                        title={c.activa ? "Pausar QR" : "Activar QR"}
                    />
                    <Boton
                        onClick={() => setModalEliminarId(c.id)}
                        variant="eliminar"
                        title="Eliminar QR"
                    />
                </>
            )
        }
    ];

    if (loading && configuraciones.length === 0) {
        return <div className={styles.contenedorPrincipal}>Cargando configuración de vistas públicas...</div>;
    }

    const resumenPreviaLocal: VistaPublicaResumen = {
        activa: activaEditar,
        nombre: nombreEditar || 'Vista Pública',
        fecha_actualizacion: new Date().toISOString(),
        mostrar_cumplimiento_limpieza: limpiezaEditar,
        mostrar_desglose_sectores: sectoresEditar,
        mostrar_equipos_calibrados: equiposEditar,
        mostrar_poes_vigentes: poesEditar,
        mostrar_desglose_incidentes: incidentesEditar,
        mostrar_capacitaciones: capacitacionesEditar,
        mostrar_trazabilidad_lotes: trazabilidadEditar,
        titulo_publico: tituloEditar.trim() || 'Nombre del establecimiento',
        presentacion: presentacionEditar.trim() || 'Mensaje de presentación del establecimiento.',
        contacto: contactoEditar.trim() || 'Datos de contacto del establecimiento',
        porcentaje_cumplimiento_limpieza: resumenPrevia?.porcentaje_cumplimiento_limpieza ?? 74.6,
        porcentaje_equipos_al_dia: resumenPrevia?.porcentaje_equipos_al_dia ?? 100,
        porcentaje_personal_capacitado: resumenPrevia?.porcentaje_personal_capacitado ?? 100,
        porcentaje_libretas_sanitarias: resumenPrevia?.porcentaje_libretas_sanitarias ?? 100,
        porcentaje_capacitaciones_bpm: resumenPrevia?.porcentaje_capacitaciones_bpm ?? 100,
        porcentaje_certificados_aptitud: resumenPrevia?.porcentaje_certificados_aptitud ?? 100,
        porcentaje_poes_vigentes: resumenPrevia?.porcentaje_poes_vigentes ?? 100,
        porcentaje_lotes_trazables: resumenPrevia?.porcentaje_lotes_trazables ?? 100,
        lotes_totales_trazables: resumenPrevia?.lotes_totales_trazables ?? 12,
        volumen_trazable_kg: resumenPrevia?.volumen_trazable_kg ?? 1250,
        desglose_sectores: resumenPrevia?.desglose_sectores ?? [
            { sector: 'Elaboración', porcentaje: 95.0, color: '#16a34a' },
            { sector: 'Envasado', porcentaje: 100.0, color: '#2563eb' },
            { sector: 'Depósito y Materias Primas', porcentaje: 90.0, color: '#0d9488' }
        ],
        desglose_incidentes: resumenPrevia?.desglose_incidentes ?? [
            { etiqueta: 'Desvíos Corregidos y Resueltos', cantidad: 10, porcentaje: 100.0, color: '#16a34a' },
            { etiqueta: 'En Revisión Preventiva', cantidad: 0, porcentaje: 0.0, color: '#2563eb' }
        ],
        serie_cumplimiento: resumenPrevia?.serie_cumplimiento ?? [
            { periodo: '2026-11-10', porcentaje: 80 },
            { periodo: '2026-11-15', porcentaje: 90 },
            { periodo: '2026-11-20', porcentaje: 85 },
            { periodo: '2026-11-23', porcentaje: 100 }
        ]
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Configuración de Vistas Públicas (QRs)"
                descripcion="Gestiona y personaliza tus códigos QR públicos. Cada QR es independiente y permite mostrar a los clientes tus indicadores de cumplimiento de calidad."
            />

            <div className={styles.filaBotonesSuperiores}>
                <Boton onClick={() => { setNuevoNombre(''); setErrorNuevoNombre(''); setModalCrearAbierto(true); }} variant="crear">
                 Crear Nuevo QR
                </Boton>
            </div>

            <div style={{ width: '100%', maxWidth: '1100px' }}>
                <TablaPaginada
                    datos={configuraciones}
                    columnas={columnas}
                    gridTemplateColumns="2fr 1.2fr 2fr 1.5fr"
                    permitirExportar={false}
                    itemsPorPagina={10}
                />
            </div>

            {modalCrearAbierto && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className={styles.tarjeta} style={{ maxWidth: '450px', width: '100%' }}>
                        <h3 className={styles.label} style={{ marginBottom: '1rem' }}>Crear Nuevo Código QR</h3>
                        <form noValidate onSubmit={handleCrearNuevo}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem', color: 'var(--text-h)' }}>
                                    Nombre o Etiqueta del QR:
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej. Sucursal Centro, Planta Principal..."
                                    value={nuevoNombre}
                                    onChange={(e) => { setNuevoNombre(e.target.value); setErrorNuevoNombre(''); }}
                                    className={styles.input}
                                    style={{ width: '100%' }}
                                />
                                {errorNuevoNombre && (
                                    <span style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '4px', display: 'block' }}>
                                        {errorNuevoNombre}
                                    </span>
                                )}
                            </div>
                            <div className={styles.filaBotones} style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                <Boton type="submit" variant="guardar">Guardar</Boton>
                                <Boton type="button" onClick={() => setModalCrearAbierto(false)} variant="volver">Cancelar</Boton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalEditarAbierto && configSeleccionada && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className={styles.tarjeta} style={{ maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                            <h3 className={styles.label} style={{ margin: 0 }}>Configurar QR</h3>
                            <button onClick={() => setModalEditarAbierto(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text)' }}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <form noValidate onSubmit={handleGuardarEdicionModal} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-h)' }}>Nombre del QR / Ubicación:</label>
                                <input
                                    type="text"
                                    value={nombreEditar}
                                    onChange={(e) => { setNombreEditar(e.target.value); setErrorNombreEditar(''); }}
                                    className={styles.input}
                                    style={{ width: '100%', marginTop: '0.35rem' }}
                                />
                                {errorNombreEditar && (
                                    <span style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '4px', display: 'block' }}>
                                        {errorNombreEditar}
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', color: 'var(--text-h)' }}>Presentación del establecimiento:</h4>
                                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        Se muestra siempre en la vista pública, con o sin indicadores. No incluyas datos del personal.
                                    </p>
                                </div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-h)' }}>
                                    Nombre a mostrar *
                                    <input
                                        type="text"
                                        maxLength={LARGO_TITULO_PUBLICO}
                                        placeholder="Ej. Panadería La Espiga"
                                        value={tituloEditar}
                                        onChange={(e) => { setTituloEditar(e.target.value); setErroresPresentacion((previos) => ({ ...previos, titulo: '' })); }}
                                        style={{ width: '100%', marginTop: '0.35rem' }}
                                    />
                                    {erroresPresentacion.titulo && (
                                        <span style={{ display: 'block', color: '#ef4444', fontSize: '0.82rem', fontWeight: 400, marginTop: '4px' }}>
                                            {erroresPresentacion.titulo}
                                        </span>
                                    )}
                                </label>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-h)' }}>
                                    Mensaje de presentación *
                                    <textarea
                                        maxLength={LARGO_PRESENTACION}
                                        rows={4}
                                        placeholder="Ej. Elaboramos pan y facturas todos los días con materias primas seleccionadas."
                                        value={presentacionEditar}
                                        onChange={(e) => { setPresentacionEditar(e.target.value); setErroresPresentacion((previos) => ({ ...previos, presentacion: '' })); }}
                                        style={{ width: '100%', marginTop: '0.35rem', boxSizing: 'border-box', resize: 'vertical', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-h)', fontFamily: 'inherit', fontWeight: 400, fontSize: '0.92rem' }}
                                    />
                                    {erroresPresentacion.presentacion && (
                                        <span style={{ display: 'block', color: '#ef4444', fontSize: '0.82rem', fontWeight: 400, marginTop: '4px' }}>
                                            {erroresPresentacion.presentacion}
                                        </span>
                                    )}
                                    <span style={{ display: 'block', textAlign: 'right', fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                                        {presentacionEditar.length}/{LARGO_PRESENTACION}
                                    </span>
                                </label>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-h)' }}>
                                    Contacto *
                                    <input
                                        type="text"
                                        maxLength={LARGO_CONTACTO}
                                        placeholder="Ej. Av. Fontana 123 · Tel. 280 400-0000 · @laespiga"
                                        value={contactoEditar}
                                        onChange={(e) => { setContactoEditar(e.target.value); setErroresPresentacion((previos) => ({ ...previos, contacto: '' })); }}
                                        style={{ width: '100%', marginTop: '0.35rem' }}
                                    />
                                    {erroresPresentacion.contacto && (
                                        <span style={{ display: 'block', color: '#ef4444', fontSize: '0.82rem', fontWeight: 400, marginTop: '4px' }}>
                                            {erroresPresentacion.contacto}
                                        </span>
                                    )}
                                </label>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                                <div>
                                    <strong style={{ color: 'var(--text-h)' }}>Estado de la Vista Pública:</strong>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {activaEditar ? 'El enlace y QR están disponibles públicamente.' : 'Pausado: la URL devolverá Enlace Caducado (404).'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 'bold', color: activaEditar ? '#166534' : 'var(--text-muted)' }}>
                                        {activaEditar ? 'Activo' : 'Inactivo'}
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={activaEditar}
                                        onChange={(e) => setActivaEditar(e.target.checked)}
                                        style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>

                            {activaEditar && (
                                <div>
                                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', color: 'var(--text-h)' }}>Indicadores Visibles:</h4>
                                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        Opcionales: elegí cuáles mostrar, o ninguno.
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                            <span style={{ fontSize: '0.9rem' }}>Cumplimiento de Limpieza e Higiene</span>
                                            <input
                                                type="checkbox"
                                                checked={limpiezaEditar}
                                                onChange={(e) => setLimpiezaEditar(e.target.checked)}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                        </label>

                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                            <span style={{ fontSize: '0.9rem' }}>Cumplimiento de Higiene por Sector de Planta</span>
                                            <input
                                                type="checkbox"
                                                checked={sectoresEditar}
                                                onChange={(e) => setSectoresEditar(e.target.checked)}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                        </label>

                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                            <span style={{ fontSize: '0.9rem' }}>Equipos con Calibración al Día</span>
                                            <input
                                                type="checkbox"
                                                checked={equiposEditar}
                                                onChange={(e) => setEquiposEditar(e.target.checked)}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                        </label>

                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                            <span style={{ fontSize: '0.9rem' }}>Procedimientos Operativos (POES) Vigentes</span>
                                            <input
                                                type="checkbox"
                                                checked={poesEditar}
                                                onChange={(e) => setPoesEditar(e.target.checked)}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                        </label>

                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                            <span style={{ fontSize: '0.9rem' }}>Resolución de Desvíos e Incidentes de Calidad</span>
                                            <input
                                                type="checkbox"
                                                checked={incidentesEditar}
                                                onChange={(e) => setIncidentesEditar(e.target.checked)}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                        </label>

                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                            <span style={{ fontSize: '0.9rem' }}>Personal Capacitado y Habilitado</span>
                                            <input
                                                type="checkbox"
                                                checked={capacitacionesEditar}
                                                onChange={(e) => setCapacitacionesEditar(e.target.checked)}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                        </label>

                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                            <span style={{ fontSize: '0.9rem' }}>Control de Trazabilidad en Lotes</span>
                                            <input
                                                type="checkbox"
                                                checked={trazabilidadEditar}
                                                onChange={(e) => setTrazabilidadEditar(e.target.checked)}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            )}

                            {configSeleccionada && (
                                <div style={{ textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                    <div style={{ padding: '0.75rem', background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'inline-block', marginBottom: '1rem' }}>
                                        <QRCodeSVG value={urlVistaPublica(configSeleccionada.token || 'borrador', red)} size={160} level="H" />
                                    </div>
                                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                                        {urlVistaPublica(configSeleccionada.token || 'borrador', red)}
                                    </p>
                                    {DESDE_ESTA_PC && REDES.length > 1 && (
                                        <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.75rem', color: 'var(--text-h)' }}>
                                            Red del QR
                                            <select
                                                value={red ?? ''}
                                                onChange={(e) => setRed(e.target.value)}
                                                style={{ width: 'auto', marginLeft: '0.5rem' }}
                                            >
                                                {REDES.map((direccion) => (
                                                    <option key={direccion} value={direccion}>{direccion}</option>
                                                ))}
                                            </select>
                                        </label>
                                    )}
                                    {DESDE_ESTA_PC && REDES.length === 0 && (
                                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem', color: '#f59e0b' }}>
                                            Esta computadora no está conectada a ninguna red: el QR solo va a funcionar en esta PC.
                                        </p>
                                    )}
                                    <div>
                                        <Boton type="button" onClick={() => copiarEnlace(configSeleccionada.token)} variant="crear">Copiar Enlace Público</Boton>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: '0.5rem', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '0.75rem', background: 'var(--bg)' }}>
                                <h5 style={{ textAlign: 'center', margin: '0 0 0.5rem 0' }}>Vista Previa en Tiempo Real</h5>
                                <VistaPublicaContenido resumen={resumenPreviaLocal} />
                            </div>

                            <div className={styles.filaBotones} style={{ justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                                <Boton type="submit" variant="guardar">Guardar</Boton>
                                <Boton type="button" onClick={() => setModalEditarAbierto(false)} variant="volver">Cancelar</Boton>                               
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalVerQrConf && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className={styles.tarjeta} style={{ maxWidth: '460px', width: '100%', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                            <h3 className={styles.label} style={{ margin: 0 }}>{modalVerQrConf.nombre}</h3>
                            <button onClick={() => setModalVerQrConf(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text)' }}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        {modalVerQrConf.token ? (
                            <>
                                <div style={{ padding: '1rem', background: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'inline-block', marginBottom: '1rem' }}>
                                    <QRCodeSVG value={urlVistaPublica(modalVerQrConf.token, red)} size={220} level="H" />
                                </div>
                                <p style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                                    {urlVistaPublica(modalVerQrConf.token, red)}
                                </p>
                                {DESDE_ESTA_PC && REDES.length > 1 && (
                                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '1rem', color: 'var(--text-h)' }}>
                                        Red del QR:
                                        <select
                                            value={red ?? ''}
                                            onChange={(e) => setRed(e.target.value)}
                                            style={{ width: 'auto', marginLeft: '0.5rem' }}
                                        >
                                            {REDES.map((direccion) => (
                                                <option key={direccion} value={direccion}>{direccion}</option>
                                            ))}
                                        </select>
                                    </label>
                                )}
                                {DESDE_ESTA_PC && REDES.length === 0 && (
                                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#f59e0b' }}>
                                        Esta computadora no está conectada a ninguna red: el QR solo funciona localmente.
                                    </p>
                                )}
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                                    <Boton type="button" onClick={() => copiarEnlace(modalVerQrConf.token)} variant="crear">Copiar Enlace Público</Boton>
                                    <Boton type="button" onClick={() => setModalVerQrConf(null)} variant="volver">Cerrar</Boton>
                                </div>
                            </>
                        ) : (
                            <p style={{ color: 'var(--text-muted)' }}>Esta vista no tiene un código generado.</p>
                        )}
                    </div>
                </div>
            )}

            <ModalConfirmacion
                isOpen={modalEliminarId !== null}
                titulo="Eliminar Código QR"
                mensaje="¿Estás seguro de que deseas eliminar este código QR? Esta acción no se puede deshacer y cualquier cliente que escanee este QR recibirá una notificación de enlace caducado."
                onConfirm={handleEliminar}
                onCancel={() => setModalEliminarId(null)}
            />

            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={() => setModalAlerta({ ...modalAlerta, isOpen: false })}
            />
        </div>
    );
}
