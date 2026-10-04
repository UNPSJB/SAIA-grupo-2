import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

import type {
    DocumentacionPayload,
    DocumentacionUpdatePayload,
    TipoDocumentacion,
} from '../../types/documentacion';
import {
    createDocumentacion,
    getDocumentacionById,
    updateDocumentacion,
} from '../../services/documentacionServices';
import { getEmpleadoById } from '../../services/empleadosServices';
import { ETIQUETA_TIPO, TIPOS_DOCUMENTACION } from './estadoVencimiento';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

interface Errores {
    tipo?: string;
    fecha_vencimiento?: string;
    numero_carnet?: string;
    autoridad_emisora?: string;
    titulo?: string;
    nombre_medico?: string;
    matricula?: string;
}

export default function DocumentacionForm() {
    const { empleadoId, id } = useParams();
    const navigate = useNavigate();
    const editando = Boolean(id);

    const [nombreEmpleado, setNombreEmpleado] = useState('');
    const [tipo, setTipo] = useState<string>('');
    const [fechaVencimiento, setFechaVencimiento] = useState('');
    const [numeroCarnet, setNumeroCarnet] = useState('');
    const [autoridadEmisora, setAutoridadEmisora] = useState('');
    const [titulo, setTitulo] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [nombreMedico, setNombreMedico] = useState('');
    const [matricula, setMatricula] = useState('');

    const [errores, setErrores] = useState<Errores>({});
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    const yaCargado = useRef(false);

    useEffect(() => {
        if (yaCargado.current) return;
        yaCargado.current = true;

        const cargarDatos = async () => {
            try {
                if (empleadoId) {
                    const empleado = await getEmpleadoById(empleadoId);
                    setNombreEmpleado(`${empleado.legajo} — ${empleado.nombre} ${empleado.apellido}`);
                }

                if (id) {
                    const documento = await getDocumentacionById(id);
                    setTipo(documento.tipo);
                    setFechaVencimiento(documento.fecha_vencimiento);
                    setNumeroCarnet(documento.numero_carnet ?? '');
                    setAutoridadEmisora(documento.autoridad_emisora ?? '');
                    setTitulo(documento.titulo ?? '');
                    setObservaciones(documento.observaciones ?? '');
                    setNombreMedico(documento.nombre_medico ?? '');
                    setMatricula(documento.matricula ?? '');
                }
            } catch (error) {
                console.error('Error al cargar los datos del formulario:', error);
                setErrorCarga('No se pudieron cargar los datos.');
            }
        };

        cargarDatos();
    }, [empleadoId, id]);

    const validar = (): Errores => {
        const nuevos: Errores = {};

        if (!tipo) nuevos.tipo = 'Debe seleccionar un tipo de documento';

        if (!fechaVencimiento) {
            nuevos.fecha_vencimiento = 'La fecha de vencimiento es obligatoria';
        } else if (Number.isNaN(Date.parse(fechaVencimiento))) {
            nuevos.fecha_vencimiento = 'La fecha ingresada no es válida';
        }

        if (tipo === 'libreta_sanitaria') {
            if (numeroCarnet.trim().length < 2) {
                nuevos.numero_carnet = 'El número de carnet es obligatorio';
            }
            if (autoridadEmisora.trim().length < 2) {
                nuevos.autoridad_emisora = 'La autoridad emisora es obligatoria';
            }
        }

        if (tipo === 'capacitacion' && titulo.trim().length < 2) {
            nuevos.titulo = 'El título de la capacitación es obligatorio';
        }

        if (tipo === 'certificado_aptitud_fisica') {
            if (nombreMedico.trim().length < 2) {
                nuevos.nombre_medico = 'El nombre del médico es obligatorio';
            }
            if (matricula.trim().length < 2) {
                nuevos.matricula = 'La matrícula es obligatoria';
            }
        }

        return nuevos;
    };

    const camposDelTipo = () => {
        if (tipo === 'libreta_sanitaria') {
            return {
                numero_carnet: numeroCarnet.trim(),
                autoridad_emisora: autoridadEmisora.trim(),
            };
        }
        if (tipo === 'capacitacion') {
            return {
                titulo: titulo.trim(),
                observaciones: observaciones.trim() || null,
            };
        }
        return {
            nombre_medico: nombreMedico.trim(),
            matricula: matricula.trim(),
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const nuevosErrores = validar();
        setErrores(nuevosErrores);
        if (Object.keys(nuevosErrores).length > 0) return;

        try {
            setGuardando(true);
            let exito: boolean;

            if (editando && id) {
                const datos: DocumentacionUpdatePayload = {
                    fecha_vencimiento: fechaVencimiento,
                    ...camposDelTipo(),
                };
                exito = await updateDocumentacion(id, datos);
            } else {
                const datos: DocumentacionPayload = {
                    tipo: tipo as TipoDocumentacion,
                    empleado_id: Number(empleadoId),
                    fecha_vencimiento: fechaVencimiento,
                    ...camposDelTipo(),
                };
                exito = await createDocumentacion(datos);
            }

            if (exito) {
                navigate(`/empleados/${empleadoId}/documentacion`);
            } else {
                alert('Hubo un error al guardar el documento. Revisá que el número de carnet no esté repetido.');
            }
        } catch (error) {
            console.error('Error de red:', error);
            alert('Hubo un error al guardar el documento.');
        } finally {
            setGuardando(false);
        }
    };

    const estiloError = { borderColor: '#ef4444', outline: 'none' };
    const estiloMensaje = { color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>{editando ? 'Renovar o Editar Documento' : 'Cargar Documento'}</h2>

            {nombreEmpleado && (
                <p style={{ marginTop: '-10px', marginBottom: '20px' }}>{nombreEmpleado}</p>
            )}

            {errorCarga && <p style={{ color: '#ef4444' }}>{errorCarga}</p>}

            <form onSubmit={handleSubmit} className={styles.formularioTarjeta} style={{ maxWidth: '700px' }}>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Tipo de documento:</label>
                        <select
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                            disabled={editando}
                            style={errores.tipo ? estiloError : {}}
                        >
                            <option value="">Seleccione un tipo</option>
                            {TIPOS_DOCUMENTACION.map((t) => (
                                <option key={t} value={t}>
                                    {ETIQUETA_TIPO[t]}
                                </option>
                            ))}
                        </select>
                        {errores.tipo && <span style={estiloMensaje}>{errores.tipo}</span>}
                    </div>

                    <div className={styles.formGroup}>
                        <label>Fecha de vencimiento:</label>
                        <input
                            type="date"
                            value={fechaVencimiento}
                            onChange={(e) => setFechaVencimiento(e.target.value)}
                            style={errores.fecha_vencimiento ? estiloError : {}}
                        />
                        {errores.fecha_vencimiento && (
                            <span style={estiloMensaje}>{errores.fecha_vencimiento}</span>
                        )}
                    </div>

                    {tipo === 'libreta_sanitaria' && (
                        <>
                            <div className={styles.formGroup}>
                                <label>Número de carnet:</label>
                                <input
                                    type="text"
                                    placeholder="Ej: LS-1234"
                                    value={numeroCarnet}
                                    onChange={(e) => setNumeroCarnet(e.target.value)}
                                    style={errores.numero_carnet ? estiloError : {}}
                                />
                                {errores.numero_carnet && (
                                    <span style={estiloMensaje}>{errores.numero_carnet}</span>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label>Autoridad emisora:</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Municipalidad de Trelew"
                                    value={autoridadEmisora}
                                    onChange={(e) => setAutoridadEmisora(e.target.value)}
                                    style={errores.autoridad_emisora ? estiloError : {}}
                                />
                                {errores.autoridad_emisora && (
                                    <span style={estiloMensaje}>{errores.autoridad_emisora}</span>
                                )}
                            </div>
                        </>
                    )}

                    {tipo === 'capacitacion' && (
                        <>
                            <div className={styles.formGroup}>
                                <label>Título de la capacitación:</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Manipulación segura de alimentos"
                                    value={titulo}
                                    onChange={(e) => setTitulo(e.target.value)}
                                    style={errores.titulo ? estiloError : {}}
                                />
                                {errores.titulo && <span style={estiloMensaje}>{errores.titulo}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label>Observaciones (opcional):</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Curso anual obligatorio"
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {tipo === 'certificado_aptitud_fisica' && (
                        <>
                            <div className={styles.formGroup}>
                                <label>Nombre del médico:</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Ana Ruiz"
                                    value={nombreMedico}
                                    onChange={(e) => setNombreMedico(e.target.value)}
                                    style={errores.nombre_medico ? estiloError : {}}
                                />
                                {errores.nombre_medico && (
                                    <span style={estiloMensaje}>{errores.nombre_medico}</span>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label>Matrícula:</label>
                                <input
                                    type="text"
                                    placeholder="Ej: MP-4821"
                                    value={matricula}
                                    onChange={(e) => setMatricula(e.target.value)}
                                    style={errores.matricula ? estiloError : {}}
                                />
                                {errores.matricula && (
                                    <span style={estiloMensaje}>{errores.matricula}</span>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                    <Boton type="submit" variant="guardar" disabled={guardando}>
                        {guardando ? 'Guardando...' : editando ? 'Actualizar Cambios' : 'Guardar'}
                    </Boton>
                    <Link to={`/empleados/${empleadoId}/documentacion`}>
                        <Boton variant="volver">Cancelar</Boton>
                    </Link>
                </div>
            </form>
        </div>
    );
}
