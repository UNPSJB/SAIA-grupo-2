import { useEffect, useState } from 'react';
import { getAditivos, getClasesFuncionales, createAditivo, createClaseFuncional } from '../../services/aditivosServices';
import type { Aditivo, ClaseFuncionalAditivo } from '../../types/aditivos';
import styles from '../../styles/shared.module.css';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';

export default function AditivosList() {
    const [aditivos, setAditivos] = useState<Aditivo[]>([]);
    const [clases, setClases] = useState<ClaseFuncionalAditivo[]>([]);
    const [loading, setLoading] = useState(true);

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
                getClasesFuncionales()
            ]);
            setAditivos(listAditivos);
            setClases(listClases);
        } catch (err) {
            console.error("Error cargando aditivos:", err);
            setModalAlerta({
                isOpen: true,
                titulo: "Error",
                mensaje: "Ocurrió un error al cargar la lista de aditivos y clases funcionales."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCrearAditivo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombreCompleto.trim() || !claseId) return;

        try {
            setGuardando(true);
            await createAditivo({
                nombre_completo: nombreCompleto.trim(),
                clase_funcional_id: Number(claseId),
                numero_ins: numeroIns.trim() || null
            });
            setNombreCompleto('');
            setNumeroIns('');
            setClaseId('');
            setModalAditivoAbierto(false);
            await cargarDatos();
            setModalAlerta({
                isOpen: true,
                titulo: "Operación Exitosa",
                mensaje: "El aditivo de referencia fue registrado correctamente."
            });
        } catch (err: any) {
            console.error("Error creando aditivo:", err);
            setModalAlerta({
                isOpen: true,
                titulo: "Error",
                mensaje: err.message || "No se pudo registrar el aditivo."
            });
        } finally {
            setGuardando(false);
        }
    };

    const handleCrearClase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombreClase.trim()) return;

        try {
            setGuardando(true);
            await createClaseFuncional(nombreClase.trim(), necesitaIns);
            setNombreClase('');
            setModalClaseAbierto(false);
            await cargarDatos();
            setModalAlerta({
                isOpen: true,
                titulo: "Operación Exitosa",
                mensaje: "La clase funcional fue creada exitosamente."
            });
        } catch (err: any) {
            console.error("Error creando clase funcional:", err);
            setModalAlerta({
                isOpen: true,
                titulo: "Error",
                mensaje: err.message || "No se pudo registrar la clase funcional."
            });
        } finally {
            setGuardando(false);
        }
    };

    const columnas: Columna<Aditivo>[] = [
        {
            key: 'nombre_completo',
            encabezado: 'Nombre del Aditivo',
            ordenable: true,
            render: (a) => <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>{a.nombre_completo}</span>
        },
        {
            key: 'clase_funcional',
            encabezado: 'Clase Funcional',
            ordenable: true,
            render: (a) => {
                const claseObj = clases.find(c => c.id === a.clase_funcional_id);
                return <span>{claseObj?.nombre || 'General'}</span>;
            }
        },
        {
            key: 'numero_ins',
            encabezado: 'Número INS',
            ordenable: true,
            render: (a) => (
                a.numero_ins ? (
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent)' }}>
                        INS {a.numero_ins}
                    </span>
                ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No requiere INS</span>
                )
            )
        }
    ];

    if (loading && aditivos.length === 0) {
        return <div className={styles.contenedorPrincipal}>Cargando catálogo de aditivos de referencia...</div>;
    }

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Maestro de Aditivos de Referencia"
                descripcion="Catálogo oficial de aditivos INS y clases funcionales (conservantes, colorantes, antioxidantes, edulcorantes, etc.) utilizados en las recetas."
                ancho="1100px"
            />

            <div className={styles.filaBotonesSuperiores}>
                <Boton onClick={() => setModalClaseAbierto(true)} variant="ver">
                    <i className="bi bi-tag" style={{ marginRight: '0.4rem' }}></i> Nueva Clase Funcional
                </Boton>
                <Boton onClick={() => setModalAditivoAbierto(true)} variant="crear">
                    <i className="bi bi-plus-lg" style={{ marginRight: '0.4rem' }}></i> Nuevo Aditivo INS
                </Boton>
            </div>

            <div style={{ width: '100%', maxWidth: '1100px' }}>
                <TablaPaginada
                    datos={aditivos}
                    columnas={columnas}
                    gridTemplateColumns="2.5fr 2fr 1.5fr"
                    itemsPorPagina={15}
                    tituloExportacion="aditivos_referencia"
                />
            </div>

            {/* MODAL CREAR ADITIVO */}
            {modalAditivoAbierto && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className={styles.tarjeta} style={{ maxWidth: '480px', width: '100%' }}>
                        <h3 className={styles.label} style={{ marginBottom: '1rem' }}>Registrar Aditivo INS</h3>
                        <form noValidate onSubmit={handleCrearAditivo}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>Nombre Completo:</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej. Benzoato de Sodio"
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
                                        onChange={(e) => setClaseId(Number(e.target.value))}
                                        className={styles.input}
                                        style={{ width: '100%', marginTop: '0.25rem' }}
                                    >
                                        <option value="">-- Seleccionar Clase --</option>
                                        {clases.map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>Número INS (Opcional para aromatizantes):</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. 211"
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
                        <h3 className={styles.label} style={{ marginBottom: '1rem' }}>Nueva Clase Funcional</h3>
                        <form noValidate onSubmit={handleCrearClase}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>Nombre de la Clase:</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej. Emulsionante, Acidulante..."
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
