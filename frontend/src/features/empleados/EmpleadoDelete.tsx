import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { Empleado } from '../../types/empleados';
import { getEmpleadoById, deleteEmpleado } from '../../services/empleadosServices';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import styles from '../../styles/shared.module.css';

export default function EmpleadoDelete() {
    const [empleado, setEmpleado] = useState<Empleado | null>(null);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '', exito: false });
    const { id } = useParams();
    const navigate = useNavigate(); 

    useEffect(() => {
        const cargarEmpleado = async () => {
            if (id) {
                try {
                    const data = await getEmpleadoById(id);
                    setEmpleado(data);
                } catch (error) {
                    console.error("Error al cargar empleado:", error);
                }
            }
        };
        cargarEmpleado();
    }, [id]);

    const handleDelete = async () => {
        if (!id) return;

        try {
            const exito = await deleteEmpleado(id);
            if (exito) {
                setModalAlerta({
                    isOpen: true,
                    titulo: "Operación Exitosa",
                    mensaje: "El empleado ha sido eliminado permanentemente de la base de datos.",
                    exito: true
                });
            } else {
                setModalAlerta({
                    isOpen: true,
                    titulo: "Error al Eliminar",
                    mensaje: "Hubo un error al intentar eliminar físicamente el registro.",
                    exito: false
                });
            }
        } catch (error) {
            console.error('Error de red:', error);
            setModalAlerta({
                isOpen: true,
                titulo: "Error de Conexión",
                mensaje: "No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.",
                exito: false
            });
        }
    };

    const handleCerrarAlerta = () => {
        const redirigir = modalAlerta.exito;
        setModalAlerta({ ...modalAlerta, isOpen: false });
        if (redirigir) {
            navigate('/empleados');
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>{empleado?.activo ? 'Empleado Activo' : '¿Desea eliminar físicamente este empleado inactivo?'}</h2>
            {empleado ? (
                <div className={styles.tarjetaEstatica} style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
                    <h3 style={{ color: 'var(--text-h)' }}>{empleado.nombre} {empleado.apellido}</h3>
                    <p><strong>Legajo:</strong> {empleado.legajo}</p>
                    <p><strong>DNI / CUIL:</strong> {empleado.dni}</p>

                    {empleado.activo ? (
                        <p style={{ color: '#0284c7', fontWeight: '500', margin: '15px 0' }}>
                            Los empleados activos no se pueden borrar físicamente. Para dar de baja a un empleado activo, edite su perfil y desmarque la casilla "Empleado Activo".
                        </p>
                    ) : (
                        <p style={{ color: '#dc2626', fontWeight: 'bold', margin: '15px 0' }}>
                            * ATENCIÓN: Esta acción realizará un borrado físico y permanente de la base de datos.
                        </p>
                    )}

                    <div style={{ margin: '15px 0' }}>
                        <p style={{ marginBottom: '8px' }}><strong>Capacidad/es:</strong></p>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {empleado.capacidades && empleado.capacidades.length > 0 ? (
                                empleado.capacidades.map(cap => (
                                    <span 
                                        key={cap.id} 
                                        className={`${styles.badge} ${cap.nombre.toLowerCase() === 'administrador' ? styles.badgeAdmin : ''}`}
<<<<<<< HEAD
                                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
=======
>>>>>>> merge-27-09
                                    >
                                        {cap.nombre}
                                    </span>
                                ))
                            ) : (
<<<<<<< HEAD
                                <span className={styles.badge} style={{ backgroundColor: 'var(--border)', color: 'var(--text)' }}>
=======
                                <span className={styles.badge} style={{ color: 'var(--text-muted)' }}>
>>>>>>> merge-27-09
                                    Sin asignar
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                        <Link to="/empleados">
                            <Boton variant="volver">
                                Cancelar
                            </Boton>
                        </Link>
                        {!empleado.activo && (
                            <Boton variant="eliminar" onClick={handleDelete}>
                                Confirmar Borrado Físico
                            </Boton>
                        )}
                    </div>
                </div>
            ) : (
                <p>Empleado no encontrado</p>
            )}

            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={handleCerrarAlerta}
            />
        </div>
    );
}
