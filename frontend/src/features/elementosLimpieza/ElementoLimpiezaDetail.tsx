import { useState, useEffect } from "react";
import { Link, useParams } from 'react-router-dom';
import type { ElementoLimpieza } from '../../types/elementosLimpieza';
import { getElementoLimpiezaById } from '../../services/elementosLimpiezaServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function ElementoLimpiezaDetail() {
    const [elemento, setElemento] = useState<ElementoLimpieza | null>(null);
    const { id } = useParams();

    useEffect(() => {
        const cargarElemento = async () => {
            if (id) {
                try {
                    const data = await getElementoLimpiezaById(id);
                    setElemento(data);
                } catch (error) {
                    console.error("Error al cargar el elemento de limpieza:", error);
                }
            }
        };
        cargarElemento();
    }, [id]);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Detalle del Elemento de Limpieza</h2>
            {elemento ? (
                <div className={styles.tarjetaEstatica} style={{ maxWidth: '600px', width: '100%' }}>
                    <p><strong>Nombre:</strong> {elemento.nombre}</p>
                    <p>
                        <strong>Frecuencia de recambio:</strong>{' '}
                        {elemento.frecuencia_recambio_dias !== null
                            ? `Cada ${elemento.frecuencia_recambio_dias} días`
                            : 'No definida'}
                    </p>

                    <div className={styles.bloqueDetalle} style={{ textAlign: 'center', marginTop: '20px' }}>
                        <Link to="/elementosLimpieza">
                            <Boton variant="volver">Volver a la lista</Boton>
                        </Link>
                    </div>
                </div>
            ) : (
                <p>Elemento de limpieza no encontrado</p>
            )}
        </div>
    );
}
