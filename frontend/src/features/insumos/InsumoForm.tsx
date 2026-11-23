import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { MagnitudUnidad, UnidadMedida } from '../../types/unidadesMedida';
import type { InsumoPayload } from '../../types/insumos';
import type { Aditivo } from '../../types/aditivos';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';
import { getInsumoById, saveInsumo } from '../../services/insumosServices';
import { getAditivos } from '../../services/aditivosServices';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import styles from '../../styles/shared.module.css';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import { esUnidadDeInsumo } from './cantidades';

interface FormValues {
    nombre: string;
    denominacion_rotulo: string;
    unidad_medida_id: number;
    es_aditivo: boolean;
    aditivo_referencia_id: number | '';
    densidad_g_ml: number | '';
    peso_por_unidad_gramos: number | '';
}

export default function InsumoForm() {
    const [unidadesDisponibles, setUnidadesDisponibles] = useState<UnidadMedida[]>([]);
    const [aditivosDisponibles, setAditivosDisponibles] = useState<Aditivo[]>([]);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });
    const [magnitudFija, setMagnitudFija] = useState<MagnitudUnidad | null>(null);

    const navigate = useNavigate();
    const { id } = useParams();
    const editando = Boolean(id);

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            nombre: '',
            denominacion_rotulo: '',
            es_aditivo: false,
            aditivo_referencia_id: '',
            densidad_g_ml: '',
            peso_por_unidad_gramos: '',
        }
    });

    const esAditivoMarcado = watch('es_aditivo');
    const unidadSeleccionadaId = watch('unidad_medida_id');

    const magnitudSeleccionada = unidadesDisponibles.find(
        (unidad) => unidad.id === Number(unidadSeleccionadaId)
    )?.magnitud;

    useEffect(() => {
        const cargarCatalogos = async () => {
            try {
                const [unidadesData, aditivosData] = await Promise.all([
                    getUnidadesMedida(),
                    getAditivos(),
                ]);
                setUnidadesDisponibles(unidadesData);
                setAditivosDisponibles(aditivosData);
            } catch (err) {
                console.error("Error al cargar catálogos:", err);
            }
        };
        cargarCatalogos();
    }, []);

    useEffect(() => {
        if (editando && id) {
            const cargarInsumo = async () => {
                try {
                    const data = await getInsumoById(id);
                    reset({
                        nombre: data.nombre,
                        denominacion_rotulo: data.denominacion_rotulo ?? '',
                        unidad_medida_id: data.unidad_medida_id,
                        es_aditivo: Boolean(data.es_aditivo),
                        aditivo_referencia_id: data.aditivo_referencia_id ?? '',
                        densidad_g_ml: data.densidad_g_ml ?? '',
                        peso_por_unidad_gramos: data.peso_por_unidad_gramos ?? '',
                    });
                    setMagnitudFija(data.cantidad > 0 ? data.unidad_medida.magnitud : null);
                } catch (err) {
                    console.error("Error al cargar insumo:", err);
                }
            };
            cargarInsumo();
        }
    }, [id, editando, reset]);

    const onSubmit = async (data: FormValues) => {
        const nombreLimpio = data.nombre.trim();
        if (!nombreLimpio) return;

        const datos: InsumoPayload = { 
            nombre: nombreLimpio,
            denominacion_rotulo: data.denominacion_rotulo.trim() || null, 
            unidad_medida_id: Number(data.unidad_medida_id),
            es_aditivo: Boolean(data.es_aditivo),
            aditivo_referencia_id: data.es_aditivo && data.aditivo_referencia_id ? Number(data.aditivo_referencia_id) : null,
            densidad_g_ml: magnitudSeleccionada === 'volumen' && data.densidad_g_ml !== '' ? Number(data.densidad_g_ml) : null,
            peso_por_unidad_gramos: magnitudSeleccionada === 'cantidad' && data.peso_por_unidad_gramos !== '' ? Number(data.peso_por_unidad_gramos) : null,
        };

        try {
            const exito = await saveInsumo(datos, id);
            if (exito) {
                navigate('/insumos');
            } else {
                setModalAlerta({
                    isOpen: true,
                    titulo: 'Error al Guardar',
                    mensaje: 'Hubo un error al guardar el registro.'
                });
            }
        } catch (error) {
            console.error('Error de red:', error);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error de Red',
                mensaje: 'No se pudo conectar con el servidor.'
            });
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina titulo={editando ? 'Editar Insumo' : 'Registrar Nuevo Insumo'} ancho="600px" />
            
            <form onSubmit={handleSubmit(onSubmit)} className={styles.formularioTarjeta} style={{ maxWidth: '600px' }}>
                <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr' }}>
                    <div className={styles.formGroup}>
                        <label>Nombre del Insumo:</label>
                        <input 
                            type="text" 
                            {...register('nombre', { 
                                required: "El nombre es obligatorio",
                                validate: (value) => value.trim().length >= 2 || "No puede contener solo espacios o estar vacío",
                                maxLength: { value: 100, message: "No puede superar los 100 caracteres" }
                            })} 
                            style={errors.nombre ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        />
                        {errors.nombre && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.nombre.message}</span>}
                    </div>

                    <div className={styles.formGroup}>
                        <label>Denominación para rótulo (opcional):</label>
                        <input
                            type="text"
                            placeholder="Ej. Harina de trigo enriquecida Ley 25.630"
                            {...register('denominacion_rotulo', {
                                maxLength: { value: 150, message: "No puede superar los 150 caracteres" }
                            })}
                            style={errors.denominacion_rotulo ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        />
                        {errors.denominacion_rotulo && (
                            <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px'}}>
                                {errors.denominacion_rotulo.message}
                            </span>
                        )}
                        <span className={styles.textMuted} style={{ fontSize: '0.8rem', marginTop: '6px', textAlign: 'left'}}>
                            Si se deja vacío, se usará el nombre del insumo en la lista de ingredientes del rótulo.
                        </span>
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Unidad de Medida:</label>
                        <select 
                            {...register('unidad_medida_id', { 
                                required: "Debe seleccionar una unidad de medida",
                                valueAsNumber: true,
                                validate: value => !isNaN(value) || "Debe seleccionar una unidad válida"
                            })} 
                            style={errors.unidad_medida_id ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        >
                            <option value="">Seleccione una unidad...</option>
                            {unidadesDisponibles
                                .filter((unidad) => esUnidadDeInsumo(unidad) && (!magnitudFija || unidad.magnitud === magnitudFija))
                                .map(unidad => (
                                <option key={unidad.id} value={unidad.id}>
                                    {unidad.nombre}
                                </option>
                            ))}
                        </select>
                        {errors.unidad_medida_id && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.unidad_medida_id.message}</span>}
                        <span className={styles.textMuted} style={{ fontSize: '0.8rem', marginTop: '6px', textAlign: 'left' }}>
                            {magnitudFija
                                ? 'Como ya tiene stock cargado, solo se puede cambiar por otra unidad de la misma magnitud.'
                                : 'Es la unidad en la que se compra. El stock se registra en gramos, o en litros si es líquido.'}
                        </span>
                    </div>

                    {magnitudSeleccionada === 'volumen' && (
                    <div className={styles.formGroup}>
                        <label>Densidad (g/ml):</label>
                        <input
                            type="number"
                            step="any"
                            min="0.0001"
                            {...register('densidad_g_ml', {
                                validate: (value) =>
                                    value === '' || Number(value) > 0 ||
                                    'La densidad debe ser mayor a cero',
                            })}
                        />
                        <span className={styles.textMuted} style={{ fontSize: '0.8rem' }}>
                            Equivalencia necesaria para convertir este insumo a gramos en las recetas.
                        </span>
                        {errors.densidad_g_ml && (
                            <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>
                                {errors.densidad_g_ml.message}
                            </span>
                        )}
                    </div>
                )}

                {magnitudSeleccionada === 'cantidad' && (
                    <div className={styles.formGroup}>
                        <label>Peso por unidad (g):</label>
                        <input
                            type="number"
                            step="any"
                            min="0.0001"
                            {...register('peso_por_unidad_gramos', {
                                validate: (value) =>
                                    value === '' || Number(value) > 0 ||
                                    'El peso por unidad debe ser mayor a cero',
                            })}
                        />
                        <span className={styles.textMuted} style={{ fontSize: '0.8rem' }}>
                            Peso promedio de una unidad, necesario para convertirla a gramos en las recetas.
                        </span>
                        {errors.peso_por_unidad_gramos && (
                            <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>
                                {errors.peso_por_unidad_gramos.message}
                            </span>
                        )}
                    </div>
                )}

                    <div className={styles.formGroup} style={{ marginTop: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                {...register('es_aditivo')}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span>Este insumo es un Aditivo de Referencia</span>
                        </label>
                    </div>

                    {esAditivoMarcado && (
                        <div className={styles.formGroup}>
                            <label>Aditivo de Referencia INS (Catálogo Oficial):</label>
                            <select
                                {...register('aditivo_referencia_id', {
                                    required: esAditivoMarcado ? "Debe seleccionar el aditivo de referencia" : false,
                                })}
                                style={errors.aditivo_referencia_id ? { borderColor: '#ef4444', outline: 'none' } : {}}
                            >
                                <option value="">Seleccione un aditivo del catálogo...</option>
                                {aditivosDisponibles.map((aditivo) => (
                                    <option key={aditivo.id} value={aditivo.id}>
                                        {aditivo.nombre_completo} {aditivo.numero_ins ? `(INS ${aditivo.numero_ins})` : '(Sin INS)'}
                                    </option>
                                ))}
                            </select>
                            {errors.aditivo_referencia_id && (
                                <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>
                                    {errors.aditivo_referencia_id.message}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                    <Boton type="submit" variant="guardar">
                        {editando ? 'Actualizar' : 'Guardar'}
                    </Boton>
                    <Link to="/insumos">
                        <Boton variant="eliminar">
                            Cancelar
                        </Boton>
                    </Link>
                </div>
            </form>

            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={() => setModalAlerta({ ...modalAlerta, isOpen: false })}
            />
        </div>
    );
}