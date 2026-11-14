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
    const [equiposEditar, setEquiposEditar] = useState<boolean>(true);
    const [poesEditar, setPoesEditar] = useState<boolean>(false);
    const [capacitacionesEditar, setCapacitacionesEditar] = useState<boolean>(false);
    const [trazabilidadEditar, setTrazabilidadEditar] = useState<boolean>(false);
    const [errorIndicadoresModal, setErrorIndicadoresModal] = useState<string>('');
    const [errorNombreEditar, setErrorNombreEditar] = useState<string>('');

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
        setEquiposEditar(conf.mostrar_equipos_calibrados);
        setPoesEditar(conf.mostrar_poes_vigentes ?? false);
        setCapacitacionesEditar(conf.mostrar_capacitaciones ?? false);
        setTrazabilidadEditar(conf.mostrar_trazabilidad_lotes ?? false);
        setErrorIndicadoresModal('');
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

        if (!limpiezaEditar && !equiposEditar && !poesEditar && !capacitacionesEditar && !trazabilidadEditar) {
            setErrorIndicadoresModal('Debe seleccionar al menos un indicador para mostrar en la vista pública.');
            return;
        }
        setErrorIndicadoresModal('');

        try {
            setLoading(true);
            const payload = {
                nombre: nombreEditar.trim(),
                activa: activaEditar,
                mostrar_cumplimiento_limpieza: limpiezaEditar,
                mostrar_equipos_calibrados: equiposEditar,
                mostrar_capacitaciones: capacitacionesEditar,
                mostrar_poes_vigentes: poesEditar,
                mostrar_trazabilidad_lotes: trazabilidadEditar
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
                mensaje: 'Ocurrió un error al guardar los cambios del código QR.'
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

    const copiarEnlace = (tokenStr: string | null) => {
        if (!tokenStr) return;
        const url = `${window.location.origin}/publico/${tokenStr}`;
        navigator.clipboard.writeText(url);
        setModalAlerta({
            isOpen: true,
            titulo: 'Enlace Copiado',
            mensaje: 'El enlace de la vista pública ha sido copiado al portapapeles.'
        });
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
                if (c.mostrar_equipos_calibrados) activos.push('Equipos');
                if (c.mostrar_poes_vigentes) activos.push('POES');
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

    // Objeto para vista previa interactiva en tiempo real en el modal de edición
    const resumenPreviaLocal: VistaPublicaResumen | null = resumenPrevia ? {
        ...resumenPrevia,
        nombre: nombreEditar,
        mostrar_cumplimiento_limpieza: limpiezaEditar,
        mostrar_equipos_calibrados: equiposEditar,
        mostrar_poes_vigentes: poesEditar,
        mostrar_capacitaciones: capacitacionesEditar,
        mostrar_trazabilidad_lotes: trazabilidadEditar
    } : null;

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
                    itemsPorPagina={10}
                />
            </div>

            {/* MODAL CREAR NUEVO QR */}
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

            {/* MODAL CONFIGURAR / EDITAR QR */}
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
                                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'var(--text-h)' }}>Indicadores Visibles:</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                            <span style={{ fontSize: '0.9rem' }}>Cumplimiento de Limpieza e Higiene</span>
                                            <input
                                                type="checkbox"
                                                checked={limpiezaEditar}
                                                onChange={(e) => {
                                                    setLimpiezaEditar(e.target.checked);
                                                    setErrorIndicadoresModal('');
                                                }}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                        </label>

                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                            <span style={{ fontSize: '0.9rem' }}>Equipos con Calibración al Día</span>
                                            <input
                                                type="checkbox"
                                                checked={equiposEditar}
                                                onChange={(e) => {
                                                    setEquiposEditar(e.target.checked);
                                                    setErrorIndicadoresModal('');
                                                }}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                        </label>

                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                            <span style={{ fontSize: '0.9rem' }}>Procedimientos Operativos (POES) Vigentes</span>
                                            <input
                                                type="checkbox"
                                                checked={poesEditar}
                                                onChange={(e) => {
                                                    setPoesEditar(e.target.checked);
                                                    setErrorIndicadoresModal('');
                                                }}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                        </label>

                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                            <span style={{ fontSize: '0.9rem' }}>Personal Capacitado y Habilitado</span>
                                            <input
                                                type="checkbox"
                                                checked={capacitacionesEditar}
                                                onChange={(e) => {
                                                    setCapacitacionesEditar(e.target.checked);
                                                    setErrorIndicadoresModal('');
                                                }}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                        </label>

                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                            <span style={{ fontSize: '0.9rem' }}>Control de Trazabilidad en Lotes</span>
                                            <input
                                                type="checkbox"
                                                checked={trazabilidadEditar}
                                                onChange={(e) => {
                                                    setTrazabilidadEditar(e.target.checked);
                                                    setErrorIndicadoresModal('');
                                                }}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                        </label>
                                    </div>
                                    {errorIndicadoresModal && (
                                        <span style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '6px', display: 'block' }}>
                                            {errorIndicadoresModal}
                                        </span>
                                    )}
                                </div>
                            )}

                            {activaEditar && configSeleccionada.token && (
                                <div style={{ textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                    <div style={{ padding: '0.75rem', background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'inline-block', marginBottom: '1rem' }}>
                                        <QRCodeSVG value={`${window.location.origin}/publico/${configSeleccionada.token}`} size={160} level="H" />
                                    </div>
                                    <div>
                                        <Boton type="button" onClick={() => copiarEnlace(configSeleccionada.token)} variant="crear">Copiar Enlace Público</Boton>
                                    </div>
                                </div>
                            )}

                            {activaEditar && resumenPreviaLocal && (
                                <div style={{ marginTop: '0.5rem', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '0.75rem', background: 'var(--bg)' }}>
                                    <h5 style={{ textAlign: 'center', margin: '0 0 0.5rem 0' }}>Vista Previa</h5>
                                    <VistaPublicaContenido resumen={resumenPreviaLocal} />
                                </div>
                            )}

                            <div className={styles.filaBotones} style={{ justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                                <Boton type="submit" variant="guardar">Guardar</Boton>
                                <Boton type="button" onClick={() => setModalEditarAbierto(false)} variant="volver">Cancelar</Boton>                               
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMACION PARA ELIMINAR */}
            <ModalConfirmacion
                isOpen={modalEliminarId !== null}
                titulo="Eliminar Código QR"
                mensaje="¿Estás seguro de que deseas eliminar este código QR? Esta acción no se puede deshacer y cualquier cliente que escanee este QR recibirá una notificación de enlace caducado."
                onConfirm={handleEliminar}
                onCancel={() => setModalEliminarId(null)}
            />

            {/* MODAL ALERTA */}
            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={() => setModalAlerta({ ...modalAlerta, isOpen: false })}
            />
        </div>
    );
}
