import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import SearchableSelect from '../../components/SearchableSelect';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import ModalAlerta from '../../components/alerta';

import { getProductos } from '../../services/productosServices';
import { getInsumos } from '../../services/insumosServices';
import { getAditivos } from '../../services/aditivosServices';
import { getEquipos } from '../../services/equiposServices';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';
import {
    crearReceta,
    crearVersionReceta,
    getRecetaById,
    getRecetas,
    getVersionVigenteReceta,
    RecetasApiError,
} from '../../services/recetasServices';
import { exportarRecetaPDF } from '../../utils/exportarRecetaPdf';

import type { Producto } from '../../types/productos';
import type { Insumo } from '../../types/insumos';
import type { Aditivo } from '../../types/aditivos';
import type { Equipo } from '../../types/equipos';
import type { UnidadMedida } from '../../types/unidadesMedida';
import type {
    DetalleRecetaPayload,
    PasoRecetaPayload,
    Receta,
    RecetaPayload,
    TipoUsoInsumo,
    VersionReceta,
    VersionRecetaPayload,
} from '../../types/receta';
import styles from '../../styles/shared.module.css';

interface RenglonForm {
    idTemp: string;
    insumo_id: number | '';
    cantidad_original: number | '';
    unidad_medida_id: number | '';
    tipo_uso: TipoUsoInsumo;
    aditivo_id: number | '';
}

interface PasoForm {
    idTemp: string;
    nombre_paso: string;
    procedimiento: string;
    equipo_id: number | '';
    tiempo_minutos: number | '';
    temperatura_celsius: number | '';
    es_punto_control: boolean;
}

