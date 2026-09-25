import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { Empleado } from '../../types/empleados';
import { getEmpleadoById, deleteEmpleado } from '../../services/empleadosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function EmpleadoDelete() {
    const [empleado, setEmpleado] = useState<Empleado | null>(null);
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
                navigate('/empleados');
            } else {
                alert('Hubo un error al intentar dar de baja el registro.');
            }
        } catch (error) {
            console.error('Error de red:', error);
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>¿Desea dar de baja este empleado?</h2>
            {empleado ? (
                <div className={styles.tarjetaEstatica} style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
                    <h3 style={{ color: 'var(--text-h)' }}>{empleado.nombre} {empleado.apellido}</h3>
                    <p><strong>Legajo:</strong> {empleado.legajo}</p>
                    <p><strong>DNI / CUIL:</strong> {empleado.dni}</p>
                    
                    <div style={{ margin: '15px 0' }}>
                        <p style={{ marginBottom: '8px' }}><strong>Capacidad/es:</strong></p>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {empleado.capacidades && empleado.capacidades.length > 0 ? (
                                empleado.capacidades.map(cap => (
                                    <span 
                                        key={cap.id} 
                                        className={`${styles.badge} ${cap.nombre.toLowerCase() === 'administrador' ? styles.badgeAdmin : ''}`}
                                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                    >
                                        {cap.nombre}
                                    </span>
                                ))
                            ) : (
                                <span className={styles.badge} style={{ backgroundColor: 'var(--border)', color: 'var(--text)' }}>
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
                        <Boton variant="eliminar" onClick={handleDelete}>
                            Confirmar Baja
                        </Boton>
                    </div>
                </div>
            ) : (
                <p>Empleado no encontrado</p>
            )}
        </div>
    );
}