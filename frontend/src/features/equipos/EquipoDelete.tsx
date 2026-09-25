import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { Equipo } from '../../types/equipos';
import { getEquipoById, deleteEquipo } from '../../services/equiposServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function EquipoDelete() {
    const [equipo, setEquipo] = useState<Equipo | null>(null);
    const { id } = useParams();
    const navigate = useNavigate(); 

    useEffect(() => {
        const cargarEquipo = async () => {
            if (id) {
                try {
                    const data = await getEquipoById(id);
                    setEquipo(data);
                } catch (error) {
                    console.error("Error al cargar equipo:", error);
                }
            }
        };
        cargarEquipo();
    }, [id]);

    const handleDelete = async () => {
        if (!id) return;
        try {
            const exito = await deleteEquipo(id);
            if (exito) navigate('/equipos');
            else alert('Hubo un error al intentar eliminar el registro.');
        } catch (error) {
            console.error('Error de red:', error);
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>¿Desea dar de baja este equipo?</h2>
            {equipo ? (
                <div className={styles.tarjetaEstatica} style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
                    <h3 style={{ color: 'var(--text-h)' }}>{equipo.nombre}</h3>
                    <p>Categoría: {equipo.tipo.nombre}</p>
                    <p><strong>Ubicación / Sector:</strong> {equipo.sector?.nombre}</p>
                    
                    <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                        <Link to="/equipos">
                            <Boton variant="volver">Cancelar</Boton>
                        </Link>
                        <Boton variant="eliminar" onClick={handleDelete}>
                            Confirmar Baja
                        </Boton>
                    </div>
                </div>
            ) : (
                <p>Equipo no encontrado</p>
            )}
        </div>
    );
}