import { useState, useEffect } from "react";
import { Link, useParams } from 'react-router-dom';
import type { Insumo } from '../../types/insumos';
import { getInsumoById } from '../../services/insumosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function InsumoDetail() {
    const [insumo, setInsumo] = useState<Insumo | null>(null);
    const { id } = useParams();

    useEffect(() => {
        const cargarInsumo = async () => {
            if (id) {
                try {
                    const data = await getInsumoById(id);
                    setInsumo(data);
                } catch (error) {
                    console.error("Error al cargar Insumo:", error);
                }
            }
        };
        
        cargarInsumo();
    }, [id]);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Detalle del Insumo</h2>
            {insumo ? (
                <div>
                    <p>Nombre: {insumo.nombre}</p>
                    <p>Unidad de Medida: {insumo.unidad_medida.nombre}</p>
                    {/* <p>
                        Capacidades: {empleado.capacidades && empleado.capacidades.length > 0 
                            ? empleado.capacidades.map(c => c.nombre).join(', ') 
                            : 'Ninguna asignada'}
                    </p> */}

                    <div className={styles.bloqueDetalle}>
                        <Link to="/insumos">
                            <Boton variant="editar">Volver a la lista</Boton>
                        </Link>
                    </div>
                </div>
            ) : (
                <p>Insumo no encontrado</p>
            )}
        </div>
    );
}
