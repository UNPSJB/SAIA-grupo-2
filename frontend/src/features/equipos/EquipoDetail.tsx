import { useState, useEffect } from "react";
import { Link, useParams,useNavigate } from 'react-router-dom';
import type { Equipo } from '../../types/equipos';
import { getEquipoById } from '../../services/equiposServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function EquipoDetail() {
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

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Detalle del Equipo</h2>
            {equipo ? (
                <div className={styles.tarjetaEstatica} style={{ maxWidth: '600px', width: '100%' }}>
                    <p><strong>Nombre:</strong> {equipo.nombre}</p>
                    <p><strong>Estado:</strong> {equipo.activo ? 'Operativo' : 'Fuera de Servicio'}</p>
                    <p><strong>Categoría:</strong> {equipo.tipo.nombre}</p>
                    <p><strong>Ubicación / Sector:</strong> {equipo.sector?.nombre}</p>
                    
                    <div className={styles.bloqueDetalle}>
                        <Link to="/equipos">
                            <Boton variant="volver" onClick={() => navigate(-1)}>Volver a la lista</Boton>
                        </Link>
                    </div>
                </div>
            ) : (
                <p>Equipo no encontrado</p>
            )}
        </div>
    );
}