import { useState, useEffect } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import type { Empleado } from '../../types/empleados';
import { getEmpleadoById } from '../../services/empleadosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function EmpleadoDetail() {
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

    return (
        <div className={styles.contenedorPrincipal}>
            <h2 style={{ marginBottom: '20px' }}>Detalle del Empleado</h2>
            
            {empleado ? (
                <div className={styles.tarjetaEstatica} style={{ maxWidth: '650px', margin: '0 auto', textAlign: 'left', padding: '30px' }}>
                    <p style={{ marginBottom: '18px', fontSize: '1.05rem', color: 'var(--text-h)' }}>
                        <strong>Legajo:</strong> {empleado.legajo}
                    </p>
                    
                    <p style={{ marginBottom: '18px', fontSize: '1.05rem', color: 'var(--text-h)' }}>
                        <strong>Nombre completo:</strong> {empleado.nombre} {empleado.apellido}
                    </p>
                    
                    <p style={{ marginBottom: '18px', fontSize: '1.05rem', color: 'var(--text-h)' }}>
                        <strong>Estado:</strong> {empleado.activo ? <span style={{ color: '#16a34a' }}>Activo</span> : <span style={{ color: '#dc2626' }}>Inactivo</span>}
                    </p>
                    
                    <p style={{ marginBottom: '18px', fontSize: '1.05rem', color: 'var(--text-h)' }}>
                        <strong>Sector/es asignado/s:</strong> {empleado.sectores && empleado.sectores.length > 0 
                            ? empleado.sectores.map(s => s.nombre).join(', ') 
                            : <span style={{ color: 'var(--text-muted)' }}>Ninguno asignado</span>}
                    </p>

                    <p style={{ marginBottom: '35px', fontSize: '1.05rem', color: 'var(--text-h)' }}>
                        <strong>Roles y Capacidades:</strong> {empleado.capacidades && empleado.capacidades.length > 0 
                            ? empleado.capacidades.map(c => c.nombre).join(', ') 
                            : <span style={{ color: 'var(--text-muted)' }}>Ninguna asignada</span>}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <Boton variant="volver" onClick={() => navigate(-1)}>
                            Volver atrás
                        </Boton>
                    </div>
                </div>
            ) : (
                <p style={{ color: 'var(--text-muted)', marginTop: '20px' }}>Cargando información del empleado...</p>
            )}
        </div>
    );
}