export default function RecetaForm() {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'admin';
    const navigate = useNavigate();
    const { id: recetaIdParam } = useParams();
    const [searchParams] = useSearchParams();

    const productoIdQuery = searchParams.get('producto_id');
    const esNuevaVersion = Boolean(recetaIdParam);

    const [productos, setProductos] = useState<Producto[]>([]);
    const [insumos, setInsumos] = useState<Insumo[]>([]);
    const [aditivos, setAditivos] = useState<Aditivo[]>([]);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [unidades, setUnidades] = useState<UnidadMedida[]>([]);

    const [recetaExistente, setRecetaExistente] = useState<Receta | null>(null);
    const [versionVigente, setVersionVigente] = useState<VersionReceta | null>(null);

    const [productoId, setProductoId] = useState<string>(productoIdQuery || '');
    const [rendimientoFinalGramos, setRendimientoFinalGramos] = useState<number | ''>('');
    const [unidadVentaGramos, setUnidadVentaGramos] = useState<number | ''>('');
    const [rendimientoUnidades, setRendimientoUnidades] = useState<number | ''>('');
    const [medidaCasera, setMedidaCasera] = useState<string>('');
    const [motivoCambio, setMotivoCambio] = useState<string>('');

    const [detalles, setDetalles] = useState<RenglonForm[]>([]);
    const [pasos, setPasos] = useState<PasoForm[]>([]);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [modalVistaPreviaAbierta, setModalVistaPreviaAbierta] = useState(false);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '', exitoRedireccion: false, idRecetaRedireccion: '' });

    useEffect(() => {
        let cancelado = false;

        const cargarTodo = async () => {
            try {
                setCargando(true);
                const [prodsData, insData, aditsData, eqData, recetasData, unidadesData] = await Promise.all([
                    getProductos(),
                    getInsumos(),
                    getAditivos(),
                    getEquipos(),
                    getRecetas(),
                    getUnidadesMedida(),
                ]);

                if (cancelado) return;

                const insumosActivos = insData.filter((i) => i.activo);
                setInsumos(insumosActivos);
                setAditivos(aditsData);
                setEquipos(eqData);
                setUnidades(unidadesData);

                if (esNuevaVersion && recetaIdParam) {
                    const rec = await getRecetaById(recetaIdParam);
                    setRecetaExistente(rec);
                    setProductoId(String(rec.producto_id));

                    try {
                        const ver = await getVersionVigenteReceta(recetaIdParam);
                        setVersionVigente(ver);
                        setRendimientoFinalGramos(ver.rendimiento_final_gramos);
                        setUnidadVentaGramos(ver.unidad_venta_gramos);
                        setRendimientoUnidades(ver.rendimiento_unidades ?? '');
                        setMedidaCasera(ver.medida_casera || '');
                        setMotivoCambio(`Actualización a versión ${ver.version + 1}`);

                        if (ver.detalles && ver.detalles.length > 0) {
                            setDetalles(
                                ver.detalles.map((d) => ({
                                    idTemp: String(Math.random()),
                                    insumo_id: d.insumo_id,
                                    cantidad_original: d.cantidad_original,
                                    unidad_medida_id: d.unidad_medida_id,
                                    tipo_uso: d.tipo_uso,
                                    aditivo_id: d.aditivo_id ?? '',
                                })),
                            );
                        }

                        if (ver.pasos && ver.pasos.length > 0) {
                            setPasos(
                                ver.pasos.map((p) => ({
                                    idTemp: String(Math.random()),
                                    nombre_paso: p.nombre_paso,
                                    procedimiento: p.procedimiento,
                                    equipo_id: p.equipo_id ?? '',
                                    tiempo_minutos: p.tiempo_minutos ?? '',
                                    temperatura_celsius: p.temperatura_celsius ?? '',
                                    es_punto_control: Boolean(p.es_punto_control),
                                })),
                            );
                        }
                    } catch {
                        setVersionVigente(null);
                    }
                } else {
                    const productosConReceta = new Set(recetasData.map((r) => r.producto_id));
                    const disponibles = prodsData.filter((p) => !productosConReceta.has(p.id));
                    setProductos(disponibles);

                    if (productoIdQuery && !disponibles.some((p) => String(p.id) === productoIdQuery)) {
                        const prodSelect = prodsData.find((p) => String(p.id) === productoIdQuery);
                        if (prodSelect) {
                            setProductos([prodSelect, ...disponibles]);
                        }
                    }

                    setDetalles([
                        {
                            idTemp: String(Math.random()),
                            insumo_id: '',
                            cantidad_original: '',
                            unidad_medida_id: '',
                            tipo_uso: 'ingrediente',
                            aditivo_id: '',
                        },
                    ]);
                    setPasos([
                        {
                            idTemp: String(Math.random()),
                            nombre_paso: '',
                            procedimiento: '',
                            equipo_id: '',
                            tiempo_minutos: '',
                            temperatura_celsius: '',
                            es_punto_control: false,
                        },
                    ]);
                }

                setErrorCarga(null);
            } catch (err) {
                console.error('Error al cargar datos del formulario:', err);
                if (!cancelado) {
                    setErrorCarga(
                        err instanceof Error ? err.message : 'No se pudieron cargar los datos necesarios.',
                    );
                }
            } finally {
                if (!cancelado) setCargando(false);
            }
        };

        void cargarTodo();
        return () => {
            cancelado = true;
        };
    }, [esNuevaVersion, recetaIdParam, productoIdQuery]);

    if (!esAdmin) return <Navigate to="/recetas" replace />;

    const handleAgregarRenglon = () => {
        setDetalles((prev) => [
            ...prev,
            {
                idTemp: String(Math.random()),
                insumo_id: '',
                cantidad_original: '',
                unidad_medida_id: '',
                tipo_uso: 'ingrediente',
                aditivo_id: '',
            },
        ]);
    };

    const handleEliminarRenglon = (idTemp: string) => {
        setDetalles((prev) => prev.filter((d) => d.idTemp !== idTemp));
    };

    const handleCambioInsumoRenglon = (idTemp: string, newInsumoId: number) => {
        const insumoObj = insumos.find((i) => i.id === newInsumoId);
        setDetalles((prev) =>
            prev.map((d) => {
                if (d.idTemp !== idTemp) return d;
                const esAd = Boolean(insumoObj?.es_aditivo);
                return {
                    ...d,
                    insumo_id: newInsumoId,
                    tipo_uso: esAd ? 'aditivo' : 'ingrediente',
                    aditivo_id: esAd && insumoObj?.aditivo_referencia_id ? insumoObj.aditivo_referencia_id : d.aditivo_id,
                    unidad_medida_id: insumoObj?.unidad_medida_id ?? '',
                };
            }),
        );
    };

    const handleAgregarPaso = () => {
        setPasos((prev) => [
            ...prev,
            {
                idTemp: String(Math.random()),
                nombre_paso: '',
                procedimiento: '',
                equipo_id: '',
                tiempo_minutos: '',
                temperatura_celsius: '',
                es_punto_control: false,
            },
        ]);
    };

    const handleEliminarPaso = (idTemp: string) => {
        setPasos((prev) => prev.filter((p) => p.idTemp !== idTemp));
    };

    const handleMoverPaso = (index: number, direccion: 'arriba' | 'abajo') => {
        if (
            (index === 0 && direccion === 'arriba')
            || (index === pasos.length - 1 && direccion === 'abajo')
        ) {
            return;
        }
        const nuevoIndex = direccion === 'arriba' ? index - 1 : index + 1;
        const copia = [...pasos];
        const temp = copia[index];
        copia[index] = copia[nuevoIndex];
        copia[nuevoIndex] = temp;
        setPasos(copia);
    };

    const productoActual = esNuevaVersion
        ? recetaExistente?.producto
        : productos.find((p) => String(p.id) === productoId);
    const seMideEnUnidades = productoActual?.unidad_medida?.magnitud === 'cantidad';
    const pesoUnidad =
        seMideEnUnidades && Number(rendimientoFinalGramos) > 0 && Number(rendimientoUnidades) > 0
            ? Number(rendimientoFinalGramos) / Number(rendimientoUnidades)
            : null;

    const handleDescargarPDF = async () => {
        const prodObj = esNuevaVersion
            ? recetaExistente?.producto
            : productos.find((p) => String(p.id) === productoId);

        const nombreProd = prodObj?.nombre || 'Producto';
        const nroVer = esNuevaVersion && versionVigente ? versionVigente.version + 1 : 1;

        await exportarRecetaPDF({
            nombreProducto: nombreProd,
            version: nroVer,
            rendimientoFinalGramos: Number(rendimientoFinalGramos) || 1000,
            unidadVentaGramos: Number(unidadVentaGramos) || 250,
            medidaCasera,
            motivoCambio: motivoCambio || (esNuevaVersion ? 'Nueva versión' : 'Creación inicial'),
            detalles: detalles.map((d) => ({
                insumo_id: Number(d.insumo_id),
                cantidad_original: Number(d.cantidad_original) || 0,
                unidad_medida_nombre:
                    unidades.find((u) => u.id === Number(d.unidad_medida_id))?.nombre || '',
                tipo_uso: d.tipo_uso,
                aditivo_id: d.aditivo_id ? Number(d.aditivo_id) : null,
            })),
            pasos: pasos.map((p, idx) => ({
                orden: idx + 1,
                nombre_paso: p.nombre_paso,
                procedimiento: p.procedimiento,
                equipo_id: p.equipo_id ? Number(p.equipo_id) : null,
                tiempo_minutos: p.tiempo_minutos ? Number(p.tiempo_minutos) : null,
                temperatura_celsius: p.temperatura_celsius ? Number(p.temperatura_celsius) : null,
                es_punto_control: p.es_punto_control,
            })),
            insumos,
            aditivos,
            equipos,
        });
    };

    const handleSubmit = async (evento: FormEvent<HTMLFormElement>) => {
        evento.preventDefault();

        if (!esNuevaVersion && !productoId) {
            setModalAlerta({ isOpen: true, titulo: 'Campo Requerido', mensaje: 'Debes seleccionar el producto.', exitoRedireccion: false, idRecetaRedireccion: '' });
            return;
        }

        if (!rendimientoFinalGramos || Number(rendimientoFinalGramos) <= 0) {
            setModalAlerta({ isOpen: true, titulo: 'Dato Inválido', mensaje: 'El rendimiento final debe ser un valor en gramos mayor a 0.', exitoRedireccion: false, idRecetaRedireccion: '' });
            return;
        }

        if (!unidadVentaGramos || Number(unidadVentaGramos) <= 0) {
            setModalAlerta({ isOpen: true, titulo: 'Dato Inválido', mensaje: 'La unidad de venta (porción) debe ser un valor en gramos mayor a 0.', exitoRedireccion: false, idRecetaRedireccion: '' });
            return;
        }

        if (seMideEnUnidades && (!rendimientoUnidades || Number(rendimientoUnidades) <= 0)) {
            setModalAlerta({ isOpen: true, titulo: 'Dato Inválido', mensaje: 'Indicá cuántas unidades del producto rinde la receta (mayor a 0).', exitoRedireccion: false, idRecetaRedireccion: '' });
            return;
        }

        if (detalles.length === 0) {
            setModalAlerta({ isOpen: true, titulo: 'Receta Vacía', mensaje: 'La receta debe tener al menos un insumo en la lista.', exitoRedireccion: false, idRecetaRedireccion: '' });
            return;
        }

        const tieneIngrediente = detalles.some((d) => d.insumo_id && d.tipo_uso === 'ingrediente');
        if (!tieneIngrediente) {
            setModalAlerta({ isOpen: true, titulo: 'Ingrediente Requerido', mensaje: 'La receta debe contener al menos un ingrediente principal.', exitoRedireccion: false, idRecetaRedireccion: '' });
            return;
        }

        const insumosSeleccionados = detalles.map((d) => d.insumo_id).filter(Boolean);
        if (new Set(insumosSeleccionados).size !== insumosSeleccionados.length) {
            setModalAlerta({ isOpen: true, titulo: 'Insumo Duplicado', mensaje: 'No se permiten insumos repetidos en los renglones de la receta.', exitoRedireccion: false, idRecetaRedireccion: '' });
            return;
        }

        for (const d of detalles) {
            if (!d.insumo_id) {
                setModalAlerta({ isOpen: true, titulo: 'Renglón Incompleto', mensaje: 'Todos los renglones deben tener un insumo seleccionado.', exitoRedireccion: false, idRecetaRedireccion: '' });
                return;
            }
            if (!d.cantidad_original || Number(d.cantidad_original) <= 0) {
                setModalAlerta({ isOpen: true, titulo: 'Cantidad Inválida', mensaje: 'La cantidad de cada insumo debe ser mayor a 0.', exitoRedireccion: false, idRecetaRedireccion: '' });
                return;
            }

            if (!d.unidad_medida_id) {
                setModalAlerta({ isOpen: true, titulo: 'Unidad Inválida', mensaje: 'Debés seleccionar una unidad de medida para cada insumo.', exitoRedireccion: false, idRecetaRedireccion: '' });
                return;
            }
            if (d.tipo_uso === 'aditivo' && !d.aditivo_id) {
                setModalAlerta({ isOpen: true, titulo: 'Aditivo Requerido', mensaje: 'Debes seleccionar el Aditivo de Referencia INS para los renglones de tipo Aditivo.', exitoRedireccion: false, idRecetaRedireccion: '' });
                return;
            }
        }

        for (const p of pasos) {
            if (!p.nombre_paso.trim() || !p.procedimiento.trim()) {
                setModalAlerta({ isOpen: true, titulo: 'Paso Incompleto', mensaje: 'Todos los pasos deben contar con un nombre y procedimiento.', exitoRedireccion: false, idRecetaRedireccion: '' });
                return;
            }
        }

        if (!usuario?.id) {
            setModalAlerta({
                isOpen: true,
                titulo: 'No se pudo registrar',
                mensaje: 'No se pudo identificar al usuario que registra la receta. Volvé a iniciar sesión.',
                exitoRedireccion: false,
                idRecetaRedireccion: '',
            });
            return;
        }

        try {
            setGuardando(true);
            const rol = usuario.rol;

            const payloadDetalles: DetalleRecetaPayload[] = detalles.map((d) => ({
                insumo_id: Number(d.insumo_id),
                cantidad_original: Number(d.cantidad_original),
                unidad_medida_id: Number(d.unidad_medida_id),
                tipo_uso: d.tipo_uso,
                aditivo_id: d.tipo_uso === 'aditivo' && d.aditivo_id ? Number(d.aditivo_id) : null,
            }));

            const payloadPasos: PasoRecetaPayload[] = pasos.map((p, idx) => ({
                orden: idx + 1,
                nombre_paso: p.nombre_paso.trim(),
                procedimiento: p.procedimiento.trim(),
                equipo_id: p.equipo_id ? Number(p.equipo_id) : null,
                tiempo_minutos: p.tiempo_minutos ? Number(p.tiempo_minutos) : null,
                temperatura_celsius: p.temperatura_celsius ? Number(p.temperatura_celsius) : null,
                es_punto_control: p.es_punto_control,
            }));

            const payloadVersion: VersionRecetaPayload = {
                rendimiento_final_gramos: Number(rendimientoFinalGramos),
                rendimiento_unidades: seMideEnUnidades ? Number(rendimientoUnidades) : null,
                unidad_venta_gramos: Number(unidadVentaGramos),
                medida_casera: medidaCasera.trim() || null,
                motivo_cambio: motivoCambio.trim() || (esNuevaVersion ? 'Actualización de receta' : 'Creación inicial de la receta'),
                creado_por_id: usuario.id,
                detalles: payloadDetalles,
                pasos: payloadPasos,
            };

            let nroNuevaVersion = 1;
            let targetRecetaId = recetaIdParam || '';

            if (esNuevaVersion && recetaIdParam) {
                const resVer = await crearVersionReceta(recetaIdParam, payloadVersion, rol);
                nroNuevaVersion = resVer.version;
            } else {
                const payloadReceta: RecetaPayload = {
                    producto_id: Number(productoId),
                    version_inicial: payloadVersion,
                };
                const resReceta = await crearReceta(payloadReceta, rol);
                targetRecetaId = String(resReceta.id);
                nroNuevaVersion = 1;
            }

            setModalAlerta({
                isOpen: true,
                titulo: 'Operación Exitosa',
                mensaje: `Se creó la versión ${nroNuevaVersion} correctamente.`,
                exitoRedireccion: true,
                idRecetaRedireccion: targetRecetaId,
            });
        } catch (err: unknown) {
            console.error('Error al guardar la receta:', err);
            const msg = err instanceof RecetasApiError ? err.message : (err instanceof Error ? err.message : 'No se pudo guardar la receta.');
            setModalAlerta({ isOpen: true, titulo: 'Error al Guardar', mensaje: msg, exitoRedireccion: false, idRecetaRedireccion: '' });
        } finally {
            setGuardando(false);
        }
    };

    const productoNombreVisual = esNuevaVersion
        ? recetaExistente?.producto.nombre || 'Producto'
        : productos.find((p) => String(p.id) === productoId)?.nombre || 'Seleccionar Producto';

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo={esNuevaVersion ? `Nueva Versión de Receta: ${recetaExistente?.producto.nombre || ''}` : 'Crear Receta'}
                descripcion={esNuevaVersion ? `Generar versión ${versionVigente ? versionVigente.version + 1 : '2'} con nuevas modificaciones.` : 'Definir receta inicial para un producto.'}
                ancho="950px"
                acciones={
                    <Boton type="button" variant="ver" onClick={() => setModalVistaPreviaAbierta(true)}>
                        Vista previa y PDF
                    </Boton>
                }
            />

            {errorCarga && (
                <p className={styles.textDanger} role="alert">
                    {errorCarga}
                </p>
            )}

            {cargando ? (
                <p className={styles.textMuted}>Cargando datos del formulario…</p>
            ) : (
                <form onSubmit={handleSubmit} className={styles.formularioTarjeta} style={{ maxWidth: '950px', width: '100%' }} noValidate>
                    <div className={styles.tarjeta} style={{ marginBottom: '24px' }}>
                        <h3 className={styles.label} style={{ marginTop: 0, marginBottom: '16px', color: 'var(--accent)' }}>
                            1. Producto y Rendimiento
                        </h3>

                        <div className={styles.formGrid}>
                            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                <label className={styles.modalTituloCampo}>Producto:</label>
                                {esNuevaVersion ? (
                                    <input
                                        type="text"
                                        disabled
                                        value={recetaExistente?.producto.nombre || ''}
                                        className={styles.input}
                                        style={{ backgroundColor: 'var(--card-bg-light)', color: 'var(--text-h)' }}
                                    />
                                ) : (
                                    <SearchableSelect
                                        options={productos}
                                        getOptionValue={(p) => p.id}
                                        getOptionLabel={(p) => `${p.nombre} (${p.tipo})`}
                                        value={productoId}
                                        onChange={(val) => setProductoId(val ? String(val) : '')}
                                        placeholder="Seleccionar producto..."
                                    />
                                )}
                            </div>

                            <div className={styles.formGroup} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                <label className={styles.modalTituloCampo} style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'flex-end', marginBottom: '6px' }}>
                                    Rendimiento final obtenible (en gramos):
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="any"
                                    required
                                    placeholder="Ej. 1000"
                                    value={rendimientoFinalGramos}
                                    onChange={(e) => setRendimientoFinalGramos(e.target.value ? Number(e.target.value) : '')}
                                    className={styles.input}
                                />
                            </div>

                            {seMideEnUnidades && (
                                <div className={styles.formGroup} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                    <label
                                        htmlFor="receta-rendimiento-unidades"
                                        className={styles.modalTituloCampo}
                                        style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'flex-end', marginBottom: '6px' }}
                                    >
                                        Unidades que rinde la receta:
                                    </label>
                                    <input
                                        id="receta-rendimiento-unidades"
                                        type="number"
                                        min="0.01"
                                        step="any"
                                        required
                                        placeholder="Ej. 1 pan o 10 medialunas"
                                        value={rendimientoUnidades}
                                        onChange={(e) => setRendimientoUnidades(e.target.value ? Number(e.target.value) : '')}
                                        className={styles.input}
                                    />
                                    <small style={{ color: 'var(--text)', marginTop: '4px' }}>
                                        {pesoUnidad !== null
                                            ? `Cada unidad pesa ≈ ${pesoUnidad.toLocaleString('es-AR', { maximumFractionDigits: 1 })} g. Se usa para escalar y registrar lotes por unidades.`
                                            : 'Piezas enteras del producto (no porciones). Se usa para escalar y registrar lotes por unidades.'}
                                    </small>
                                </div>
                            )}

                            <div className={styles.formGroup} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                <label className={styles.modalTituloCampo} style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'flex-end', marginBottom: '6px' }}>
                                    Unidad de Venta / Porción (en gramos):
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="any"
                                    required
                                    placeholder="Ej. 250"
                                    value={unidadVentaGramos}
                                    onChange={(e) => setUnidadVentaGramos(e.target.value ? Number(e.target.value) : '')}
                                    className={styles.input}
                                />
                            </div>

                            <div className={styles.formGroup} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                <label className={styles.modalTituloCampo} style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'flex-end', marginBottom: '6px' }}>
                                    Medida Casera Sugerida:
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej. 1 porción (250g)"
                                    value={medidaCasera}
                                    onChange={(e) => setMedidaCasera(e.target.value)}
                                    className={styles.input}
                                />
                            </div>

                            <div className={styles.formGroup} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gridColumn: '1 / -1' }}>
                                <label className={styles.modalTituloCampo} style={{ marginBottom: '6px' }}>
                                    Motivo del Cambio / Notas de la Versión:
                                </label>
                                <input
                                    type="text"
                                    placeholder={esNuevaVersion ? 'Ej. Ajuste de insumos para mejorar la textura' : 'Ej. Creación inicial de la fórmula'}
                                    value={motivoCambio}
                                    onChange={(e) => setMotivoCambio(e.target.value)}
                                    className={styles.input}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.tarjeta} style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 className={styles.label} style={{ margin: 0, color: 'var(--accent)' }}>
                                2. Ingredientes y Aditivos (Renglones de Fórmula)
                            </h3>
                            <Boton type="button" variant="crear" onClick={handleAgregarRenglon} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                                Agregar Renglón
                            </Boton>
                        </div>

                        {detalles.map((d, index) => {
                            const insumoSeleccionado = insumos.find((i) => i.id === Number(d.insumo_id));
                            const esAditivoRenglon = d.tipo_uso === 'aditivo';
                            const unidadesCompatibles = unidades.filter(
                                (u) => u.magnitud === insumoSeleccionado?.unidad_medida.magnitud,
                            );
                            return (
                                <div
                                    key={d.idTemp}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: esAditivoRenglon
                                            ? '2fr 1fr 2fr 1fr 1fr auto'
                                            : '2.5fr 1fr 1.5fr 1fr auto',
                                        gap: '12px',
                                        alignItems: 'center',
                                        padding: '12px',
                                        backgroundColor: 'var(--card-bg-light)',
                                        borderRadius: '8px',
                                        marginBottom: '10px',
                                    }}
                                >
                                    <div>
                                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Insumo #{index + 1}:</label>
                                        <SearchableSelect
                                            options={insumos}
                                            getOptionValue={(i) => i.id}
                                            getOptionLabel={(i) => `${i.nombre}${i.es_aditivo ? ' (Aditivo)' : ''}`}
                                            value={d.insumo_id}
                                            onChange={(val) => handleCambioInsumoRenglon(d.idTemp, val ? Number(val) : 0)}
                                            placeholder="Seleccionar insumo..."
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tipo de Uso:</label>
                                        <select
                                            value={d.tipo_uso}
                                            onChange={(e) => {
                                                const tu = e.target.value as TipoUsoInsumo;
                                                setDetalles((prev) =>
                                                    prev.map((item) =>
                                                        item.idTemp === d.idTemp
                                                            ? { ...item, tipo_uso: tu, aditivo_id: tu === 'aditivo' ? (insumoSeleccionado?.aditivo_referencia_id || item.aditivo_id) : '' }
                                                            : item,
                                                    ),
                                                );
                                            }}
                                            className={styles.input}
                                            style={{ marginTop: '2px' }}
                                        >
                                            <option value="ingrediente">Ingrediente</option>
                                            <option value="aditivo">Aditivo</option>
                                        </select>
                                    </div>

                                    {esAditivoRenglon && (
                                        <div>
                                            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Aditivo INS Referencia:</label>
                                            <SearchableSelect
                                                options={aditivos}
                                                getOptionValue={(ad) => ad.id}
                                                getOptionLabel={(ad) => `${ad.nombre_completo} ${ad.numero_ins ? `(INS ${ad.numero_ins})` : ''}`}
                                                value={d.aditivo_id}
                                                onChange={(val) =>
                                                    setDetalles((prev) =>
                                                        prev.map((item) =>
                                                            item.idTemp === d.idTemp ? { ...item, aditivo_id: val ? Number(val) : '' } : item,
                                                        ),
                                                    )
                                                }
                                                placeholder="Aditivo INS..."
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            Cantidad:
                                        </label>
                                        <input
                                            type="number"
                                            min="0.001"
                                            step="any"
                                            placeholder="Cantidad"
                                            value={d.cantidad_original}
                                            onChange={(e) =>
                                                setDetalles((prev) =>
                                                    prev.map((item) =>
                                                        item.idTemp === d.idTemp
                                                            ? {
                                                                ...item,
                                                                cantidad_original: e.target.value ? Number(e.target.value) : '',
                                                            }
                                                            : item,
                                                    ),
                                                )
                                            }
                                            className={styles.input}
                                            style={{ marginTop: '2px' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            Unidad:
                                        </label>
                                        <SearchableSelect
                                            options={unidadesCompatibles}
                                            getOptionValue={(u) => u.id}
                                            getOptionLabel={(u) => u.nombre}
                                            value={d.unidad_medida_id}
                                            onChange={(val) =>
                                                setDetalles((prev) =>
                                                    prev.map((item) =>
                                                        item.idTemp === d.idTemp
                                                            ? {
                                                                ...item,
                                                                unidad_medida_id: val ? Number(val) : '',
                                                            }
                                                            : item,
                                                    ),
                                                )
                                            }
                                            disabled={!insumoSeleccionado}
                                            placeholder="Unidad..."
                                        />
                                    </div>

                                    <div style={{ marginTop: '16px' }}>
                                        <Boton
                                            type="button"
                                            variant="eliminar"
                                            onClick={() => handleEliminarRenglon(d.idTemp)}
                                            style={{ padding: '6px 10px' }}
                                            title="Quitar renglón"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className={styles.tarjeta} style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 className={styles.label} style={{ margin: 0, color: 'var(--accent)' }}>
                                3. Pasos de Elaboración
                            </h3>
                            <Boton type="button" variant="crear" onClick={handleAgregarPaso} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                                Agregar Paso
                            </Boton>
                        </div>

                        {pasos.map((p, index) => (
                            <div
                                key={p.idTemp}
                                style={{
                                    backgroundColor: 'var(--card-bg-light)',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    marginBottom: '12px',
                                    border: '1px solid var(--border-color, #334155)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '0.98rem' }}>
                                        Paso {index + 1}
                                    </span>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <button
                                            type="button"
                                            disabled={index === 0}
                                            onClick={() => handleMoverPaso(index, 'arriba')}
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border-color, #334155)',
                                                backgroundColor: 'var(--card-bg, #1e293b)',
                                                color: 'var(--text-h, #f8fafc)',
                                                cursor: index === 0 ? 'not-allowed' : 'pointer',
                                                opacity: index === 0 ? 0.35 : 1,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                            title="Mover arriba"
                                        >
                                            <i className="bi bi-arrow-up"></i>
                                        </button>

                                        <button
                                            type="button"
                                            disabled={index === pasos.length - 1}
                                            onClick={() => handleMoverPaso(index, 'abajo')}
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border-color, #334155)',
                                                backgroundColor: 'var(--card-bg, #1e293b)',
                                                color: 'var(--text-h, #f8fafc)',
                                                cursor: index === pasos.length - 1 ? 'not-allowed' : 'pointer',
                                                opacity: index === pasos.length - 1 ? 0.35 : 1,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                            title="Mover abajo"
                                        >
                                            <i className="bi bi-arrow-down"></i>
                                        </button>

                                        <Boton
                                            type="button"
                                            variant="eliminar"
                                            onClick={() => handleEliminarPaso(p.idTemp)}
                                            style={{ padding: '6px 10px' }}
                                            title="Eliminar paso"
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                        <label className={styles.modalTituloCampo} style={{ marginBottom: '6px' }}>Nombre del Paso:</label>
                                        <input
                                            type="text"
                                            placeholder="Ej. Mezclado inicial, Pasteurización, Amasado..."
                                            value={p.nombre_paso}
                                            onChange={(e) =>
                                                setPasos((prev) =>
                                                    prev.map((item) =>
                                                        item.idTemp === p.idTemp ? { ...item, nombre_paso: e.target.value } : item,
                                                    ),
                                                )
                                            }
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                        <label className={styles.modalTituloCampo} style={{ marginBottom: '6px' }}>Procedimiento Detallado:</label>
                                        <textarea
                                            placeholder="Ej. Incorporar los ingredientes a temperatura ambiente y homogenizar..."
                                            value={p.procedimiento}
                                            onChange={(e) =>
                                                setPasos((prev) =>
                                                    prev.map((item) =>
                                                        item.idTemp === p.idTemp ? { ...item, procedimiento: e.target.value } : item,
                                                    ),
                                                )
                                            }
                                            className={styles.input}
                                            style={{
                                                fontFamily: 'inherit',
                                                fontSize: '0.9rem',
                                                height: '130px',
                                                minHeight: '130px',
                                                maxHeight: '130px',
                                                resize: 'none',
                                                overflowY: 'auto',
                                                backgroundColor: 'var(--card-bg, #1e293b)',
                                                color: 'var(--text-h, #f8fafc)',
                                                border: '1px solid var(--border-color, #334155)',
                                                borderRadius: '6px',
                                                padding: '10px 12px',
                                                width: '100%',
                                                boxSizing: 'border-box',
                                                outline: 'none',
                                            }}
                                        />
                                    </div>

                                    <div className={styles.formGroup} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                        <label className={styles.modalTituloCampo} style={{ minHeight: '2rem', display: 'flex', alignItems: 'flex-end', marginBottom: '6px' }}>
                                            Equipo Asociado (Opcional):
                                        </label>
                                        <SearchableSelect
                                            options={equipos}
                                            getOptionValue={(eq) => eq.id}
                                            getOptionLabel={(eq) => eq.nombre}
                                            value={p.equipo_id}
                                            onChange={(val) =>
                                                setPasos((prev) =>
                                                    prev.map((item) =>
                                                        item.idTemp === p.idTemp ? { ...item, equipo_id: val ? Number(val) : '' } : item,
                                                    ),
                                                )
                                            }
                                            placeholder="Sin equipo..."
                                            clearable
                                        />
                                    </div>

                                    <div className={styles.formGroup} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                        <label className={styles.modalTituloCampo} style={{ minHeight: '2rem', display: 'flex', alignItems: 'flex-end', marginBottom: '6px' }}>
                                            Tiempo (minutos):
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="Ej. 15"
                                            value={p.tiempo_minutos}
                                            onChange={(e) =>
                                                setPasos((prev) =>
                                                    prev.map((item) =>
                                                        item.idTemp === p.idTemp ? { ...item, tiempo_minutos: e.target.value ? Number(e.target.value) : '' } : item,
                                                    ),
                                                )
                                            }
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.formGroup} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                        <label className={styles.modalTituloCampo} style={{ minHeight: '2rem', display: 'flex', alignItems: 'flex-end', marginBottom: '6px' }}>
                                            Temperatura (°C):
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="Ej. 72"
                                            value={p.temperatura_celsius}
                                            onChange={(e) =>
                                                setPasos((prev) =>
                                                    prev.map((item) =>
                                                        item.idTemp === p.idTemp ? { ...item, temperatura_celsius: e.target.value ? Number(e.target.value) : '' } : item,
                                                    ),
                                                )
                                            }
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', marginTop: '20px', gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                            <input
                                                type="checkbox"
                                                checked={p.es_punto_control}
                                                onChange={(e) =>
                                                    setPasos((prev) =>
                                                        prev.map((item) =>
                                                            item.idTemp === p.idTemp ? { ...item, es_punto_control: e.target.checked } : item,
                                                        ),
                                                    )
                                                }
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                            <span>Es Punto Crítico de Control (PCC)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.filaBotones} style={{ marginTop: '24px' }}>
                        <Boton type="submit" variant="guardar" disabled={guardando}>
                            {guardando ? 'Guardando...' : (esNuevaVersion ? 'Crear Nueva Versión' : 'Guardar Receta')}
                        </Boton>
                        <Boton type="button" variant="ver" onClick={() => setModalVistaPreviaAbierta(true)}>
                            Vista previa
                        </Boton>
                        <Link to="/recetas">
                            <Boton variant="volver">Cancelar</Boton>
                        </Link>
                    </div>
                </form>
            )}

            {modalVistaPreviaAbierta && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className={styles.tarjeta} style={{ maxWidth: '850px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            <h3 style={{ margin: 0, color: 'var(--accent)' }}>
                                Vista Previa de Receta: {productoNombreVisual}
                            </h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Boton type="button" variant="descargar" onClick={handleDescargarPDF}>
                                    Descargar PDF
                                </Boton>
                                <Boton type="button" variant="volver" onClick={() => setModalVistaPreviaAbierta(false)}>
                                    Cerrar
                                </Boton>
                            </div>
                        </div>

                        <div style={{ backgroundColor: 'var(--card-bg-light)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                            <p><strong>Producto:</strong> {productoNombreVisual}</p>
                            <p><strong>Versión a generar:</strong> v{esNuevaVersion && versionVigente ? versionVigente.version + 1 : 1}</p>
                            <p><strong>Rendimiento Final:</strong> {rendimientoFinalGramos || 0} g</p>
                            {seMideEnUnidades && (
                                <p><strong>Unidades que rinde:</strong> {rendimientoUnidades || '—'}</p>
                            )}
                            <p><strong>Porción (Unidad Venta):</strong> {unidadVentaGramos || 0} g</p>
                            <p><strong>Medida Casera Sugerida:</strong> {medidaCasera || '—'}</p>
                            <p><strong>Motivo del Cambio:</strong> {motivoCambio || '—'}</p>
                        </div>

                        <h4 style={{ marginTop: '16px', marginBottom: '8px' }}>Ingredientes y Aditivos</h4>
                        <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
                            {detalles.map((d, i) => {
                                const insObj = insumos.find((ins) => ins.id === Number(d.insumo_id));
                                const aditObj = d.aditivo_id ? aditivos.find((a) => a.id === Number(d.aditivo_id)) : null;
                                return (
                                    <li key={d.idTemp} style={{ marginBottom: '6px' }}>
                                        <strong>{insObj?.nombre || `Insumo #${d.insumo_id || (i + 1)}`}</strong> — {d.cantidad_original || 0} {unidades.find((u) => u.id === Number(d.unidad_medida_id))?.nombre || ''} · {d.tipo_uso === 'aditivo' ? 'Aditivo' : 'Ingrediente'}
                                        {aditObj ? ` · INS: ${aditObj.nombre_completo}${aditObj.numero_ins ? ` (INS ${aditObj.numero_ins})` : ''}` : ''}
                                    </li>
                                );
                            })}
                        </ul>

                        <h4 style={{ marginTop: '16px', marginBottom: '8px' }}>Pasos de Elaboración</h4>
                        <ol style={{ paddingLeft: '20px' }}>
                            {pasos.map((p, i) => {
                                const eqObj = p.equipo_id ? equipos.find((e) => e.id === Number(p.equipo_id)) : null;
                                return (
                                    <li key={p.idTemp} style={{ marginBottom: '12px' }}>
                                        <strong>{p.nombre_paso || `Paso ${i + 1}`}</strong> {p.es_punto_control && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>[PCC]</span>}
                                        <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>{p.procedimiento}</p>
                                        <span className={styles.textMuted} style={{ fontSize: '0.82rem' }}>
                                            {eqObj ? `Equipo: ${eqObj.nombre}` : 'Sin equipo'} {p.tiempo_minutos ? `· ${p.tiempo_minutos} min` : ''} {p.temperatura_celsius ? `· ${p.temperatura_celsius} °C` : ''}
                                        </span>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                </div>
            )}

            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={() => {
                    setModalAlerta({ ...modalAlerta, isOpen: false });
                    if (modalAlerta.exitoRedireccion && modalAlerta.idRecetaRedireccion) {
                        navigate(`/recetas/${modalAlerta.idRecetaRedireccion}`);
                    }
                }}
            />
        </div>
    );
}
