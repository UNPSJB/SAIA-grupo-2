import { useEffect, useState } from 'react';
import { getConfiguracionEmpresa, updateConfiguracionEmpresa } from '../../services/configuracionEmpresaServices';
import type { ConfiguracionEmpresa as ConfiguracionEmpresaType } from '../../types/configuracionEmpresa';
import styles from '../../styles/shared.module.css';
import EncabezadoPagina from '../../components/EncabezadoPagina';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';

export default function ConfiguracionEmpresa() {
    const [nombre, setNombre] = useState('');
    const [cuit, setCuit] = useState('');
    const [domicilio, setDomicilio] = useState('');
    const [telefono, setTelefono] = useState('');
    const [email, setEmail] = useState('');
    const [logoBase64, setLogoBase64] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const data: ConfiguracionEmpresaType = await getConfiguracionEmpresa();
            setNombre(data.nombre_empresa);
            setCuit(data.cuit);
            setDomicilio(data.domicilio);
            setTelefono(data.telefono);
            setEmail(data.email);
            setLogoBase64(data.logo_base64);
        } catch (err) {
            console.error("Error al cargar datos de la PYME:", err);
            setModalAlerta({
                isOpen: true,
                titulo: "Error",
                mensaje: "No se pudieron obtener los datos institucionales de la empresa."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setModalAlerta({
                isOpen: true,
                titulo: "Archivo muy pesado",
                mensaje: "El logo no debe superar los 2MB de tamaño."
            });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setGuardando(true);
            await updateConfiguracionEmpresa({
                nombre_empresa: nombre,
                cuit,
                domicilio,
                telefono,
                email,
                logo_base64: logoBase64
            });
            setModalAlerta({
                isOpen: true,
                titulo: "Operación Exitosa",
                mensaje: "Los datos de la empresa y la cabecera de reportes PDF han sido actualizados correctamente."
            });
        } catch (err) {
            console.error("Error al guardar datos de la PYME:", err);
            setModalAlerta({
                isOpen: true,
                titulo: "Error",
                mensaje: "Ocurrió un error al guardar los datos de la empresa."
            });
        } finally {
            setGuardando(false);
        }
    };

    if (loading) {
        return <div className={styles.contenedorPrincipal}>Cargando datos de la empresa...</div>;
    }

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Datos Institucionales de la PYME"
                descripcion="Configura el nombre, CUIT, domicilio, contacto y logo de la empresa. Estos datos aparecerán en las cabeceras de todos los reportes y documentos exportados a PDF."
                ancho="800px"
            />

            <form onSubmit={handleGuardar} style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
                <div className={styles.tarjeta} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-h)' }}>
                                Logo Institucional:
                            </span>
                            <div style={{
                                width: '120px',
                                height: '120px',
                                border: '1px dashed var(--border-color)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#fff',
                                overflow: 'hidden',
                                margin: '0 auto 0.5rem auto'
                            }}>
                                {logoBase64 ? (
                                    <img src={logoBase64} alt="Logo PYME" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Sin Logo</span>
                                )}
                            </div>
                            <label className={styles.botonFiltro} style={{ cursor: 'pointer', display: 'inline-block', fontSize: '0.8rem' }}>
                                <i className="bi bi-upload" style={{ marginRight: '0.35rem' }}></i> Subir Logo
                                <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                            </label>
                            {logoBase64 && (
                                <button
                                    type="button"
                                    onClick={() => setLogoBase64(null)}
                                    style={{ display: 'block', margin: '0.35rem auto 0 auto', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer' }}
                                >
                                    Quitar Logo
                                </button>
                            )}
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '280px' }}>
                            <div>
                                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>Nombre Comercial / Razón Social:</label>
                                <input
                                    type="text"
                                    required
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    className={styles.input}
                                    style={{ width: '100%', marginTop: '0.25rem' }}
                                    placeholder="Ej. SAIA - Alimentos S.A."
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>CUIT / Identificación Fiscal:</label>
                                <input
                                    type="text"
                                    required
                                    value={cuit}
                                    onChange={(e) => setCuit(e.target.value)}
                                    className={styles.input}
                                    style={{ width: '100%', marginTop: '0.25rem' }}
                                    placeholder="Ej. 30-71122334-9"
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                        <div>
                            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>Domicilio / Planta:</label>
                            <input
                                type="text"
                                required
                                value={domicilio}
                                onChange={(e) => setDomicilio(e.target.value)}
                                className={styles.input}
                                style={{ width: '100%', marginTop: '0.25rem' }}
                                placeholder="Ej. Ruta 3 Km 1400, Trelew"
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>Teléfono de Contacto:</label>
                            <input
                                type="text"
                                required
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                className={styles.input}
                                style={{ width: '100%', marginTop: '0.25rem' }}
                                placeholder="Ej. 0280 442-1234"
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>Correo Electrónico:</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={styles.input}
                                style={{ width: '100%', marginTop: '0.25rem' }}
                                placeholder="Ej. contacto@saia.com"
                            />
                        </div>
                    </div>

                    <div className={styles.filaBotones} style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <Boton type="submit" variant="guardar" disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Guardar Datos'}
                        </Boton>
                    </div>
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
