import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import type { DocumentoVersionadoPayload, TipoDocumentoVersionado } from '../../types/documentosVersionados';
import { crearDocumentoVersionado } from '../../services/documentosVersionadosServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import SubidorArchivo, { type ArchivoAdjunto } from '../../components/SubidorArchivo';
import ModalAlerta from '../../components/alerta';
import { ETIQUETAS_TIPO, TIPOS_DOCUMENTO_VERSIONADO } from './tipoDocumentoVersionado';
import styles from '../../styles/shared.module.css';

interface Errores {
    nombre?: string;
    archivo?: string;
    nombreArchivo?: string;
    fechaVigencia?: string;
}

interface EstadoAlerta {
    isOpen: boolean;
    titulo: string;
    mensaje: string;
    documentoCreado: boolean;
}

export default function DocumentoVersionadoForm() {
    const navigate = useNavigate();
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'admin';

    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState<TipoDocumentoVersionado>('manual_bpm');
    const [archivo, setArchivo] = useState<ArchivoAdjunto | null>(null);
    const [nombreArchivo, setNombreArchivo] = useState('');
    const [fechaVigencia, setFechaVigencia] = useState('');
    const [errores, setErrores] = useState<Errores>({});
    const [guardando, setGuardando] = useState(false);
    const [modalAlerta, setModalAlerta] = useState<EstadoAlerta>({
        isOpen: false,
        titulo: '',
        mensaje: '',
        documentoCreado: false,
    });

    const validar = (): Errores => {
        const nuevosErrores: Errores = {};
        if (nombre.trim().length < 2) {
            nuevosErrores.nombre = 'Ingresá un nombre de al menos 2 caracteres.';
        }
        if (!archivo) {
            nuevosErrores.archivo = 'Seleccioná el archivo de la versión inicial.';
        }
        if (!nombreArchivo.trim()) {
            nuevosErrores.nombreArchivo = 'Ingresá el nombre del archivo.';
        }
        if (!fechaVigencia) {
            nuevosErrores.fechaVigencia = 'Ingresá la fecha desde la que rige esta versión.';
        }
        return nuevosErrores;
    };

    const handleCambioArchivo = (nuevoArchivo: ArchivoAdjunto | null) => {
        setArchivo(nuevoArchivo);
        setNombreArchivo(nuevoArchivo?.nombre ?? '');
        if (nuevoArchivo) {
            setErrores((actuales) => ({ ...actuales, archivo: undefined, nombreArchivo: undefined }));
        }
    };

    const handleSubmit = async (evento: FormEvent<HTMLFormElement>) => {
        evento.preventDefault();
        const nuevosErrores = validar();
        setErrores(nuevosErrores);
        if (Object.keys(nuevosErrores).length > 0) return;
        if (!archivo) return;
        if (!usuario?.id) {
            setModalAlerta({
                isOpen: true,
                titulo: 'No se pudo registrar',
                mensaje: 'No se pudo identificar al usuario que registra el documento. Volvé a iniciar sesión.',
                documentoCreado: false,
            });
            return;
        }

        const datos: DocumentoVersionadoPayload = {
            nombre: nombre.trim(),
            tipo,
            version_documento_url: archivo.url,
            archivo_nombre: nombreArchivo.trim(),
            subido_por_id: usuario.id,
            fecha_vigencia: fechaVigencia,
        };

        try {
            setGuardando(true);
            await crearDocumentoVersionado(datos);
            setModalAlerta({
                isOpen: true,
                titulo: 'Documento registrado',
                mensaje: 'El documento versionado y su versión inicial se crearon correctamente.',
                documentoCreado: true,
            });
        } catch (problema) {
            console.error('Error al crear el documento versionado:', problema);
            setModalAlerta({
                isOpen: true,
                titulo: 'No se pudo registrar',
                mensaje: problema instanceof Error
                    ? problema.message
                    : 'No se pudo contactar al servidor. Intentá nuevamente.',
                documentoCreado: false,
            });
        } finally {
            setGuardando(false);
        }
    };

    const cerrarAlerta = () => {
        const redirigirAlListado = modalAlerta.documentoCreado;
        setModalAlerta({ isOpen: false, titulo: '', mensaje: '', documentoCreado: false });
        if (redirigirAlListado) navigate('/documentos');
    };

    const estiloError = { borderColor: 'var(--rojo-texto)', outline: 'none' };
    const estiloMensaje = { color: 'var(--rojo-texto)', fontSize: '0.8rem', marginTop: '5px' };

    if (!esAdmin) return <Navigate to="/documentos" replace />;

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Registrar Documento Versionado</h2>
            <p style={{ marginTop: '-10px', marginBottom: '20px', color: 'var(--text-muted)' }}>
                Registrá el documento y cargá su versión inicial, que quedará vigente.
            </p>

            <form onSubmit={handleSubmit} className={styles.formularioTarjeta} style={{ maxWidth: '780px' }}>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="documento-nombre">Nombre del documento:</label>
                        <input
                            id="documento-nombre"
                            type="text"
                            value={nombre}
                            onChange={(evento) => {
                                setNombre(evento.target.value);
                                if (errores.nombre) setErrores((actuales) => ({ ...actuales, nombre: undefined }));
                            }}
                            maxLength={150}
                            placeholder="Ej: Manual de buenas prácticas"
                            aria-invalid={Boolean(errores.nombre)}
                            style={errores.nombre ? estiloError : {}}
                        />
                        {errores.nombre && <span style={estiloMensaje}>{errores.nombre}</span>}
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="documento-tipo">Tipo de documento:</label>
                        <select
                            id="documento-tipo"
                            value={tipo}
                            onChange={(evento) => setTipo(evento.target.value as TipoDocumentoVersionado)}
                        >
                            {TIPOS_DOCUMENTO_VERSIONADO.map((valor) => (
                                <option key={valor} value={valor}>
                                    {ETIQUETAS_TIPO[valor]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="documento-fecha-vigencia">Fecha de vigencia:</label>
                        <input
                            id="documento-fecha-vigencia"
                            type="date"
                            value={fechaVigencia}
                            onChange={(evento) => {
                                setFechaVigencia(evento.target.value);
                                if (errores.fechaVigencia) {
                                    setErrores((actuales) => ({ ...actuales, fechaVigencia: undefined }));
                                }
                            }}
                            aria-invalid={Boolean(errores.fechaVigencia)}
                            style={errores.fechaVigencia ? estiloError : {}}
                        />
                        {errores.fechaVigencia && <span style={estiloMensaje}>{errores.fechaVigencia}</span>}
                    </div>

                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label>Archivo de la versión inicial:</label>
                        <SubidorArchivo
                            archivo={archivo}
                            onCambio={handleCambioArchivo}
                            textoAyuda="Seleccioná el documento inicial en formato PDF o imagen, hasta 25 MB."
                            altoVistaPrevia="52vh"
                        />
                        {errores.archivo && <span style={estiloMensaje}>{errores.archivo}</span>}
                    </div>

                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="documento-nombre-archivo">Nombre del archivo:</label>
                        <input
                            id="documento-nombre-archivo"
                            type="text"
                            value={nombreArchivo}
                            onChange={(evento) => {
                                setNombreArchivo(evento.target.value);
                                if (errores.nombreArchivo) {
                                    setErrores((actuales) => ({ ...actuales, nombreArchivo: undefined }));
                                }
                            }}
                            maxLength={255}
                            placeholder="Se completa con el nombre del archivo seleccionado"
                            aria-invalid={Boolean(errores.nombreArchivo)}
                            style={errores.nombreArchivo ? estiloError : {}}
                        />
                        {errores.nombreArchivo && <span style={estiloMensaje}>{errores.nombreArchivo}</span>}
                    </div>
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                    <Boton type="submit" variant="guardar" disabled={guardando}>
                        {guardando ? 'Registrando...' : 'Registrar Documento'}
                    </Boton>
                    <Link to="/documentos">
                        <Boton variant="eliminar" disabled={guardando}>Cancelar</Boton>
                    </Link>
                </div>
            </form>

            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={cerrarAlerta}
            />
        </div>
    );
}
