import { useState, useEffect } from "react";
import { Link, useParams } from 'react-router-dom';
import type { Equipo } from '../../types/equipos';
import { getEquipoById } from '../../services/equiposServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function EquipoDetail() {
    const [equipo, setEquipo] = useState<Equipo | null>(null);
    const { id } = useParams();

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
                <div>
                    <p>Nombre: {equipo.nombre}</p>
                    <p>Activo: {equipo.activo}</p>
                    <p>Tipo: {equipo.tipo}</p>
                    <p>Ubicacion: {equipo.ubicacion}</p>
                    

                    <div className={styles.bloqueDetalle}>
                        <Link to="/equipos">
                            <Boton variant="editar">Volver a la lista</Boton>
                        </Link>
                    </div>
                </div>
            ) : (
                <p>Equipo no encontrado</p>
            )}
        </div>
    );
}
