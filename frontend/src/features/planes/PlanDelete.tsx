import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { PlanLimpieza } from '../../types/planes'; 
import { getPlanById, deletePlan } from '../../services/planesServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function PlanDelete() {
    const [plan, setPlan] = useState<PlanLimpieza | null>(null);
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (id) {
            getPlanById(id)
                .then(setPlan)
                .catch(err => console.error("Error al cargar:", err));
        }
    }, [id]);

    const handleDelete = async () => {
        if (!id) return;
        try {
            const exito = await deletePlan(id);
            if (exito) {
                navigate('/planes');
            } else {
                alert('No se pudo eliminar el plan. Comprueba las dependencias.');
            }
        } catch (error) {
            console.error('Error de red:', error);
            alert('Error en el servidor al intentar eliminar.');
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>¿Desea eliminar este plan de limpieza?</h2>
            {plan ? (
                <div className={styles.tarjetaEstatica} style={{ maxWidth: '600px', width: '100%', textAlign: 'center', margin: '0 auto' }}>
                    <h3 style={{ color: 'var(--text-h)', marginBottom: '15px' }}>{plan.titulo}</h3>
                    <p><strong>Sector Asignado:</strong> {plan.sector?.nombre}</p>
                    <p><strong>Fecha de Inicio:</strong> {plan.fecha_inicio}</p>
                    <p><strong>Equipos Involucrados:</strong> {plan.equipos?.length || 0}</p>
                    
                    <div className={styles.filaBotones} style={{ marginTop: '30px' }}>
                        <Link to="/planes">
                            <Boton variant="volver">Cancelar</Boton>
                        </Link>
                        <Boton variant="eliminar" onClick={handleDelete}>
                            Confirmar Baja
                        </Boton>
                    </div>
                </div>
            ) : (
                <p style={{ textAlign: 'center', marginTop: '40px' }}>Cargando información del plan...</p>
            )}
        </div>
    );
}