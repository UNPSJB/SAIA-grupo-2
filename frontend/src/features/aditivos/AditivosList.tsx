import { useEffect, useState } from 'react';
import { getAditivos, getClasesFuncionales, createAditivo, createClaseFuncional } from '../../services/aditivosServices';
import type { Aditivo, ClaseFuncionalAditivo } from '../../types/aditivos';
import styles from '../../styles/shared.module.css';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';

export default function AditivosList() {
    const [aditivos, setAditivos] = useState<Aditivo[]>([]);
    const [clases, setClases] = useState<ClaseFuncionalAditivo[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [pestanaActiva, setPestanaActiva] = useState<'aditivos' | 'clases'>('aditivos');

    const [modalAditivoAbierto, setModalAditivoAbierto] = useState(false);
    const [nombreCompleto, setNombreCompleto] = useState('');
    const [claseId, setClaseId] = useState<number | ''>('');
    const [numeroIns, setNumeroIns] = useState('');

    const [modalClaseAbierto, setModalClaseAbierto] = useState(false);
    const [nombreClase, setNombreClase] = useState('');
    const [necesitaIns, setNecesitaIns] = useState(true);

    const [guardando, setGuardando] = useState(false);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const [listAditivos, listClases] = await Promise.all([
                getAditivos(),
                getClasesFuncionales(),
            ]);
            setAditivos(listAditivos);
            setClases(listClases);
        } catch (err) {
            console.error('Error cargando aditivos:', err);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error',
                mensaje: 'Ocurrió un error al cargar la lista de aditivos y clases funcionales.',
            });
        } finally {
            setLoading(false);
        }
    };

    const claseSeleccionadaObj = clases.find((c) => c.id === Number(claseId));

    const handleCrearAditivo = async (e: React.FormEvent) => {
        e.preventDefault();
        const nombreLimpio = nombreCompleto.trim();
        if (!nombreLimpio || !claseId) {
            setModalAlerta({
                isOpen: true,
                titulo: 'Campo Requerido',
                mensaje: 'Debes completar el nombre completo y seleccionar una clase funcional.',
            });
            return;
        }

        if (claseSeleccionadaObj?.necesita_ins && !numeroIns.trim()) {
            setModalAlerta({
                isOpen: true,
                titulo: 'Número INS Requerido',
                mensaje: `La clase funcional "${claseSeleccionadaObj.nombre}" requiere ingresar el número INS.`,
            });
            return;
        }

        try {
            setGuardando(true);
            await createAditivo({
                nombre_completo: nombreLimpio,
                clase_funcional_id: Number(claseId),
                numero_ins: numeroIns.trim() || null,
            });
            setNombreCompleto('');
            setNumeroIns('');
            setClaseId('');
            setModalAditivoAbierto(false);
            await cargarDatos();
            setModalAlerta({
                isOpen: true,
                titulo: 'Operación Exitosa',
                mensaje: 'El aditivo de referencia fue registrado correctamente.',
            });
        } catch (err: unknown) {
            console.error('Error creando aditivo:', err);
            const msg = err instanceof Error ? err.message : 'No se pudo registrar el aditivo.';
            setModalAlerta({
                isOpen: true,
                titulo: 'Error',
                mensaje: msg,
            });
        } finally {
            setGuardando(false);
        }
    };

    const handleCrearClase = async (e: React.FormEvent) => {
        e.preventDefault();
        const nombreLimpio = nombreClase.trim();
        if (!nombreLimpio) return;

        try {
            setGuardando(true);
            await createClaseFuncional(nombreLimpio, necesitaIns);
            setNombreClase('');
            setModalClaseAbierto(false);
            await cargarDatos();
            setModalAlerta({
                isOpen: true,
                titulo: 'Operación Exitosa',
                mensaje: 'La clase funcional fue creada exitosamente.',
            });
        } catch (err: unknown) {
            console.error('Error creando clase funcional:', err);
            const msg = err instanceof Error ? err.message : 'No se pudo registrar la clase funcional.';
            setModalAlerta({
                isOpen: true,
                titulo: 'Error',
                mensaje: msg,
            });
        } finally {
            setGuardando(false);
        }
    };

    const aditivosFiltrados = filtrarPorTexto(aditivos, busqueda, (a) => {
        const claseObj = clases.find((c) => c.id === a.clase_funcional_id);
        return [a.nombre_completo, a.numero_ins, claseObj?.nombre];
    });

    const clasesFiltradas = filtrarPorTexto(clases, busqueda, (c) => [c.nombre]);

    const columnasAditivos: Columna<Aditivo>[] = [
        {
            key: 'nombre_completo',
            encabezado: 'Nombre del Aditivo',
            ordenable: true,
            render: (a) => <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>{a.nombre_completo}</span>,
        },
        {
            key: 'clase_funcional',
            encabezado: 'Clase Funcional',
            ordenable: true,
            valorOrdenamiento: (a) => clases.find((c) => c.id === a.clase_funcional_id)?.nombre || '',
            render: (a) => {
                const claseObj = clases.find((c) => c.id === a.clase_funcional_id);
                return <span>{claseObj?.nombre || 'General'}</span>;
            },
        },
        {
            key: 'numero_ins',
            encabezado: 'Número INS',
            ordenable: true,
            valorOrdenamiento: (a) => a.numero_ins || '',
            render: (a) => (
                a.numero_ins ? (
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent)' }}>
                        INS {a.numero_ins}
                    </span>
                ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Opcional / Sin INS</span>
                )
            ),
        },
    ];

    const columnasClases: Columna<ClaseFuncionalAditivo>[] = [
        {
            key: 'nombre',
            encabezado: 'Nombre de la Clase Funcional',
            ordenable: true,
            render: (c) => <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>{c.nombre}</span>,
        },
        {
            key: 'necesita_ins',
            encabezado: 'Requisito de Número INS',
            ordenable: true,
            valorOrdenamiento: (c) => c.necesita_ins ? 'Obligatorio' : 'Opcional',
            render: (c) => <span>{c.necesita_ins ? 'INS Obligatorio' : 'INS Opcional'}</span>,
        },
        {
            key: 'total_aditivos',
            encabezado: 'Aditivos Registrados',
            ordenable: true,
            valorOrdenamiento: (c) => aditivos.filter((a) => a.clase_funcional_id === c.id).length,
            render: (c) => {
                const total = aditivos.filter((a) => a.clase_funcional_id === c.id).length;
                return <span>{total} aditivo(s)</span>;
            },
        },
    ];

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Maestro de Aditivos de Referencia"
                descripcion="Catálogo oficial de aditivos INS y clases funcionales (conservantes, colorantes, antioxidantes, edulcorantes, etc.) utilizados en las recetas."
                ancho="1100px"
                acciones={
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={() => setModalClaseAbierto(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color, #334155)',
                                backgroundColor: 'var(--card-bg-light, #1e293b)',
                                color: 'var(--text-h, #f8fafc)',
                                fontSize: '0.88rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            <i className="bi bi-tag"></i> Nueva Clase Funcional
                        </button>
                        <Boton onClick={() => setModalAditivoAbierto(true)} variant="crear">
                            Nuevo Aditivo INS
                        </Boton>
                    </div>
                }
            />

            <div className={styles.filaBotonesSuperiores}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
                    <button
                        type="button"
                        onClick={() => setPestanaActiva(pestanaActiva === 'aditivos' ? 'clases' : 'aditivos')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: '1px solid var(--border-color, #334155)',
                            backgroundColor: pestanaActiva === 'clases' ? 'rgba(59, 130, 246, 0.18)' : 'var(--card-bg-light, #1e293b)',
                            color: pestanaActiva === 'clases' ? '#3b82f6' : 'var(--text-h, #f8fafc)',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        title="Alternar vista entre Aditivos INS y Clases Funcionales"
                    >
                        <span
                            style={{
                                width: '26px',
                                height: '14px',
                                borderRadius: '10px',
                                backgroundColor: pestanaActiva === 'clases' ? '#3b82f6' : '#475569',
                                position: 'relative',
                                display: 'inline-block',
                                transition: 'background-color 0.2s ease',
                            }}
                        >
                            <span
                                style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    backgroundColor: '#ffffff',
                                    position: 'absolute',
                                    top: '2px',
                                    left: pestanaActiva === 'clases' ? '14px' : '2px',
                                    transition: 'left 0.2s ease',
                                }}
                            />
                        </span>
                        <span>{pestanaActiva === 'clases' ? `Ver Clases Funcionales (${clases.length})` : `Ver Aditivos INS (${aditivos.length})`}</span>
                    </button>
                </div>

                <BuscadorTexto
                    valor={busqueda}
                    onCambio={setBusqueda}
                    placeholder={pestanaActiva === 'aditivos' ? 'Buscar aditivo...' : 'Buscar clase...'}
                />
            </div>

            <div style={{ width: '100%', maxWidth: '1100px' }}>
                {pestanaActiva === 'aditivos' ? (
                    <TablaPaginada
                        datos={aditivosFiltrados}
                        columnas={columnasAditivos}
                        gridTemplateColumns="2.5fr 2fr 1.5fr"
                        itemsPorPagina={15}
                        tituloExportacion="aditivos_referencia"
                        mensajeVacio={
                            loading
                                ? 'Cargando catálogo de aditivos de referencia…'
                                : busqueda
                                  ? 'No hay aditivos que coincidan con la búsqueda.'
                                  : 'Todavía no hay aditivos registrados.'
                        }
                    />
                ) : (
                    <TablaPaginada
                        datos={clasesFiltradas}
                        columnas={columnasClases}
                        gridTemplateColumns="2.5fr 2fr 1.5fr"
                        itemsPorPagina={15}
                        tituloExportacion="clases_funcionales_aditivos"
                        mensajeVacio={
                            loading
                                ? 'Cargando clases funcionales…'
                                : busqueda
                                  ? 'No hay clases funcionales que coincidan con la búsqueda.'
                                  : 'Todavía no hay clases funcionales registradas.'
                        }
                    />
                )}
            </div>

            {/* MODAL CREAR ADITIVO */}
            {modalAditivoAbierto && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className={styles.tarjeta} style={{ maxWidth: '480px', width: '100%' }}>
                        <h3 className={styles.label} style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Registrar Aditivo INS</h3>
                        <form noValidate onSubmit={handleCrearAditivo}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>Nombre Completo:</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej. Benzoato de Sodio, Ácido Ascórbico..."
                                        value={nombreCompleto}
                                        onChange={(e) => setNombreCompleto(e.target.value)}
                                        className={styles.input}
                                        style={{ width: '100%', marginTop: '0.25rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>Clase Funcional:</label>
                                    <select
                                        required
                                        value={claseId}
                                        onChange={(e) => setClaseId(e.target.value ? Number(e.target.value) : '')}
                                        className={styles.input}
                                        style={{ width: '100%', marginTop: '0.25rem' }}
                                    >
                                        <option value="">-- Seleccionar Clase Funcional --</option>
                                        {clases.map((c) => (
                                            <option key={c.id} value={c.id}>{c.nombre} {c.necesita_ins ? '(INS Obligatorio)' : '(INS Opcional)'}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>
                                        Número INS {claseSeleccionadaObj?.necesita_ins ? '(Obligatorio)' : '(Opcional para aromatizantes)'}:
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej. 211, 300, 102..."
                                        value={numeroIns}
                                        onChange={(e) => setNumeroIns(e.target.value)}
                                        className={styles.input}
                                        style={{ width: '100%', marginTop: '0.25rem' }}
                                    />
                                </div>
                            </div>

                            <div className={styles.filaBotones} style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                <Boton type="submit" variant="guardar" disabled={guardando}>
                                    {guardando ? 'Guardando...' : 'Guardar'}
                                </Boton>
                                <Boton type="button" onClick={() => setModalAditivoAbierto(false)} variant="volver">
                                    Cancelar
                                </Boton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CREAR CLASE FUNCIONAL */}
            {modalClaseAbierto && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className={styles.tarjeta} style={{ maxWidth: '450px', width: '100%' }}>
                        <h3 className={styles.label} style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Nueva Clase Funcional</h3>
                        <form noValidate onSubmit={handleCrearClase}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>Nombre de la Clase:</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej. Emulsionante, Acidulante, Estabilizante..."
                                        value={nombreClase}
                                        onChange={(e) => setNombreClase(e.target.value)}
                                        className={styles.input}
                                        style={{ width: '100%', marginTop: '0.25rem' }}
                                    />
                                </div>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={necesitaIns}
                                        onChange={(e) => setNecesitaIns(e.target.checked)}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span>Requiere Número INS obligatorio</span>
                                </label>
                            </div>

                            <div className={styles.filaBotones} style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                <Boton type="submit" variant="guardar" disabled={guardando}>
                                    {guardando ? 'Guardando...' : 'Guardar'}
                                </Boton>
                                <Boton type="button" onClick={() => setModalClaseAbierto(false)} variant="volver">
                                    Cancelar
                                </Boton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={() => setModalAlerta({ ...modalAlerta, isOpen: false })}
            />
        </div>
    );
}
