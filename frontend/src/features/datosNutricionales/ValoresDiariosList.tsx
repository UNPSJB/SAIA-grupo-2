import { useEffect, useState } from 'react';
import { getValoresDiariosReferencia, updateValorDiarioReferencia } from '../../services/datosNutricionalesServices';
import type { ValorDiarioReferencia } from '../../types/datosNutricionales';
import { ETIQUETA_NUTRIENTE } from './nutrientes';
import styles from '../../styles/shared.module.css';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';

export default function ValoresDiariosList() {
    const [valores, setValores] = useState<ValorDiarioReferencia[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalEditar, setModalEditar] = useState<ValorDiarioReferencia | null>(null);
    const [editValor, setEditValor] = useState<string>('');
    const [editUmbral, setEditUmbral] = useState<string>('');
    const [editDecimales, setEditDecimales] = useState<number>(1);

    const [guardando, setGuardando] = useState(false);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const data = await getValoresDiariosReferencia();
            setValores(data);
        } catch (err) {
            console.error("Error al cargar valores diarios de referencia:", err);
            setModalAlerta({
                isOpen: true,
                titulo: "Error",
                mensaje: "No se pudieron obtener los valores diarios de referencia."
            });
        } finally {
            setLoading(false);
        }
    };

    const abrirEdicion = (item: ValorDiarioReferencia) => {
        setModalEditar(item);
        setEditValor(item.valor_diario !== null ? String(item.valor_diario) : '');
        setEditUmbral(String(item.umbral_no_significativo ?? 0));
        setEditDecimales(item.decimales ?? 1);
    };

    const handleGuardarModal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalEditar) return;

        try {
            setGuardando(true);
            const valNum = editValor.trim() !== '' ? Number(editValor) : null;
            const umbralNum = Number(editUmbral) >= 0 ? Number(editUmbral) : 0;

            await updateValorDiarioReferencia(modalEditar.nutriente, {
                valor_diario: valNum,
                umbral_no_significativo: umbralNum,
                decimales: editDecimales
            });

            setModalEditar(null);
            await cargarDatos();
            setModalAlerta({
                isOpen: true,
                titulo: "Operación Exitosa",
                mensaje: `Se actualizaron las reglas de referencia para ${ETIQUETA_NUTRIENTE[modalEditar.nutriente] || modalEditar.nutriente}.`
            });
        } catch (err) {
            console.error("Error actualizando valor diario:", err);
            setModalAlerta({
                isOpen: true,
                titulo: "Error",
                mensaje: "Ocurrió un error al guardar las modificaciones."
            });
        } finally {
            setGuardando(false);
        }
    };

    const columnas: Columna<ValorDiarioReferencia>[] = [
        {
            key: 'nutriente',
            encabezado: 'Nutriente Obligatorio',
            ordenable: true,
            render: (v) => (
                <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                    {ETIQUETA_NUTRIENTE[v.nutriente] || v.nutriente}
                </span>
            )
        },
        {
            key: 'valor_diario',
            encabezado: 'Valor Diario (% VD)',
            ordenable: true,
            render: (v) => (
                <span>
                    {v.valor_diario !== null ? `${v.valor_diario} ${v.unidad}` : <em style={{ color: 'var(--text-muted)' }}>Sin % VD definido</em>}
                </span>
            )
        },
        {
            key: 'umbral_no_significativo',
            encabezado: 'Umbral "0 / No Significativo"',
            ordenable: true,
            render: (v) => <span>Menor a {v.umbral_no_significativo} {v.unidad}</span>
        },
        {
            key: 'decimales',
            encabezado: 'Decimales Expresados',
            render: (v) => <span>{v.decimales} {v.decimales === 1 ? 'decimal' : 'decimales'}</span>
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones',
            render: (v) => (
                <Boton onClick={() => abrirEdicion(v)} variant="editar" title="Editar reglas del nutriente" />
            )
        }
    ];

    if (loading && valores.length === 0) {
        return <div className={styles.contenedorPrincipal}>Cargando tabla de valores diarios de referencia...</div>;
    }

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Valores Diarios de Referencia y Reglas de Redondeo (CAA)"
                descripcion="Configuración a nivel sistema de los valores diarios de referencia (2000 kcal), umbrales de declaración 'No significativo' y formatos de precisión por nutriente en Maestros de Producción."
                ancho="1100px"
            />

            <div style={{ width: '100%', maxWidth: '1100px' }}>
                <TablaPaginada
                    datos={valores}
                    columnas={columnas}
                    gridTemplateColumns="2.2fr 1.8fr 1.8fr 1.5fr 1fr"
                    itemsPorPagina={15}
                    tituloExportacion="valores_diarios_referencia"
                />
            </div>

            {/* MODAL EDITAR PARAMETROS DE NUTRIENTE */}
            {modalEditar && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className={styles.tarjeta} style={{ maxWidth: '480px', width: '100%' }}>
                        <h3 className={styles.label} style={{ marginBottom: '1rem' }}>
                            Editar Reglas de {ETIQUETA_NUTRIENTE[modalEditar.nutriente] || modalEditar.nutriente}
                        </h3>

                        <form noValidate onSubmit={handleGuardarModal}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>
                                        Valor Diario de Referencia ({modalEditar.unidad}):
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="Ej. 2000 (Dejar vacío si no aplica % VD)"
                                        value={editValor}
                                        onChange={(e) => setEditValor(e.target.value)}
                                        className={styles.input}
                                        style={{ width: '100%', marginTop: '0.25rem' }}
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                        Base de cálculo para la columna % VD (dejar vacío para Grasas Trans / Azúcares totales si no tienen % VD).
                                    </small>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>
                                        Umbral "0 / No Significativo" ({modalEditar.unidad}):
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={editUmbral}
                                        onChange={(e) => setEditUmbral(e.target.value)}
                                        className={styles.input}
                                        style={{ width: '100%', marginTop: '0.25rem' }}
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                        Cantidades inferiores a este umbral se declararán como "0 {modalEditar.unidad}".
                                    </small>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>
                                        Decimales de Expresión:
                                    </label>
                                    <select
                                        value={editDecimales}
                                        onChange={(e) => setEditDecimales(Number(e.target.value))}
                                        className={styles.input}
                                        style={{ width: '100%', marginTop: '0.25rem' }}
                                    >
                                        <option value={0}>0 decimales (enteros, ej. Energía, Sodio)</option>
                                        <option value={1}>1 decimal (ej. Proteínas, Grasas)</option>
                                        <option value={2}>2 decimales</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.filaBotones} style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                <Boton type="submit" variant="guardar" disabled={guardando}>
                                    {guardando ? 'Guardando...' : 'Guardar'}
                                </Boton>
                                <Boton type="button" onClick={() => setModalEditar(null)} variant="volver">
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
