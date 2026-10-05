import { useState, useEffect } from "react";
import { Link, useParams } from 'react-router-dom';
import type { Equipo } from '../../types/equipos';
import { getEquipoById } from '../../services/equiposServices';
import { COLOR_ESTADO, ETIQUETA_ESTADO, textoMantenimiento } from './estadoMantenimiento';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function EquipoDetail() {
    const [equipo, setEquipo] = useState<Equipo | null>(null);
    const { id } = useParams();

    const cargarEquipo = async()=>{
        if (!id) return;
        try{
            const data = await getEquipoById(id);
            setEquipo(data);
        } catch (error){
            console.error("Error al cargar el equipo:", error);
        }
    };

    useEffect(() => {
        cargarEquipo();
    }, [id]);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Detalle del Equipo</h2>
            {equipo ? (
                <div className={styles.tarjetaEstatica} style={{ maxWidth: '600px', width: '100%' }}>
                    <p><strong>Nombre:</strong> {equipo.nombre}</p>
                    <p><strong>Categoría:</strong> {equipo.tipo.nombre}</p>
                    <p><strong>Ubicación / Sector:</strong> {equipo.sector?.nombre}</p>
                    <p><strong>Activo en Sistema:</strong> {equipo.activo ? 'Sí' : 'No'}</p>
                    <p><strong>Condición Física (Estado):</strong> {equipo.estado === 'bueno' ? 'Bueno (Operativo)' : 'Dañado'}</p>
                    
                    <p><strong>Mantenimiento:</strong>{' '}
                        <span
                            style={{
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                color: COLOR_ESTADO[equipo.estado_mantenimiento]
                            }}
                        >
                            {ETIQUETA_ESTADO[equipo.estado_mantenimiento]}
                        </span>
                    </p>

                    <p><strong>Frecuencia de mantenimiento:</strong>{' '}
                        {equipo.frecuencia_mantenimiento_dias !== null
                            ? `Cada ${equipo.frecuencia_mantenimiento_dias} días`
                            : 'No definida'}
                    </p>

                    <p><strong>Próximo mantenimiento:</strong>{' '}
                        {equipo.fecha_proximo_mantenimiento ?? 'No aplica'}
                        {equipo.fecha_proximo_mantenimiento && ` (${textoMantenimiento(equipo)})`}
                    </p>
                    
                    <p><strong>Último mantenimiento:</strong> {equipo.fecha_ultimo_mantenimiento}</p>
                    <div className={styles.bloqueDetalle}>
                        <Link to="/equipos">
                            <Boton variant="volver">Volver a la lista</Boton>
                        </Link>
                    </div>
                </div>
            ) : (
                <p>Equipo no encontrado</p>
            )}
        </div>
    );
}